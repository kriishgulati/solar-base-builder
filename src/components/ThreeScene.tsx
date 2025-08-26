import { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, TransformControls } from '@react-three/drei';
import SunControls from './SunControls';
import * as THREE from 'three';
import { Shape, Obstacle } from '@/stores/shapeStore';
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
                transparent 
                opacity={0.9}
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

const Obstacles3D = ({ obstacles, baseHeight, shapes }: Obstacles3DProps) => {
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
            <mesh geometry={geometry} castShadow receiveShadow>
              <meshStandardMaterial 
                color={obstacle.type === 'solarPanel' ? '#2c5596' : 'hsl(0, 84%, 60%)'}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
                roughness={0.4}
                metalness={0.1}
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
  const [latitude, setLatitude] = useState(18.5204);
  const [longitude, setLongitude] = useState(73.8567);
  const [date, setDate] = useState<Date>(() => new Date());
  const sunRadius = 60;
  const [manualSunEnabled, setManualSunEnabled] = useState(false);
  const [manualSunPos, setManualSunPos] = useState<[number, number, number] | undefined>(undefined);
  const [playing, setPlaying] = useState(false);

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

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-200 to-sky-100">
      <Canvas
        camera={{ position: [20, 20, 20], fov: 50 }}
        shadows
      >
        <SunLight latitude={latitude} longitude={longitude} date={date} radius={sunRadius} manualPosition={manualSunEnabled && manualSunPos ? manualSunPos : undefined} />
        {/* Draggable sun sphere */}
        <TransformControls
          mode="translate"
          enabled={true}
          showX={true}
          showY={true}
          showZ={true}
          onObjectChange={(e) => {
            const obj = (e as unknown as { target?: any }).target?.object as THREE.Object3D | undefined;
            if (!obj) return;
            const v = new THREE.Vector3().copy(obj.position);
            if (v.lengthSq() === 0) {
              v.set(1, 1, 1);
            }
            // Constrain to sky dome at fixed radius and keep above horizon
            v.setLength(sunRadius);
            v.y = Math.abs(v.y);
            obj.position.copy(v);
            setManualSunEnabled(true);
            setManualSunPos([v.x, v.y, v.z]);
          }}
        >
          <mesh position={manualSunEnabled && manualSunPos ? manualSunPos : (() => {
            const pos = SunCalc.getPosition(date, latitude, longitude);
            const x = sunRadius * Math.cos(pos.altitude) * Math.sin(pos.azimuth);
            const y = sunRadius * Math.sin(pos.altitude);
            const z = sunRadius * Math.cos(pos.altitude) * Math.cos(pos.azimuth);
            return [x, Math.max(0.0001, y), z] as [number, number, number];
          })()}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial color="#ffcc33" />
          </mesh>
        </TransformControls>
        <Environment preset="city" />
        <Building3D shapes={shapes} height={buildingHeight} />
        <Obstacles3D 
          obstacles={obstacles} 
          baseHeight={buildingHeight}
          shapes={shapes}
        />
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
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
        />
      </Canvas>

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
