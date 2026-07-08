import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CATEGORIES } from '../lib/categories';
import type { CategoryKey, Transaction } from '../lib/types';

interface TerrainMapProps {
  transactions: Transaction[];
  compact?: boolean;
}

const CATEGORY_ROWS = Object.keys(CATEGORIES) as CategoryKey[];

export default function TerrainMap({ transactions, compact = false }: TerrainMapProps) {
  const terrain = useMemo(() => buildTerrain(transactions, compact), [transactions, compact]);

  return (
    <Canvas
      orthographic
      shadows
      camera={{ position: [4.7, compact ? 5.7 : 6.3, compact ? 5.8 : 6.4], zoom: compact ? 68 : 80, near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      style={{ height: '100%', minHeight: compact ? 300 : 460, width: '100%' }}
    >
      <color attach="background" args={['#f7f8f5']} />
      <ambientLight intensity={0.42} />
      <hemisphereLight intensity={1.25} groundColor="#d9d0c2" color="#ffffff" />
      <directionalLight
        castShadow
        position={[-4.5, 8, 4.5]}
        intensity={2.5}
        color="#fff7e8"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[5, 3, -5]} intensity={0.72} color="#dff0e4" />
      <TerrainScene terrain={terrain} compact={compact} />
      <OrbitControls
        enableDamping
        enablePan={false}
        autoRotate={compact}
        autoRotateSpeed={0.18}
        target={[0, 0.5, 0]}
        minZoom={compact ? 48 : 58}
        maxZoom={compact ? 92 : 108}
        minPolarAngle={Math.PI / 4.2}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  );
}

function TerrainScene({ terrain, compact }: { terrain: TerrainData; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const minorContourGeometry = useMemo(() => makeContourGeometry(terrain, terrain.minorLevels), [terrain]);
  const majorContourGeometry = useMemo(() => makeContourGeometry(terrain, terrain.majorLevels), [terrain]);
  const ridgeGeometry = useMemo(() => makeRidgeGeometry(terrain), [terrain]);
  const [hover, setHover] = useState<TerrainHover | null>(null);

  useFrame((state) => {
    if (!group.current || !compact) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.035;
  });

  return (
    <group ref={group} rotation={[-0.03, 0, 0]} position={[0, compact ? -0.18 : -0.26, 0]}>
      <mesh
        geometry={terrain.geometry}
        receiveShadow
        castShadow
        onPointerMove={(event) => {
          if (compact) return;
          event.stopPropagation();
          const next = terrainHoverFromPoint(terrain, event.point);
          setHover((current) => current?.key === next?.key ? current : next);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={minorContourGeometry} position={[0, 0.02, 0]}>
        <lineBasicMaterial color="#8c8f82" transparent opacity={0.2} />
      </lineSegments>
      <lineSegments geometry={majorContourGeometry} position={[0, 0.028, 0]}>
        <lineBasicMaterial color="#595849" transparent opacity={0.46} />
      </lineSegments>
      <lineSegments geometry={ridgeGeometry} position={[0, 0.026, 0]}>
        <lineBasicMaterial color="#34342c" transparent opacity={0.26} />
      </lineSegments>
      <mesh position={[0, -0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[terrain.width + 0.25, terrain.depth + 0.2]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>
      {!compact ? (
        <>
          {terrain.categoryTicks.map((tick) => (
            <Html className="terrain-axis-label category" center key={tick.key} position={[-terrain.width / 2 - 0.28, 0.09, tick.z]}>
              {tick.label}
            </Html>
          ))}
          {terrain.monthTicks.map((tick) => (
            <Html className="terrain-axis-label month" center key={tick.key} position={[tick.x, 0.08, terrain.depth / 2 + 0.22]}>
              {tick.label}
            </Html>
          ))}
          {terrain.peak ? (
            <Html className="terrain-peak-label" center position={[terrain.peak.x, terrain.peak.height + 0.26, terrain.peak.z]}>
              <span>{terrain.peak.label}</span>
              <strong>{formatTerrainAmount(terrain.peak.amount)}</strong>
            </Html>
          ) : null}
          {hover ? (
            <Html className="terrain-tooltip" center position={[hover.x, hover.height + 0.38, hover.z]}>
              <strong>{hover.category}</strong>
              <span>{hover.date}</span>
              <em>{formatTerrainAmount(hover.amount)} · {hover.count} 笔</em>
            </Html>
          ) : null}
        </>
      ) : null}
    </group>
  );
}

interface TerrainData {
  geometry: THREE.BufferGeometry;
  heights: number[][];
  buckets: Array<Array<{ amount: number; count: number }>>;
  categories: CategoryKey[];
  dates: string[];
  categoryTicks: Array<{ key: CategoryKey; label: string; z: number }>;
  monthTicks: Array<{ key: string; label: string; x: number }>;
  minorLevels: number[];
  majorLevels: number[];
  peak?: { x: number; z: number; height: number; amount: number; label: string };
  width: number;
  depth: number;
  cols: number;
  rows: number;
  maxHeight: number;
}

interface TerrainHover {
  key: string;
  x: number;
  z: number;
  height: number;
  amount: number;
  count: number;
  category: string;
  date: string;
}

function buildTerrain(transactions: Transaction[], compact: boolean): TerrainData {
  const expenses = transactions.filter((tx) => tx.direction === 'expense');
  const cols = compact ? 88 : 112;
  const rows = compact ? 44 : 56;
  const width = 7.8;
  const depth = 4.3;
  const geometry = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1);
  geometry.rotateX(-Math.PI / 2);

  const range = getRange(expenses);
  const buckets = Array.from({ length: CATEGORY_ROWS.length }, () => Array.from({ length: cols }, () => ({ amount: 0, count: 0 })));

  for (const tx of expenses) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((tx.timestamp - range.start) / range.span) * (cols - 1))));
    const matchedRow = CATEGORY_ROWS.indexOf(tx.category);
    const categoryIndex = matchedRow === -1 ? CATEGORY_ROWS.length - 1 : matchedRow;
    buckets[categoryIndex][col].amount += tx.amount;
    buckets[categoryIndex][col].count += 1;
  }

  const maxBucket = Math.max(...buckets.flat().map((bucket) => bucket.amount), 1);
  const heights = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0.018));
  const sigmaX = compact ? 1.95 : 2.35;
  const sigmaZ = compact ? 2.45 : 3.15;
  const radiusX = Math.ceil(sigmaX * 3);
  const radiusZ = Math.ceil(sigmaZ * 3);

  buckets.forEach((rowBuckets, categoryIndex) => {
    const zCenter = categoryIndexToRow(categoryIndex, rows);
    rowBuckets.forEach((bucket, col) => {
      if (!bucket.amount) return;
      const amp = Math.pow(Math.log1p(bucket.amount) / Math.log1p(maxBucket), 0.82) * (compact ? 1.35 : 2.05);
      for (let dz = -radiusZ; dz <= radiusZ; dz += 1) {
        const z = Math.round(zCenter + dz);
        if (z < 0 || z >= rows) continue;
        for (let dx = -radiusX; dx <= radiusX; dx += 1) {
          const x = col + dx;
          if (x < 0 || x >= cols) continue;
          const falloff = Math.exp(-((dx * dx) / (2 * sigmaX * sigmaX) + (dz * dz) / (2 * sigmaZ * sigmaZ)));
          heights[z][x] += amp * falloff;
        }
      }
    });
  });

  const smoothed = blurHeights(heights, compact ? 1 : 2);
  const rawMax = Math.max(...smoothed.flat(), 1);
  const targetHeight = compact ? 1.5 : 2.2;
  for (let z = 0; z < rows; z += 1) {
    for (let x = 0; x < cols; x += 1) {
      smoothed[z][x] = Math.pow(smoothed[z][x] / rawMax, 0.92) * targetHeight;
    }
  }
  let maxHeight = Math.max(...smoothed.flat(), 1);
  for (let z = 0; z < rows; z += 1) {
    for (let x = 0; x < cols; x += 1) {
      const n = terrainNoise(x, z);
      smoothed[z][x] = Math.max(0.01, smoothed[z][x] + n * 0.03 * (0.4 + smoothed[z][x] / maxHeight));
    }
  }
  maxHeight = Math.max(...smoothed.flat(), 1);
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];

  for (let z = 0; z < rows; z += 1) {
    for (let x = 0; x < cols; x += 1) {
      const idx = z * cols + x;
      const h = smoothed[z][x];
      positions.setY(idx, h);
      const slope = estimateSlope(smoothed, x, z);
      const color = colorForHeight(h / maxHeight, slope);
      colors.push(color.r, color.g, color.b);
    }
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const dates = Array.from({ length: cols }, (_, col) => new Date(range.start + range.span * (col / Math.max(1, cols - 1))).toISOString().slice(0, 10));
  const categoryTotals = buckets.map((row) => row.reduce((sum, bucket) => sum + bucket.amount, 0));
  const categoryTicks = CATEGORY_ROWS
    .map((key, index) => ({ key, label: CATEGORIES[key].name, total: categoryTotals[index], z: rowToZ(categoryIndexToRow(index, rows), rows, depth) }))
    .filter((tick) => tick.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 7)
    .sort((a, b) => a.z - b.z);
  const monthTicks = buildMonthTicks(range, cols, width);
  const minorLevels = Array.from({ length: 18 }, (_, index) => maxHeight * ((index + 1) / 20));
  const majorLevels = minorLevels.filter((_, index) => index % 4 === 2);
  const peak = buildPeak(buckets, smoothed, rows, cols, width, depth, dates);

  return { geometry, heights: smoothed, buckets, categories: CATEGORY_ROWS, dates, categoryTicks, monthTicks, minorLevels, majorLevels, peak, width, depth, cols, rows, maxHeight };
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

function blurHeights(heights: number[][], passes: number) {
  let current = heights;
  for (let pass = 0; pass < passes; pass += 1) {
    const rows = current.length;
    const cols = current[0].length;
    current = current.map((row, z) => row.map((value, x) => {
      let total = value * 1.6;
      let weight = 1.6;
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dz) continue;
          const nz = z + dz;
          const nx = x + dx;
          if (nz < 0 || nz >= rows || nx < 0 || nx >= cols) continue;
          const w = dx && dz ? 0.28 : 0.46;
          total += current[nz][nx] * w;
          weight += w;
        }
      }
      return total / weight;
    }));
  }
  return current;
}

function colorForHeight(value: number, slope: number) {
  const low = new THREE.Color('#f2f6ef');
  const mid = new THREE.Color('#dfd1ad');
  const high = new THREE.Color('#c48a68');
  const color = value < 0.62 ? low.lerp(mid, value / 0.62) : mid.lerp(high, (value - 0.62) / 0.38);
  const shade = Math.min(0.22, slope * 0.32);
  return color.lerp(new THREE.Color('#343329'), shade);
}

function makeContourGeometry(terrain: TerrainData, levels: number[]) {
  const positions: number[] = [];
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
  const threshold = terrain.maxHeight * 0.45;

  for (let z = 1; z < terrain.rows - 1; z += 1) {
    for (let x = 0; x < terrain.cols - 1; x += 1) {
      const h = terrain.heights[z][x];
      const next = terrain.heights[z][x + 1];
      if (h < threshold || next < threshold) continue;
      if (h >= terrain.heights[z - 1][x] && h >= terrain.heights[z + 1][x]) {
        positions.push(
          x0 + x * xStep, h, z0 + z * zStep,
          x0 + (x + 1) * xStep, next, z0 + z * zStep,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function categoryIndexToRow(index: number, rows: number) {
  if (CATEGORY_ROWS.length <= 1) return rows / 2;
  return index / (CATEGORY_ROWS.length - 1) * (rows - 1);
}

function rowToZ(row: number, rows: number, depth: number) {
  return -depth / 2 + (row / Math.max(1, rows - 1)) * depth;
}

function colToX(col: number, cols: number, width: number) {
  return -width / 2 + (col / Math.max(1, cols - 1)) * width;
}

function terrainNoise(x: number, z: number) {
  return Math.sin(x * 12.9898 + z * 78.233) * 43758.5453 % 1;
}

function estimateSlope(heights: number[][], x: number, z: number) {
  const rows = heights.length;
  const cols = heights[0].length;
  const left = heights[z][Math.max(0, x - 1)];
  const right = heights[z][Math.min(cols - 1, x + 1)];
  const up = heights[Math.max(0, z - 1)][x];
  const down = heights[Math.min(rows - 1, z + 1)][x];
  return Math.sqrt((right - left) ** 2 + (down - up) ** 2);
}

function buildMonthTicks(range: { start: number; span: number }, cols: number, width: number) {
  const ticks: Array<{ key: string; label: string; x: number }> = [];
  const start = new Date(range.start);
  const end = new Date(range.start + range.span);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    const ratio = Math.min(1, Math.max(0, (cursor.getTime() - range.start) / Math.max(1, range.span)));
    ticks.push({ key, label: `${cursor.getMonth() + 1}月`, x: colToX(ratio * (cols - 1), cols, width) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

function buildPeak(
  buckets: Array<Array<{ amount: number; count: number }>>,
  heights: number[][],
  rows: number,
  cols: number,
  width: number,
  depth: number,
  dates: string[],
) {
  let best = { amount: 0, categoryIndex: 0, col: 0 };
  buckets.forEach((row, categoryIndex) => row.forEach((bucket, col) => {
    if (bucket.amount > best.amount) best = { amount: bucket.amount, categoryIndex, col };
  }));
  if (!best.amount) return undefined;
  const row = Math.round(categoryIndexToRow(best.categoryIndex, rows));
  return {
    x: colToX(best.col, cols, width),
    z: rowToZ(row, rows, depth),
    height: heights[row][best.col],
    amount: best.amount,
    label: dates[best.col],
  };
}

function terrainHoverFromPoint(terrain: TerrainData, point: THREE.Vector3): TerrainHover | null {
  const xRatio = (point.x + terrain.width / 2) / terrain.width;
  const zRatio = (point.z + terrain.depth / 2) / terrain.depth;
  const col = Math.min(terrain.cols - 1, Math.max(0, Math.round(xRatio * (terrain.cols - 1))));
  const categoryIndex = Math.min(terrain.categories.length - 1, Math.max(0, Math.round(zRatio * (terrain.categories.length - 1))));
  const bucket = terrain.buckets[categoryIndex][col];
  if (!bucket.amount) return null;
  const row = Math.round(categoryIndexToRow(categoryIndex, terrain.rows));
  return {
    key: `${categoryIndex}-${col}`,
    x: colToX(col, terrain.cols, terrain.width),
    z: rowToZ(row, terrain.rows, terrain.depth),
    height: terrain.heights[row][col],
    amount: bucket.amount,
    count: bucket.count,
    category: CATEGORIES[terrain.categories[categoryIndex]].name,
    date: terrain.dates[col],
  };
}

function formatTerrainAmount(value: number) {
  if (value >= 10000) return `¥${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `¥${(value / 1000).toFixed(1)}k`;
  return `¥${value.toFixed(0)}`;
}
