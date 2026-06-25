"use client";

import { useRef, useMemo, useEffect, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import { Group, MeshStandardMaterial, Mesh } from "three";

function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

const sprinkleColors = ["#f4d03f", "#85c1e9", "#f1948a", "#82e0aa"];

function Donut() {
  const meshRef = useRef<Group>(null);

  const sprinkles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        angle: (i / 12) * Math.PI * 2,
        radius: 1.1 + ((i * 37) % 30) / 100,
        rotation: [i * 0.5, i * 0.3, i * 0.7],
        color: sprinkleColors[i % 4],
      })),
    []
  );

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#d4a373",
        roughness: 0.4,
        metalness: 0.1,
      }),
    []
  );

  const icing = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#e8927c",
        roughness: 0.3,
        metalness: 0.1,
      }),
    []
  );

  // 组件卸载时释放 GPU 材质资源
  useEffect(() => {
    return () => {
      material.dispose();
      icing.dispose();
    };
  }, [material, icing]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
      <group ref={meshRef}>
        <mesh>
          <torusGeometry args={[1.2, 0.45, 16, 48]} />
          <primitive object={material} attach="material" />
        </mesh>
        <mesh scale={[1.05, 1.05, 1.05]}>
          <torusGeometry args={[1.2, 0.48, 16, 48]} />
          <primitive object={icing} attach="material" />
        </mesh>
        {sprinkles.map((s, i) => {
          const x = Math.cos(s.angle) * s.radius;
          const y = Math.sin(s.angle) * s.radius;
          return (
            <mesh key={i} position={[x, y, 0.35]} rotation={s.rotation as [number, number, number]}>
              <boxGeometry args={[0.12, 0.04, 0.04]} />
              <meshStandardMaterial color={s.color} />
            </mesh>
          );
        })}
      </group>
    </Float>
  );
}

function Candy() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.7}>
      <mesh ref={meshRef} position={[2.5, -1, -1]}>
        <sphereGeometry args={[0.9, 24, 24]} />
        <meshStandardMaterial color="#c87e4f" roughness={0.2} metalness={0.15} />
      </mesh>
    </Float>
  );
}

function ChipBag() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.08;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={meshRef} position={[-2.5, 0.5, -1.5]}>
        <boxGeometry args={[1.4, 1.9, 0.4]} />
        <meshStandardMaterial color="#f4d03f" roughness={0.5} metalness={0.05} />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      <pointLight position={[-5, 3, 2]} intensity={1.0} color="#e8927c" />
      <pointLight position={[5, -3, 2]} intensity={0.6} color="#f4d03f" />
      <Donut />
      <Candy />
      <ChipBag />
      <ContactShadows position={[0, -3, 0]} opacity={0.25} scale={12} blur={2} far={4} />
    </>
  );
}

export function FloatingSnacks() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 -z-10 opacity-40 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10" />
    );
  }

  return (
    <div className="absolute inset-0 -z-10 opacity-70">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 1]}
        frameloop="always"
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
