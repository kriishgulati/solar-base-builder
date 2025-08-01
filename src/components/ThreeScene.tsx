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

    // Group connected shapes and create enclosed polygons
    const processedShapes = new Set<string>();
    const geometries: THREE.ExtrudeGeometry[] = [];
    
    // Helper function to get all connected shapes recursively
    const getConnectedGroup = (shapeId: string, visited: Set<string> = new Set()): Shape[] => {
      if (visited.has(shapeId)) return [];
      visited.add(shapeId);
      
      const shape = shapes.find(s => s.id === shapeId);
      if (!shape) return [];
      
      let group = [shape];
      shape.connectedTo.forEach(connectedId => {
        group = [...group, ...getConnectedGroup(connectedId, visited)];
      });
      
      return group;
    };

    // Process each shape or group of connected shapes
    shapes.forEach(shape => {
      if (processedShapes.has(shape.id)) return;
      
      if (shape.merged && shape.connectedTo.length > 0) {
        // This is part of a connected group - process the entire group
        const connectedGroup = getConnectedGroup(shape.id);
        connectedGroup.forEach(s => processedShapes.add(s.id));
        
        // Check if this group forms an enclosed shape (polygon)
        const lineShapes = connectedGroup.filter(s => s.type === 'line');
        const otherShapes = connectedGroup.filter(s => s.type !== 'line');
        
        if (lineShapes.length >= 3) {
          // Try to create a polygon from the lines
          const points: THREE.Vector2[] = [];
          
          // Sort lines to form a continuous path
          const sortedLines = [lineShapes[0]];
          let currentEndPoint = lineShapes[0].endPoint!;
          
          while (sortedLines.length < lineShapes.length) {
            const nextLine = lineShapes.find(line => 
              !sortedLines.includes(line) && 
              (Math.abs(line.startPoint!.x - currentEndPoint.x) < 0.3 && 
               Math.abs(line.startPoint!.y - currentEndPoint.y) < 0.3)
            );
            
            if (nextLine) {
              sortedLines.push(nextLine);
              currentEndPoint = nextLine.endPoint!;
            } else {
              // Try connecting to endpoint instead
              const reverseLine = lineShapes.find(line => 
                !sortedLines.includes(line) && 
                (Math.abs(line.endPoint!.x - currentEndPoint.x) < 0.3 && 
                 Math.abs(line.endPoint!.y - currentEndPoint.y) < 0.3)
              );
              if (reverseLine) {
                sortedLines.push(reverseLine);
                currentEndPoint = reverseLine.startPoint!;
              } else {
                break;
              }
            }
          }
          
          // Create points from sorted lines
          if (sortedLines.length >= 3) {
            sortedLines.forEach(line => {
              points.push(new THREE.Vector2(line.startPoint!.x, line.startPoint!.y));
            });
            
            // Check if it's a closed polygon
            const firstPoint = points[0];
            const lastPoint = points[points.length - 1];
            const distance = firstPoint.distanceTo(lastPoint);
            
            if (distance < 0.5 || sortedLines.length >= 3) {
              // Create enclosed polygon
              const polygonShape = new THREE.Shape(points);
              const extrudeSettings = {
                depth: height,
                bevelEnabled: true,
                bevelThickness: 0.1,
                bevelSize: 0.05,
                bevelSegments: 2,
              };
              
              const extrudedGeometry = new THREE.ExtrudeGeometry(polygonShape, extrudeSettings);
              geometries.push(extrudedGeometry);
            }
          }
        }
        
        // Add other shapes in the group
        otherShapes.forEach(otherShape => {
          const shapeGeometry = createShapeGeometry(otherShape, height);
          if (shapeGeometry) geometries.push(shapeGeometry);
        });
        
      } else {
        // Single unconnected shape
        processedShapes.add(shape.id);
        const shapeGeometry = createShapeGeometry(shape, height);
        if (shapeGeometry) geometries.push(shapeGeometry);
      }
    });

    // Merge all geometries
    if (geometries.length === 1) {
      return geometries[0];
    } else if (geometries.length > 1) {
      // Create a simple combined geometry by merging positions
      const combinedGeometry = new THREE.BufferGeometry();
      const allPositions: number[] = [];
      let totalVertices = 0;
      
      geometries.forEach(geom => {
        if (geom.attributes.position) {
          const positions = Array.from(geom.attributes.position.array);
          allPositions.push(...positions);
          totalVertices += positions.length / 3;
        }
      });
      
      if (allPositions.length > 0) {
        combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
        combinedGeometry.computeVertexNormals();
        return combinedGeometry;
      }
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

// Helper function to create geometry for individual shapes
const createShapeGeometry = (shape: Shape, height: number): THREE.ExtrudeGeometry | null => {
  let shapeOutline: THREE.Shape;
  
  if (shape.type === 'line') {
    // Create a thin rectangular shape for the line
    const lineWidth = 0.1; // 10cm width for the line
    const dx = shape.endPoint!.x - shape.startPoint!.x;
    const dy = shape.endPoint!.y - shape.startPoint!.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
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
    return null;
  }

  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.05,
    bevelSegments: 2,
  };

  return new THREE.ExtrudeGeometry(shapeOutline, extrudeSettings);
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