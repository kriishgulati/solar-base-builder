import { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, TransformControls, Html } from '@react-three/drei';
import ShadowCoverageCalculator from '@/lib/ShadowCoverageCalculator';
import SunControls from './SunControls';
import * as THREE from 'three';
import { Shape, Obstacle } from '@/stores/shapeStore';
import { useShapeStore } from '@/stores/shapeStore';
import SunCalc from "suncalc";


interface ThreeSceneProps {
  shapes: Shape[];
  obstacles: Obstacle[];
  buildingHeight: number;
}

const Building3D = ({ shapes, height }: { shapes: Shape[], height: number }) => {
  return (
    <group>
      {shapes.map((shape) => {
        let geometry: THREE.BufferGeometry;

        if (shape.type === 'circle') {
          const radius = shape.dimensions.radius || 1;
          geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
        } else if (shape.type === 'triangle') {
          const length = shape.dimensions.length || 1;
          const triHeight = (length * Math.sqrt(3)) / 2;
          const triShape = new THREE.Shape();
          triShape.moveTo(0, -triHeight / 2);
          triShape.lineTo(-length / 2, triHeight / 2);
          triShape.lineTo(length / 2, triHeight / 2);
          triShape.lineTo(0, -triHeight / 2);
          geometry = new THREE.ExtrudeGeometry(triShape, { depth: height, bevelEnabled: false });
          geometry.rotateX(Math.PI / 2);
          geometry.translate(0, height / 2, 0);
        } else {
          const length = shape.dimensions.length || 1;
          const width = shape.type === 'square' ? length : (shape.dimensions.width || 1);
          geometry = new THREE.BoxGeometry(length, height, width);
        }

        const yPosition = height / 2;
        const yRotation = ((shape.rotation || 0) * (Math.PI / 180)) * (shape.type === 'triangle' ? -1 : 1);

        return (
          <group
            key={shape.id}
            position={[shape.position.x, yPosition, shape.position.y]}
            rotation={[0, yRotation, 0]}
          >
            <mesh geometry={geometry} castShadow receiveShadow>
              <meshStandardMaterial 
                color="hsl(142, 71%, 55%)"
                side={THREE.DoubleSide}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

interface Obstacles3DProps {
  obstacles: Obstacle[];
  baseHeight: number;
  shapes: Shape[];
}

const Obstacles3D = ({ obstacles, baseHeight, shapes, onHoverUpdate, onAggregateUpdate, invalidateKey }: Obstacles3DProps & { onHoverUpdate?: (v: { visible: boolean; x?: number; y?: number; text?: string }) => void; onAggregateUpdate?: (avg: number) => void; invalidateKey?: string }) => {
  const { gl, scene, camera } = useThree();
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; target?: THREE.Object3D }>(() => ({ visible: false, text: '' }));
  const calcRef = useMemo(() => ({ current: null as null | ShadowCoverageCalculator }), []);
  const panelsRef = useMemo(() => ({ list: [] as THREE.Mesh[] }), []);
  const percentByIdRef = useMemo(() => ({ map: new Map<string, number>() }), []);
  useEffect(() => {
    const dirLight = scene.children.find((o) => (o as any).isDirectionalLight) as THREE.DirectionalLight | undefined;
    if (!dirLight) return;
    if (!calcRef.current) {
      // Lower resolution for smoother background computations; hover remains accurate due to float comparisons
      calcRef.current = new ShadowCoverageCalculator(gl as any, scene as any, dirLight, { rtSize: 1024, eps: 1e-4, cacheTTL: 2000, debug: false });
    }
    return () => { /* keep calculator for lifespan of canvas */ };
  }, [gl, scene]);

  // Collect panels whenever obstacles change
  useEffect(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if ((m as any).isMesh && m.userData && m.userData.type === 'solarPanel') list.push(m);
    });
    panelsRef.list = list;
  }, [scene, obstacles]);

  // Invalidate cached coverage when sun/time key changes
  useEffect(() => {
    if (calcRef.current) {
      calcRef.current.invalidate(null);
    }
    // Mark stored panel values as stale (optional)
    panelsRef.list.forEach((p) => { (p.userData as any).shadowPercent = undefined; });
    // Background sweep: compute one panel ~every 80ms, pause if interacting
    let cancelled = false;
    let idx = 0;
    const panels = [...panelsRef.list];
    const step = async () => {
      if (cancelled || !calcRef.current || panels.length === 0) return;
      const m = panels[idx % panels.length];
      idx++;
      try {
        const res = await calcRef.current.computeCoverage(m);
        (m.userData as any).shadowPercent = res.percent;
      } catch {
        (m.userData as any).shadowPercent = 0;
      }
      recalcAggregate();
      if (!cancelled) setTimeout(step, 80);
    };
    setTimeout(step, 80);
    return () => { cancelled = true; };
  }, [invalidateKey]);

  // Lightweight aggregate recompute using only stored/cached values, skipping unknowns
  const recalcAggregate = () => {
    const panels = panelsRef.list;
    if (panels.length === 0) { onAggregateUpdate && onAggregateUpdate(0); return; }
    let sum = 0;
    let count = 0;
    for (const m of panels) {
      const id = (m.userData && (m.userData as any).id) as string | undefined;
      let v: number | undefined = (m.userData as any).shadowPercent;
      if (typeof v !== 'number' || !isFinite(v)) {
        const cached = calcRef.current?.getCachedCoverage(m);
        if (cached) v = cached.percent as number;
        else if (id) v = percentByIdRef.map.get(id);
      }
      if (typeof v === 'number' && isFinite(v)) { sum += v; count++; }
    }
    if (count > 0) {
      const avg = sum / count;
      onAggregateUpdate && onAggregateUpdate(avg);
    }
  };

  // Recompute aggregate when obstacles list changes
  useEffect(() => { recalcAggregate(); }, [obstacles]);

  // Pointer hover handling
  useEffect(() => {
    const dom = (gl as any).domElement as HTMLCanvasElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let raf = 0;

    const onMove = async (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const hit = intersects.find((i) => (i.object as any).isMesh);
      if (!hit) { setTooltip((t) => ({ ...t, visible: false })); onHoverUpdate && onHoverUpdate({ visible: false }); return; }
      let m = hit.object as THREE.Mesh;
      // identify solar panel by dimensions or userData
      if (!(m.userData && m.userData.type === 'solarPanel')) {
        let p: THREE.Object3D | null = m;
        while (p && (!p.userData || p.userData.type !== 'solarPanel')) p = p.parent;
        if (p && (p as any).isMesh) m = p as any; else { setTooltip((t) => ({ ...t, visible: false })); return; }
      }

      if (!calcRef.current) return;
      const cached = calcRef.current.getCachedCoverage(m);
      if (cached) {
        (m.userData as any).shadowPercent = cached.percent;
        const id = (m.userData && (m.userData as any).id) as string | undefined;
        if (id) percentByIdRef.map.set(id, cached.percent as number);
        setTooltip({ visible: true, text: `Shadow Coverage: ${cached.percent}%`, target: m });
        onHoverUpdate && onHoverUpdate({ visible: true, x: e.clientX, y: e.clientY, text: `Shadow Coverage: ${cached.percent}%` });
        recalcAggregate();
        return;
      }
      setTooltip({ visible: true, text: 'Calculating…', target: m }); onHoverUpdate && onHoverUpdate({ visible: true, x: e.clientX, y: e.clientY, text: 'Calculating…' });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(async () => {
        try {
          const res = await calcRef.current!.computeCoverage(m);
          (m.userData as any).shadowPercent = res.percent;
          const id = (m.userData && (m.userData as any).id) as string | undefined;
          if (id) percentByIdRef.map.set(id, res.percent as number);
          setTooltip({ visible: true, text: `Shadow Coverage: ${res.percent}%`, target: m });
          onHoverUpdate && onHoverUpdate({ visible: true, x: e.clientX, y: e.clientY, text: `Shadow Coverage: ${res.percent}%` });
          recalcAggregate();
        }
        catch { setTooltip({ visible: true, text: 'Unavailable', target: m }); onHoverUpdate && onHoverUpdate({ visible: true, x: e.clientX, y: e.clientY, text: 'Unavailable' }); }
      });
    };
    const onLeave = () => { setTooltip((t) => ({ ...t, visible: false })); onHoverUpdate && onHoverUpdate({ visible: false }); };
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerleave', onLeave);
    return () => { dom.removeEventListener('pointermove', onMove); dom.removeEventListener('pointerleave', onLeave); cancelAnimationFrame(raf); };
  }, [gl, scene, camera]);
  const getFootprint = (o: Obstacle) => {
    if (o.type === 'circle') {
      const d = (o.dimensions.radius || 1) * 2;
      return { length: d, width: d };
    }
    if (o.type === 'triangle') {
      const length = o.dimensions.length || 1;
      const triHeight = (length * Math.sqrt(3)) / 2;
      return { length, width: triHeight };
    }
    if (o.type === 'square') {
      const l = o.dimensions.length || 1;
      return { length: l, width: l };
    }
    if (o.type === 'solarPanel') {
      return { length: 2, width: 1 };
    }
    return { length: o.dimensions.length || 1, width: o.dimensions.width || 1 };
  };

  const aabbOverlap = (a: Obstacle, b: Obstacle) => {
    const af = getFootprint(a);
    const bf = getFootprint(b);
    const ax1 = a.position.x - af.length / 2;
    const ax2 = a.position.x + af.length / 2;
    const az1 = a.position.y - af.width / 2;
    const az2 = a.position.y + af.width / 2;

    const bx1 = b.position.x - bf.length / 2;
    const bx2 = b.position.x + bf.length / 2;
    const bz1 = b.position.y - bf.width / 2;
    const bz2 = b.position.y + bf.width / 2;

    const overlapX = ax1 < bx2 && ax2 > bx1;
    const overlapZ = az1 < bz2 && az2 > bz1;
    return overlapX && overlapZ;
  };

  // Helper: get footprint for shapes (same axis-aligned approximation)
  const getShapeFootprint = (s: Shape) => {
    if (s.type === 'circle') {
      const d = (s.dimensions.radius || 1) * 2;
      return { length: d, width: d };
    }
    if (s.type === 'triangle') {
      const length = s.dimensions.length || 1;
      const triHeight = (length * Math.sqrt(3)) / 2;
      return { length, width: triHeight };
    }
    if (s.type === 'square') {
      const l = s.dimensions.length || 1;
      return { length: l, width: l };
    }
    return { length: s.dimensions.length || 1, width: s.dimensions.width || 1 };
  };

  // Check if obstacle overlaps any shape (axis-aligned bounding box test)
  const overlapsAnyShape = (o: Obstacle) => {
    for (const s of shapes) {
      const of = getFootprint(o);
      const sf = getShapeFootprint(s);

      const ox1 = o.position.x - of.length / 2;
      const ox2 = o.position.x + of.length / 2;
      const oz1 = o.position.y - of.width / 2;
      const oz2 = o.position.y + of.width / 2;

      const sx1 = s.position.x - sf.length / 2;
      const sx2 = s.position.x + sf.length / 2;
      const sz1 = s.position.y - sf.width / 2;
      const sz2 = s.position.y + sf.width / 2;

      const overlapX = ox1 < sx2 && ox2 > sx1;
      const overlapZ = oz1 < sz2 && oz2 > sz1;

      if (overlapX && overlapZ) return true;
    }
    return false;
  };

  // Compute stacking: bottomZ (meters) per obstacle using prior placements
  const placements: { id: string; bottomZ: number }[] = [];
  obstacles.forEach((o, idx) => {
    // Determine whether this obstacle overlaps any building shape.
    // If it does, its bottom sits on the building top (baseHeight), otherwise on ground (0).
    const sitsOnBase = overlapsAnyShape(o);

    // Non-solarPanel obstacles never stack with obstacles; just sit on base or ground
    if (o.type !== 'solarPanel') {
      placements.push({ id: o.id, bottomZ: sitsOnBase ? baseHeight : 0 });
      return;
    }

    // Solar panels can stack atop any overlapping obstacle. Start at baseHeight or ground depending on footprint.
    let bottomZ = sitsOnBase ? baseHeight : 0;
    for (let i = 0; i < idx; i++) {
      const prev = obstacles[i];
      if (aabbOverlap(o, prev)) {
        const prevPlacement = placements.find(p => p.id === prev.id);
        const prevBottom = prevPlacement ? prevPlacement.bottomZ : baseHeight;
        const prevTop = prevBottom + prev.height;
        bottomZ = Math.max(bottomZ, prevTop);
      }
    }
    placements.push({ id: o.id, bottomZ });
  });

  return (
    <>
      {obstacles.map((obstacle) => {
        let geometry;

        if (obstacle.type === 'circle') {
          const radius = obstacle.dimensions.radius || 1;
          geometry = new THREE.CylinderGeometry(
            radius,
            radius,
            obstacle.height,
            32
          );
        } else if (obstacle.type === 'triangle') {
          const length = obstacle.dimensions.length || 1;
          const triHeight = (length * Math.sqrt(3)) / 2;
          
          const triShape = new THREE.Shape();
          triShape.moveTo(0, -triHeight / 2);
          triShape.lineTo(-length / 2, triHeight / 2);
          triShape.lineTo(length / 2, triHeight / 2);
          triShape.lineTo(0, -triHeight / 2);

          const extrudeSettings = {
            depth: obstacle.height,
            bevelEnabled: false
          };

          geometry = new THREE.ExtrudeGeometry(triShape, extrudeSettings);
          geometry.rotateX(Math.PI / 2);
          geometry.translate(0, obstacle.height / 2, 0);
        } else if (obstacle.type === 'solarPanel') {
          const length = 2;
          const width = 1;
          const height = obstacle.height;

          const vertices = [
            new THREE.Vector3(-length / 2, 0, -width / 2),
            new THREE.Vector3(length / 2, 0, -width / 2),
            new THREE.Vector3(length / 2, 0, width / 2),
            new THREE.Vector3(-length / 2, 0, width / 2),
            new THREE.Vector3(-length / 2, 0, -width / 2),
            new THREE.Vector3(length / 2, height, -width / 2),
            new THREE.Vector3(length / 2, height, width / 2),
            new THREE.Vector3(-length / 2, 0, width / 2),
          ];

          const indices = [
            0, 1, 2, 0, 2, 3,
            0, 1, 5, 0, 5, 4,
            3, 2, 6, 3, 6, 7,
            0, 4, 7, 0, 7, 3,
            1, 2, 6, 1, 6, 5,
            4, 5, 6, 4, 6, 7,
          ];

          const geom = new THREE.BufferGeometry();
          const positionArray = new Float32Array(vertices.flatMap(v => [v.x, v.y, v.z]));
          geom.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
          geom.setIndex(indices);
          geom.computeVertexNormals();
          geom.translate(0, -height / 2, 0);

          geometry = geom as THREE.BufferGeometry;
        } else {
          geometry = new THREE.BoxGeometry(
            obstacle.dimensions.length || 1,
            obstacle.height,
            obstacle.dimensions.width || 1
          );
        }

        const placement = placements.find(p => p.id === obstacle.id);
        const bottomZ = placement ? placement.bottomZ : baseHeight;
        const yPosition = bottomZ + (obstacle.height / 2);

        return (
          <group
            key={obstacle.id}
            position={[obstacle.position.x, yPosition, obstacle.position.y]}
            rotation={[0, (obstacle.type === 'triangle' ? -obstacle.rotation : obstacle.rotation) * (Math.PI / 180), 0]}
          >
            <mesh geometry={geometry} castShadow receiveShadow userData={{ type: obstacle.type === 'solarPanel' ? 'solarPanel' : 'obstacle', id: obstacle.id }}>
              <meshStandardMaterial 
                color={obstacle.type === 'solarPanel' ? '#2c5596' : 'hsl(0, 84%, 60%)'}
                transparent={false}
                opacity={1}
                depthWrite={true}
                depthTest={true}
                side={obstacle.type === 'solarPanel' ? THREE.DoubleSide : THREE.FrontSide}
                roughness={0.5}
                metalness={0.1}
                polygonOffset={obstacle.type === 'solarPanel'}
                polygonOffsetFactor={obstacle.type === 'solarPanel' ? 1 : 0}
                polygonOffsetUnits={obstacle.type === 'solarPanel' ? 1 : 0}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

// -- FIX: Move SunLight OUTSIDE the Canvas return and use it as a JSX element --

const SunLight = ({ latitude, longitude, date, radius = 60, manualPosition }: { latitude: number; longitude: number; date: Date; radius?: number; manualPosition?: [number, number, number] }) => {
  const [sunPos, setSunPos] = useState<[number, number, number]>([10, 10, 5]);

  useEffect(() => {
    if (manualPosition) {
      setSunPos(manualPosition);
      return;
    }
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const altitude = pos.altitude;
    const azimuth = pos.azimuth;

    const x = radius * Math.cos(altitude) * Math.sin(azimuth);
    const y = radius * Math.sin(altitude);
    const z = radius * Math.cos(altitude) * Math.cos(azimuth);
    setSunPos([x, y, z]);
  }, [latitude, longitude, date, radius, manualPosition]);

  return (
    <directionalLight
      position={sunPos}
      intensity={1}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0001}
      shadow-normalBias={0.02}
    />
  );
};

export const ThreeScene = ({ shapes, obstacles, buildingHeight }: ThreeSceneProps) => {
  const { baseFacingAngle } = useShapeStore();
  const [latitude, setLatitude] = useState(18.5204);
  const [longitude, setLongitude] = useState(73.8567);
  const [date, setDate] = useState<Date>(() => new Date());
  const sunRadius = 60;
  const [manualSunEnabled, setManualSunEnabled] = useState(false);
  const [manualSunPos, setManualSunPos] = useState<[number, number, number] | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [aggregatePercent, setAggregatePercent] = useState<number>(0);
  const controlsRef = useRef<any>(null);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  // Track viewport size to tailor touch behavior for small screens only
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)') : null;
    const update = () => setIsSmallScreen(!!mq?.matches);
    update();
    mq?.addEventListener('change', update);
    return () => mq?.removeEventListener('change', update);
  }, []);

  // Smoothly adjust camera distance based on building height so it fits the view
  // Runs when 3D scene mounts or the buildingHeight changes
  const fitCameraToHeight = (height: number) => {
    try {
      // Only proceed if controls and a perspective camera are available
      const controls = controlsRef.current as import('three-stdlib').OrbitControls | null;
      const camera = controls?.object as THREE.PerspectiveCamera | undefined;
      if (!camera || !controls || !(camera as any).isPerspectiveCamera) return;

      // Compute desired radial distance from target to fit entire height in vertical FOV
      const fovRad = (camera.fov * Math.PI) / 180;
      const margin = 1.2; // add some headroom
      const required = (height * 0.5 * margin) / Math.tan(fovRad / 2);

      // Update target height to mid-building so it centers vertically
      const desiredTargetY = Math.max(1, height / 2);
      const target = controls.target.clone();
      target.y = desiredTargetY;

      // Current radius and direction
      const currentOffset = camera.position.clone().sub(controls.target);
      const direction = currentOffset.clone().normalize();
      const currentRadius = currentOffset.length();
      const nextRadius = Math.max(required, 5);

      // Allow zooming out far enough after the animation
      controls.maxDistance = Math.max(100, height * 3);

      // Animate radius and target.y over ~700ms
      const durationMs = 700;
      const start = performance.now();
      const startTargetY = controls.target.y;

      const animate = (t: number) => {
        const now = performance.now();
        const elapsed = now - start;
        const u = Math.min(1, elapsed / durationMs);
        // easeInOutCubic
        const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

        const radius = currentRadius + (nextRadius - currentRadius) * ease;
        const ty = startTargetY + (desiredTargetY - startTargetY) * ease;

        // Update target and camera along the same look direction
        controls.target.set(controls.target.x, ty, controls.target.z);
        const newPos = controls.target.clone().add(direction.clone().multiplyScalar(radius));
        camera.position.copy(newPos);
        camera.updateProjectionMatrix();
        controls.update();

        if (u < 1) requestAnimationFrame(animate as any);
      };
      requestAnimationFrame(animate as any);
    } catch {
      /* no-op */
    }
  };

  useEffect(() => {
    // Trigger only for sufficiently tall buildings; still handle 60m-200m+
    if (typeof buildingHeight === 'number' && buildingHeight >= 60) {
      // Delay a tick to ensure controls are mounted
      const id = setTimeout(() => fitCameraToHeight(buildingHeight), 0);
      return () => clearTimeout(id);
    }
  }, [buildingHeight]);

  // Keep minutes aligned to slider without drifting
  const [timeMinutes, setTimeMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const d = new Date(date);
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    d.setHours(hours, minutes, 0, 0);
    setDate(d);
  }, [timeMinutes]);

  // Auto progression when playing
  useEffect(() => {
    if (!playing) return;
    const stepMinutes = 5; // advance 5 minutes per tick
    const intervalMs = 200; // every 200ms
    const id = setInterval(() => {
      setTimeMinutes((m) => (m + stepMinutes + 24 * 60) % (24 * 60));
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing]);

  const modelCenter = useMemo<[number, number, number]>(() => {
    const xs: number[] = [];
    const zs: number[] = [];
    shapes.forEach(s => { xs.push(s.position.x); zs.push(s.position.y); });
    obstacles.forEach(o => { xs.push(o.position.x); zs.push(o.position.y); });
    if (xs.length === 0) return [0, 0, 0];
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    return [cx, 0, cz];
  }, [shapes, obstacles]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-200 to-sky-100">
      <Canvas
        camera={{ position: [20, 20, 20], fov: 50 }}
        shadows
      >
        {/* Sun directional light, rotated by base compass so East/West align with dial */}
        {(() => {
          // Compute raw astronomical sun vector (Z forward=N, X right=E)
          const pos = SunCalc.getPosition(date, latitude, longitude);
          // SunCalc azimuth is measured from South, positive westward.
          // Convert to bearing from North, clockwise: phi = azimuth + PI.
          const phi = pos.azimuth + Math.PI;
          const raw: [number, number, number] = [
            sunRadius * Math.cos(pos.altitude) * Math.sin(phi),
            sunRadius * Math.sin(pos.altitude),
            sunRadius * Math.cos(pos.altitude) * Math.cos(phi),
          ];
          // Rotate around Y by baseFacingAngle (degrees clockwise, 0 = North)
          const rad = (-baseFacingAngle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rx = raw[0] * cos + raw[2] * sin;
          const rz = -raw[0] * sin + raw[2] * cos;
          const rotated: [number, number, number] = [rx, raw[1], rz];
          const manual = manualSunEnabled && manualSunPos ? manualSunPos : undefined;
          const finalPos = manual ?? rotated;
          return (
            <directionalLight
              position={finalPos}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0001}
              shadow-normalBias={0.02}
            />
          );
        })()}

        {manualSunEnabled ? (
          <TransformControls
            mode="translate"
            enabled
            showX
            showY
            showZ
            onObjectChange={(e) => {
              const obj = (e as unknown as { target?: any }).target?.object as THREE.Object3D | undefined;
              if (!obj) return;
              const v = new THREE.Vector3().copy(obj.position);
              if (v.lengthSq() === 0) v.set(1, 1, 1);
              v.setLength(sunRadius);
              v.y = Math.abs(v.y);
              obj.position.copy(v);
              setManualSunEnabled(true);
              setManualSunPos([v.x, v.y, v.z]);
            }}
          >
            <mesh position={manualSunPos}>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshBasicMaterial color="#ffcc33" />
            </mesh>
          </TransformControls>
        ) : (
          <mesh position={(() => {
            const pos = SunCalc.getPosition(date, latitude, longitude);
            const phi = pos.azimuth + Math.PI; // convert from South-based to North-based
            const raw: [number, number, number] = [
              sunRadius * Math.cos(pos.altitude) * Math.sin(phi),
              sunRadius * Math.sin(pos.altitude),
              sunRadius * Math.cos(pos.altitude) * Math.cos(phi),
            ];
            const rad = (-baseFacingAngle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rx = raw[0] * cos + raw[2] * sin;
            const rz = -raw[0] * sin + raw[2] * cos;
            return [rx, Math.max(0.0001, raw[1]), rz] as [number, number, number];
          })()}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial color="#ffcc33" />
          </mesh>
        )}

        <Environment preset="city" environmentIntensity={0.2} />

        <group position={[-modelCenter[0], 0, -modelCenter[2]]}>
          <Building3D shapes={shapes} height={buildingHeight} />
          <Obstacles3D obstacles={obstacles} baseHeight={buildingHeight} shapes={shapes} onHoverUpdate={(v) => {
            const el = document.getElementById('shadow-coverage-tooltip');
            if (!el) return;
            if (!v.visible) { el.style.display = 'none'; return; }
            el.style.display = 'block';
            el.style.left = ((v.x || 0) + 12) + 'px';
            el.style.top = ((v.y || 0) + 12) + 'px';
            el.textContent = v.text || '';
          }} onAggregateUpdate={(avg) => setAggregatePercent(avg)} invalidateKey={`${date.getTime()}|${manualSunEnabled ? (manualSunPos ? `${manualSunPos[0]},${manualSunPos[1]},${manualSunPos[2]}` : 'manual') : 'auto'}`} />
        </group>

        <Grid
          infiniteGrid
          cellSize={1}
          cellThickness={0.5}
          cellColor="hsl(213, 30%, 60%)"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="hsl(213, 50%, 40%)"
          fadeDistance={50}
          fadeStrength={1}
        />

        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          // maxDistance is updated dynamically in fitCameraToHeight for tall buildings
          maxDistance={Math.max(100, buildingHeight * 3)}
          target={[0, Math.max(1, buildingHeight / 2), 0]}
          // Tailored touch controls: on small screens, require two-finger drag to rotate
          touches={isSmallScreen
            ? {
                ONE: THREE.TOUCH.PAN,
                TWO: THREE.TOUCH.DOLLY_ROTATE,
              }
            : {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN,
              }
          }
          mouseButtons={{
            LEFT: 0, // Left mouse button for rotation
            MIDDLE: 1, // Middle mouse button for zoom
            RIGHT: 2, // Right mouse button for pan
          }}
          // Improved touch sensitivity
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.8}
          // Enable pinch-to-zoom on mobile
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      <div id="shadow-coverage-tooltip" style={{ position: 'fixed', display: 'none', pointerEvents: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 6px', borderRadius: 4, fontSize: 12, zIndex: 1000 }} />

      <div style={{ position: 'fixed', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 13, zIndex: 1000 }}>
        Overall Shadow Coverage: {aggregatePercent.toFixed(2)}%
      </div>

      <SunControls
        latitude={latitude}
        longitude={longitude}
        date={date}
        timeMinutes={timeMinutes}
        manualSunEnabled={manualSunEnabled}
        onLatitudeChange={setLatitude}
        onLongitudeChange={setLongitude}
        onDateChange={setDate}
        onTimeMinutesChange={setTimeMinutes}
        onManualToggle={(enabled) => setManualSunEnabled(enabled)}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
    </div>
  );
};
