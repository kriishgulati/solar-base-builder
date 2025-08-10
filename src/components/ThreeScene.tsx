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

    // Create individual shape geometries
    const shapeGeometries: THREE.ExtrudeGeometry[] = [];
    
    shapes.forEach((shape) => {
      let shapeOutline: THREE.Shape;
      
      if (shape.type === 'rectangle' || shape.type === 'square') {
        const width = (shape.dimensions.width || 1);
        const shapeHeight = (shape.dimensions.height || shape.dimensions.width || 1);
        
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(shape.position.x, shape.position.y);
        shapeOutline.lineTo(shape.position.x + width, shape.position.y);
        shapeOutline.lineTo(shape.position.x + width, shape.position.y + shapeHeight);
        shapeOutline.lineTo(shape.position.x, shape.position.y + shapeHeight);
        shapeOutline.lineTo(shape.position.x, shape.position.y);
        
      } else if (shape.type === 'circle') {
        const radius = shape.dimensions.radius || 1;
        shapeOutline = new THREE.Shape();
        shapeOutline.absarc(
          shape.position.x + radius, 
          shape.position.y + radius, 
          radius, 
          0, 
          Math.PI * 2, 
          false
        );
      } else {
        // Default to rectangle if type is unknown
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(shape.position.x, shape.position.y);
        shapeOutline.lineTo(shape.position.x + 1, shape.position.y);
        shapeOutline.lineTo(shape.position.x + 1, shape.position.y + 1);
        shapeOutline.lineTo(shape.position.x, shape.position.y + 1);
        shapeOutline.lineTo(shape.position.x, shape.position.y);
      }

      const extrudeSettings = {
        depth: height,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelSegments: 2,
      };

      const extrudedGeometry = new THREE.ExtrudeGeometry(shapeOutline, extrudeSettings);
      shapeGeometries.push(extrudedGeometry);
    });

    // Merge all geometries into one
    if (shapeGeometries.length === 1) {
      return shapeGeometries[0];
    } else if (shapeGeometries.length > 1) {
      // Create a combined geometry
      const mergedGeometry = new THREE.BufferGeometry();
      const geometries = shapeGeometries.map(geom => geom);
      
      // Use BufferGeometryUtils to merge geometries
      const combinedGeometry = geometries.reduce((acc, curr) => {
        const merged = new THREE.BufferGeometry();
        const positions: number[] = [];
        const indices: number[] = [];
        
        // Get positions from accumulated geometry
        if (acc.attributes.position) {
          const accPositions = acc.attributes.position.array;
          positions.push(...Array.from(accPositions));
        }
        
        // Get positions from current geometry
        if (curr.attributes.position) {
          const currPositions = curr.attributes.position.array;
          const offset = positions.length / 3;
          positions.push(...Array.from(currPositions));
          
          // Add indices with offset
          if (curr.index) {
            const currIndices = curr.index.array;
            indices.push(...Array.from(currIndices).map(i => i + offset));
          }
        }
        
        merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        if (indices.length > 0) {
          merged.setIndex(indices);
        }
        
        merged.computeVertexNormals();
        return merged;
      }, new THREE.BufferGeometry());
      
      return combinedGeometry;
    }

    return new THREE.BoxGeometry(1, 1, 1);
  }, [shapes, height]);

  return (
    <mesh geometry={geometry} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial 
        color="hsl(35, 91%, 55%)" 
        transparent 
        opacity={0.9}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.1}
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