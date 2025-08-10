import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Shape, Obstacle } from '@/stores/shapeStore';

interface ThreeSceneProps {
  shapes: Shape[];
  obstacles?: Obstacle[];
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
        const length = (shape.dimensions.length || 1);
        const width = (shape.dimensions.width || shape.dimensions.length || 1);
        
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(shape.position.x, shape.position.y);
        shapeOutline.lineTo(shape.position.x + length, shape.position.y);
        shapeOutline.lineTo(shape.position.x + length, shape.position.y + width);
        shapeOutline.lineTo(shape.position.x, shape.position.y + width);
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
      } else if (shape.type === 'triangle') {
        const length = shape.dimensions.length || 1;
        const height = (length * Math.sqrt(3)) / 2; // Equilateral triangle height
        
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(shape.position.x + length / 2, shape.position.y); // Top point
        shapeOutline.lineTo(shape.position.x, shape.position.y + height); // Bottom left
        shapeOutline.lineTo(shape.position.x + length, shape.position.y + height); // Bottom right
        shapeOutline.lineTo(shape.position.x + length / 2, shape.position.y); // Back to top
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
        color="hsl(142, 71%, 55%)" 
        transparent 
        opacity={0.9}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
};

const Obstacles3D = ({ obstacles }: { obstacles: Obstacle[] }) => {
  const obstacleGeometries = useMemo(() => {
    if (!obstacles || obstacles.length === 0) return [];

    return obstacles.map((obstacle) => {
      let shapeOutline: THREE.Shape;
      
      if (obstacle.type === 'rectangle' || obstacle.type === 'square') {
        const length = (obstacle.dimensions.length || 1);
        const width = (obstacle.dimensions.width || obstacle.dimensions.length || 1);
        
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(obstacle.position.x, obstacle.position.y);
        shapeOutline.lineTo(obstacle.position.x + length, obstacle.position.y);
        shapeOutline.lineTo(obstacle.position.x + length, obstacle.position.y + width);
        shapeOutline.lineTo(obstacle.position.x, obstacle.position.y + width);
        shapeOutline.lineTo(obstacle.position.x, obstacle.position.y);
        
      } else if (obstacle.type === 'circle') {
        const radius = obstacle.dimensions.radius || 1;
        shapeOutline = new THREE.Shape();
        shapeOutline.absarc(
          obstacle.position.x + radius, 
          obstacle.position.y + radius, 
          radius, 
          0, 
          Math.PI * 2, 
          false
        );
      } else if (obstacle.type === 'triangle') {
        const length = obstacle.dimensions.length || 1;
        const height = (length * Math.sqrt(3)) / 2;
        
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(obstacle.position.x + length / 2, obstacle.position.y);
        shapeOutline.lineTo(obstacle.position.x, obstacle.position.y + height);
        shapeOutline.lineTo(obstacle.position.x + length, obstacle.position.y + height);
        shapeOutline.lineTo(obstacle.position.x + length / 2, obstacle.position.y);
      } else {
        // Default to rectangle
        shapeOutline = new THREE.Shape();
        shapeOutline.moveTo(obstacle.position.x, obstacle.position.y);
        shapeOutline.lineTo(obstacle.position.x + 1, obstacle.position.y);
        shapeOutline.lineTo(obstacle.position.x + 1, obstacle.position.y + 1);
        shapeOutline.lineTo(obstacle.position.x, obstacle.position.y + 1);
        shapeOutline.lineTo(obstacle.position.x, obstacle.position.y);
      }

      const extrudeSettings = {
        depth: obstacle.height,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.025,
        bevelSegments: 1,
      };

      const extrudedGeometry = new THREE.ExtrudeGeometry(shapeOutline, extrudeSettings);
      return { geometry: extrudedGeometry, id: obstacle.id };
    });
  }, [obstacles]);

  return (
    <>
      {obstacleGeometries.map(({ geometry, id }) => (
        <mesh 
          key={id}
          geometry={geometry} 
          position={[0, 0, 0]} 
          rotation={[-Math.PI / 2, 0, 0]} 
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
      ))}
    </>
  );
};

export const ThreeScene = ({ shapes, obstacles = [], buildingHeight }: ThreeSceneProps) => {
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
        <Obstacles3D obstacles={obstacles} />
        
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