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
        } else {
          // Rectangle or Square (default)
          geometry = new THREE.BoxGeometry(
            obstacle.dimensions.length || 1,
            obstacle.height,
            obstacle.dimensions.width || 1
          );
        }

        // Calculate the correct Y position: baseHeight + half of obstacle height
        const yPosition = baseHeight + (obstacle.height / 2);

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
                color="hsl(0, 84%, 60%)"
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