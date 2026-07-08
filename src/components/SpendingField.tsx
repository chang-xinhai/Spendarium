import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CATEGORIES } from '../lib/categories';
import type { CategoryKey, Transaction } from '../lib/types';

interface SpendingFieldProps {
  transactions: Transaction[];
}

const categoryOrder = Object.keys(CATEGORIES) as CategoryKey[];

export default function SpendingField({ transactions }: SpendingFieldProps) {
  return (
    <Canvas
      camera={{ position: [0, 5.4, 7.2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ height: '100%', minHeight: 560, width: '100%' }}
    >
      <color attach="background" args={['#06060b']} />
      <fog attach="fog" args={['#06060b', 7, 13]} />
      <ambientLight intensity={0.55} />
      <pointLight color="#ead79b" intensity={3.2} position={[0, 4, 2]} />
      <pointLight color="#5ecbdc" intensity={1.15} position={[-5, 2, -4]} />
      <CashflowField transactions={transactions} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.22}
        enablePan={false}
        enableDamping
        maxDistance={11}
        minDistance={4.2}
        maxPolarAngle={Math.PI / 2.08}
        minPolarAngle={Math.PI / 4}
      />
    </Canvas>
  );
}

function CashflowField({ transactions }: SpendingFieldProps) {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => makePoints(transactions), [transactions]);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.035;
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.92, 0.012, 12, 240]} />
        <meshBasicMaterial color="#65d8e9" transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.82, 0.006, 8, 220]} />
        <meshBasicMaterial color="#c8a44e" transparent opacity={0.34} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.72, 0.005, 8, 180]} />
        <meshBasicMaterial color="#c8a44e" transparent opacity={0.22} />
      </mesh>
      <gridHelper args={[8.2, 28, '#2b2b2f', '#15161c']} position={[0, -0.12, 0]} />
      <mesh position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.18, 160]} />
        <meshBasicMaterial color="#0b0b11" transparent opacity={0.42} />
      </mesh>
      <TransactionPoints points={points} />
    </group>
  );
}

function TransactionPoints({ points }: { points: FieldPoint[] }) {
  return (
    <group>
      {points.map((point) => (
        <group key={point.id} position={point.position}>
          <mesh>
            <sphereGeometry args={[point.size, 18, 18]} />
            <meshStandardMaterial
              color={point.color}
              emissive={point.color}
              emissiveIntensity={point.emphasis}
              roughness={0.28}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0, -point.position[1] - 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[point.size * 0.95, 18]} />
            <meshBasicMaterial color={point.color} transparent opacity={0.14} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface FieldPoint {
  id: string;
  position: [number, number, number];
  size: number;
  color: string;
  emphasis: number;
}

function makePoints(transactions: Transaction[]): FieldPoint[] {
  if (!transactions.length) return [];
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  const minTime = sorted[0].timestamp;
  const maxTime = sorted[sorted.length - 1].timestamp || minTime + 1;
  const maxAmount = Math.max(...sorted.map((tx) => tx.amount), 1);

  return sorted.slice(-520).map((tx, index) => {
    const normalizedTime = (tx.timestamp - minTime) / Math.max(1, maxTime - minTime);
    const categoryIndex = categoryOrder.indexOf(tx.category);
    const angle = normalizedTime * Math.PI * 2 - Math.PI / 2;
    const lane = categoryIndex >= 0 ? categoryIndex % 7 : 6;
    const radius = 1.2 + lane * 0.38 + (tx.direction === 'income' ? 0.24 : 0);
    const amountRatio = Math.sqrt(tx.amount / maxAmount);
    const x = Math.cos(angle) * radius * 1.2;
    const z = Math.sin(angle) * radius * 0.78;
    const y = tx.direction === 'income' ? 0.45 + amountRatio * 0.42 : 0.05 + amountRatio * 0.92;
    const size = 0.025 + amountRatio * 0.135;
    const color = tx.direction === 'income' ? '#48d39b' : CATEGORIES[tx.category].color;
    return {
      id: `${tx.id}_${index}`,
      position: [x, y, z] as [number, number, number],
      size,
      color,
      emphasis: 0.38 + amountRatio * 0.95,
    };
  });
}
