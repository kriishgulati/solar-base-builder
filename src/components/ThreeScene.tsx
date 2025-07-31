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
      
      if (shape.type === 'line') {
        // Create a thin rectangular shape for the line
        const lineWidth = 0.1; // 10cm width for the line
        const lineLength = shape.dimensions.lineLength || 1;
        
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(shape.startPoint!.x, shape.startPoint!.y);
        shapeOutline.lineTo(shape.startPoint!.x + lineWidth, shape.startPoint!.y);
        shapeOutline.lineTo(shape.endPoint!.x + lineWidth, shape.endPoint!.y);
        shapeOutline.lineTo(shape.endPoint!.x, shape.endPoint!.y);
        shapeOutline.lineTo(shape.startPoint!.x, shape.startPoint!.y);
      } else if (shape.type === 'rectangle' || shape.type === 'square') {
        const width = (shape.dimensions.width || 1);
        const shapeHeight = (shape.dimensions.length || shape.dimensions.width || 1);
        
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
        camera={{ position: [15, 12, 15], fov: 50 }}
        shadows
      >
        {/* Ground plane for better visibility */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshLambertMaterial color="#90EE90" />
        </mesh>
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[20, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        
        <Environment preset="city" />
        
        <Building3D shapes={shapes} height={buildingHeight} />
        
        <Grid 
          infiniteGrid 
          cellSize={1} 
          cellThickness={0.8} 
          cellColor="#4a5568" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#2d3748" 
          fadeDistance={80} 
          fadeStrength={1}
          position={[0, 0, 0]}
        />
        
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          minDistance={3}
          maxDistance={150}
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
};