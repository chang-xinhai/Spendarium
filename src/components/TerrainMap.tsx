import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CategoryKey, Transaction } from '../lib/types';

interface TerrainMapProps {
  transactions: Transaction[];
  compact?: boolean;
}

const CATEGORY_ROWS: CategoryKey[] = ['food', 'shopping', 'transport', 'living', 'entertainment', 'travel', 'digital', 'other'];

export default function TerrainMap({ transactions, compact = false }: TerrainMapProps) {
  const terrain = useMemo(() => buildTerrain(transactions), [transactions]);

  return (
    <Canvas
      camera={{ position: [0, compact ? 4.3 : 5.4, compact ? 6.35 : 7.7], fov: compact ? 43 : 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ height: '100%', minHeight: compact ? 300 : 460, width: '100%' }}
    >
      <color attach="background" args={['#f3ede3']} />
      <ambientLight intensity={1.45} />
      <directionalLight position={[-4, 7, 4]} intensity={3.8} color="#fff6e4" />
      <directionalLight position={[5, 3, -6]} intensity={1.75} color="#d6efe1" />
      <TerrainScene terrain={terrain} compact={compact} />
      <OrbitControls
        enableDamping
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.18}
        target={[0, 0.45, 0]}
        minDistance={compact ? 5.2 : 6.2}
        maxDistance={compact ? 10 : 12}
        minPolarAngle={Math.PI / 4.2}
        maxPolarAngle={Math.PI / 2.25}
      />
    </Canvas>
  );
}

function TerrainScene({ terrain, compact }: { terrain: TerrainData; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const contourGeometry = useMemo(() => makeContourGeometry(terrain), [terrain]);
  const ridgeGeometry = useMemo(() => makeRidgeGeometry(terrain), [terrain]);

  useFrame((state) => {
    if (!group.current || !compact) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.035;
  });

  return (
    <group ref={group} rotation={[-0.03, 0, 0]} position={[0, compact ? -0.18 : -0.26, 0]}>
      <mesh geometry={terrain.geometry} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.54} metalness={0.01} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={contourGeometry} position={[0, 0.018, 0]}>
        <lineBasicMaterial color="#806b4f" transparent opacity={0.48} />
      </lineSegments>
      <lineSegments geometry={ridgeGeometry} position={[0, 0.026, 0]}>
        <lineBasicMaterial color="#51493f" transparent opacity={0.25} />
      </lineSegments>
      <mesh position={[0, -0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[terrain.width + 0.25, terrain.depth + 0.2]} />
        <meshBasicMaterial color="#e9dfd1" transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

interface TerrainData {
  geometry: THREE.BufferGeometry;
  heights: number[][];
  width: number;
  depth: number;
  cols: number;
  rows: number;
}

function buildTerrain(transactions: Transaction[]): TerrainData {
  const expenses = transactions.filter((tx) => tx.direction === 'expense');
  const cols = 46;
  const rows = CATEGORY_ROWS.length;
  const width = 7.8;
  const depth = 4.3;
  const geometry = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1);
  geometry.rotateX(-Math.PI / 2);

  const range = getRange(expenses);
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  for (const tx of expenses) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((tx.timestamp - range.start) / range.span) * (cols - 1))));
    const matchedRow = CATEGORY_ROWS.indexOf(tx.category);
    const row = matchedRow === -1 ? rows - 1 : matchedRow;
    grid[row][col] += tx.amount;
  }

  const max = Math.max(...grid.flat(), 1);
  const heights = grid.map((row) => row.map((value) => Math.pow(value / max, 0.52) * 2.18));
  const smoothed = smoothHeights(heights);
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];

  for (let z = 0; z < rows; z += 1) {
    for (let x = 0; x < cols; x += 1) {
      const idx = z * cols + x;
      const h = smoothed[z][x];
      positions.setY(idx, h);
      const color = colorForHeight(h / 2.18);
      colors.push(color.r, color.g, color.b);
    }
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return { geometry, heights: smoothed, width, depth, cols, rows };
}

function getRange(transactions: Transaction[]) {
  if (!transactions.length) {
    const start = new Date('2026-01-01').getTime();
    return { start, span: 86400000 * 90 };
  }
  const start = Math.min(...transactions.map((tx) => tx.timestamp));
  const end = Math.max(...transactions.map((tx) => tx.timestamp));
  return { start, span: Math.max(1, end - start) };
}

function smoothHeights(heights: number[][]) {
  const rows = heights.length;
  const cols = heights[0].length;
  return heights.map((row, z) => row.map((value, x) => {
    let total = value * 1.7;
    let weight = 1.7;
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dz) continue;
        const nz = z + dz;
        const nx = x + dx;
        if (nz < 0 || nz >= rows || nx < 0 || nx >= cols) continue;
        total += heights[nz][nx] * 0.55;
        weight += 0.55;
      }
    }
    return total / weight;
  }));
}

function colorForHeight(value: number) {
  const low = new THREE.Color('#d4e6d7');
  const mid = new THREE.Color('#ecd1a1');
  const high = new THREE.Color('#c46a52');
  if (value < 0.48) return low.lerp(mid, value / 0.48);
  return mid.lerp(high, (value - 0.48) / 0.52);
}

function makeContourGeometry(terrain: TerrainData) {
  const positions: number[] = [];
  const levels = [0.2, 0.38, 0.56, 0.74, 0.92, 1.1, 1.32, 1.58, 1.86];
  const xStep = terrain.width / (terrain.cols - 1);
  const zStep = terrain.depth / (terrain.rows - 1);
  const x0 = -terrain.width / 2;
  const z0 = -terrain.depth / 2;

  for (const level of levels) {
    for (let z = 0; z < terrain.rows - 1; z += 1) {
      for (let x = 0; x < terrain.cols - 1; x += 1) {
        const corners = [
          { x: x0 + x * xStep, z: z0 + z * zStep, h: terrain.heights[z][x] },
          { x: x0 + (x + 1) * xStep, z: z0 + z * zStep, h: terrain.heights[z][x + 1] },
          { x: x0 + (x + 1) * xStep, z: z0 + (z + 1) * zStep, h: terrain.heights[z + 1][x + 1] },
          { x: x0 + x * xStep, z: z0 + (z + 1) * zStep, h: terrain.heights[z + 1][x] },
        ];
        const intersections = [
          interpolate(corners[0], corners[1], level),
          interpolate(corners[1], corners[2], level),
          interpolate(corners[2], corners[3], level),
          interpolate(corners[3], corners[0], level),
        ].filter(Boolean) as Array<{ x: number; z: number; h: number }>;

        if (intersections.length >= 2) {
          positions.push(intersections[0].x, level, intersections[0].z, intersections[1].x, level, intersections[1].z);
          if (intersections.length === 4) {
            positions.push(intersections[2].x, level, intersections[2].z, intersections[3].x, level, intersections[3].z);
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function interpolate(a: { x: number; z: number; h: number }, b: { x: number; z: number; h: number }, level: number) {
  if ((a.h < level && b.h < level) || (a.h > level && b.h > level) || a.h === b.h) return null;
  const t = (level - a.h) / (b.h - a.h);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: level };
}

function makeRidgeGeometry(terrain: TerrainData) {
  const positions: number[] = [];
  const xStep = terrain.width / (terrain.cols - 1);
  const zStep = terrain.depth / (terrain.rows - 1);
  const x0 = -terrain.width / 2;
  const z0 = -terrain.depth / 2;

  for (let z = 0; z < terrain.rows; z += 1) {
    for (let x = 0; x < terrain.cols - 1; x += 1) {
      positions.push(
        x0 + x * xStep, terrain.heights[z][x], z0 + z * zStep,
        x0 + (x + 1) * xStep, terrain.heights[z][x + 1], z0 + z * zStep,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}
