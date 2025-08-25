import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Shape, Obstacle } from '@/stores/shapeStore';

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
          // Center geometry on Y so base sits on grid when positioned at height/2
          geometry.translate(0, height / 2, 0);
        } else {
          const length = shape.dimensions.length || 1;
          const width = shape.type === 'square' ? length : (shape.dimensions.width || 1);
          geometry = new THREE.BoxGeometry(length, height, width);
        }

        const yPosition = height / 2; // base at y=0, extrude up
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

// Update the interface to include shapes
interface Obstacles3DProps {
  obstacles: Obstacle[];
  baseHeight: number;
  shapes: Shape[];  // Add shapes to props
}

// Update the component to receive shapes prop
const Obstacles3D = ({ obstacles, baseHeight, shapes }: Obstacles3DProps) => {
  // Helper: get axis-aligned footprint (meters) for overlap tests
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

  // Compute stacking: bottomZ (meters) per obstacle using prior placements
  const placements: { id: string; bottomZ: number }[] = [];
  obstacles.forEach((o, idx) => {
    // Non-solarPanel obstacles never stack; they always sit on base
    if (o.type !== 'solarPanel') {
      placements.push({ id: o.id, bottomZ: baseHeight });
      return;
    }

    // Solar panels can stack atop any overlapping obstacle
    let bottomZ = baseHeight;
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
          // Rotate to stand upright and center on Y
          geometry.rotateX(Math.PI / 2);
          geometry.translate(0, obstacle.height / 2, 0);
        } else if (obstacle.type === 'solarPanel') {
          const length = 2;
          const width = 1;
          const height = obstacle.height;

          // Build a wedge geometry: rectangle base (1x2), sloped top along +X to height
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
            // bottom
            0, 1, 2, 0, 2, 3,
            // -Z side
            0, 1, 5, 0, 5, 4,
            // +Z side
            3, 2, 6, 3, 6, 7,
            // -X side
            0, 4, 7, 0, 7, 3,
            // +X side (sloped)
            1, 2, 6, 1, 6, 5,
            // top sloped quad
            4, 5, 6, 4, 6, 7,
          ];

          const geom = new THREE.BufferGeometry();
          const positionArray = new Float32Array(vertices.flatMap(v => [v.x, v.y, v.z]));
          geom.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
          geom.setIndex(indices);
          geom.computeVertexNormals();
          // Center geometry on Y so bottom sits at bottomZ when positioned at bottomZ + height/2
          geom.translate(0, -height / 2, 0);

          geometry = geom as THREE.BufferGeometry;
        } else {
          // Rectangle or Square (default)
          geometry = new THREE.BoxGeometry(
            obstacle.dimensions.length || 1,
            obstacle.height,
            obstacle.dimensions.width || 1
          );
        }

        // Calculate stacking-aware Y position
        const placement = placements.find(p => p.id === obstacle.id);
        const bottomZ = placement ? placement.bottomZ : baseHeight;
        const yPosition = bottomZ + (obstacle.height / 2);

        // Create a group to handle rotations correctly
        return (
          <group
            key={obstacle.id}
            position={[obstacle.position.x, yPosition, obstacle.position.y]}
            rotation={[0, (obstacle.type === 'triangle' ? -obstacle.rotation : obstacle.rotation) * (Math.PI / 180), 0]}
          >
            <mesh
              geometry={geometry}
              castShadow
              receiveShadow
            >
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

export const ThreeScene = ({ shapes, obstacles, buildingHeight }: ThreeSceneProps) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-200 to-sky-100">
      <Canvas
        camera={{ position: [20, 20, 20], fov: 50 }}
        shadows
      >
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <Environment preset="city" />
        
        {/* Base building */}
        <Building3D shapes={shapes} height={buildingHeight} />
        
        {/* Obstacles - update the Obstacles3D component to use buildingHeight */}
        <Obstacles3D 
          obstacles={obstacles} 
          baseHeight={buildingHeight}
          shapes={shapes}  // Pass shapes to Obstacles3D
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
    </div>
  );
};