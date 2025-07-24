import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Shape } from '@/stores/shapeStore';

interface ThreeSceneProps {
  shapes: Shape[];
  buildingHeight: number;
}

const Building3D = ({ shapes, height }: { shapes: Shape[], height: number }) => {
  const geometry = useMemo(() => {
    if (shapes.length === 0) return new THREE.BoxGeometry(1, 1, 1);

    // Create a combined shape from all shapes
    let combinedShape = new THREE.Shape();
    
    shapes.forEach((shape, index) => {
      let shapeGeometry: THREE.Shape;
      
      if (shape.type === 'rectangle' || shape.type === 'square') {
        const width = (shape.dimensions.width || 1);
        const height = (shape.dimensions.height || shape.dimensions.width || 1);
        
        shapeGeometry = new THREE.Shape();
        shapeGeometry.moveTo(shape.position.x, shape.position.y);
        shapeGeometry.lineTo(shape.position.x + width, shape.position.y);
        shapeGeometry.lineTo(shape.position.x + width, shape.position.y + height);
        shapeGeometry.lineTo(shape.position.x, shape.position.y + height);
        shapeGeometry.lineTo(shape.position.x, shape.position.y);
        
      } else if (shape.type === 'circle') {
        const radius = shape.dimensions.radius || 1;
        shapeGeometry = new THREE.Shape();
        shapeGeometry.absarc(
          shape.position.x + radius, 
          shape.position.y + radius, 
          radius, 
          0, 
          Math.PI * 2, 
          false
        );
      } else {
        // Default to rectangle if type is unknown
        shapeGeometry = new THREE.Shape();
        shapeGeometry.moveTo(shape.position.x, shape.position.y);
        shapeGeometry.lineTo(shape.position.x + 1, shape.position.y);
        shapeGeometry.lineTo(shape.position.x + 1, shape.position.y + 1);
        shapeGeometry.lineTo(shape.position.x, shape.position.y + 1);
        shapeGeometry.lineTo(shape.position.x, shape.position.y);
      }

      if (index === 0) {
        combinedShape = shapeGeometry;
      } else {
        // For now, we'll just add shapes separately
        // In a real implementation, you'd want to use CSG operations
      }
    });

    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(combinedShape, extrudeSettings);
  }, [shapes, height]);

  return (
    <mesh geometry={geometry} position={[0, height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial 
        color="hsl(35, 91%, 55%)" 
        transparent 
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const ThreeScene = ({ shapes, buildingHeight }: ThreeSceneProps) => {
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
        
        <Building3D shapes={shapes} height={buildingHeight} />
        
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