'use client';

import * as React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, RoundedBox } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ── Icon textures drawn at runtime ──────────────────────────────
   Keeps the bundle free of image assets and stays crisp at any DPR. */
type IconKind = 'music' | 'shield' | 'bolt' | 'chat';

function drawIcon(ctx: CanvasRenderingContext2D, kind: IconKind) {
  ctx.strokeStyle = '#C9FFF0';
  ctx.fillStyle = '#C9FFF0';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (kind === 'music') {
    ctx.beginPath();
    ctx.arc(46, 82, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(86, 72, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(59, 82);
    ctx.lineTo(59, 34);
    ctx.lineTo(99, 24);
    ctx.lineTo(99, 72);
    ctx.stroke();
  }

  if (kind === 'shield') {
    ctx.beginPath();
    ctx.moveTo(64, 24);
    ctx.lineTo(102, 38);
    ctx.lineTo(102, 66);
    ctx.bezierCurveTo(102, 88, 82, 100, 64, 108);
    ctx.bezierCurveTo(46, 100, 26, 88, 26, 66);
    ctx.lineTo(26, 38);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46, 66);
    ctx.lineTo(60, 80);
    ctx.lineTo(84, 52);
    ctx.stroke();
  }

  if (kind === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(72, 20);
    ctx.lineTo(34, 72);
    ctx.lineTo(60, 72);
    ctx.lineTo(52, 108);
    ctx.lineTo(94, 54);
    ctx.lineTo(66, 54);
    ctx.closePath();
    ctx.fill();
  }

  if (kind === 'chat') {
    ctx.beginPath();
    ctx.moveTo(30, 34);
    ctx.quadraticCurveTo(30, 24, 42, 24);
    ctx.lineTo(86, 24);
    ctx.quadraticCurveTo(98, 24, 98, 34);
    ctx.lineTo(98, 72);
    ctx.quadraticCurveTo(98, 82, 86, 82);
    ctx.lineTo(58, 82);
    ctx.lineTo(38, 100);
    ctx.lineTo(40, 82);
    ctx.quadraticCurveTo(30, 82, 30, 72);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(52, 53, 4.5, 0, Math.PI * 2);
    ctx.arc(64, 53, 4.5, 0, Math.PI * 2);
    ctx.arc(76, 53, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function useIconTexture(kind: IconKind) {
  return React.useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) drawIcon(ctx, kind);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [kind]);
}

/* ── Orbiting tile ───────────────────────────────────────────── */
function OrbitTile({
  icon,
  angle,
  radius,
  tilt,
  speed,
}: {
  icon: IconKind;
  angle: number;
  radius: number;
  tilt: number;
  speed: number;
}) {
  const group = React.useRef<THREE.Group>(null);
  const texture = useIconTexture(icon);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + angle;
    if (!group.current) return;
    group.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.7) * tilt, Math.sin(t) * radius * 0.55);
    group.current.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <RoundedBox args={[0.52, 0.52, 0.09]} radius={0.12} smoothness={4}>
        <meshPhysicalMaterial
          color="#0B7A55"
          transparent
          opacity={0.34}
          roughness={0.12}
          metalness={0.1}
          transmission={0.85}
          thickness={0.4}
          emissive="#19D68F"
          emissiveIntensity={0.16}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} opacity={0.92} />
      </mesh>
    </group>
  );
}

/* ── The gem ─────────────────────────────────────────────────── */
function Gem({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = React.useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.18;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      pointer.current.y * 0.22,
      0.05,
    );
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pointer.current.x * 0.16, 0.05);
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      pointer.current.y * -0.1,
      0.05,
    );
  });

  return (
    <group ref={group}>
      {/* Outer faceted shell */}
      <mesh castShadow>
        <icosahedronGeometry args={[1.22, 1]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={256}
          thickness={1.1}
          roughness={0.06}
          anisotropy={0.25}
          chromaticAberration={0.42}
          distortion={0.18}
          distortionScale={0.3}
          temporalDistortion={0.06}
          ior={1.62}
          color="#9CFFDF"
          attenuationColor="#0B7A55"
          attenuationDistance={1.6}
          background={new THREE.Color('#05070C')}
        />
      </mesh>

      {/* Emissive core gives the glass something to refract */}
      <mesh scale={0.52}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#19D68F"
          emissive="#19D68F"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>

      {/* Champagne inner facet — the "crown" hint */}
      <mesh scale={0.34} rotation={[0.4, 0.8, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#E9C985"
          emissive="#E9C985"
          emissiveIntensity={1.1}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Wire cage for definition at small sizes */}
      <mesh scale={1.001}>
        <icosahedronGeometry args={[1.22, 1]} />
        <meshBasicMaterial color="#19D68F" wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  );
}

function Rig({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.current.x * 0.5, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.current.y * 0.3, 0.04);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function GemScene({ className }: { className?: string }) {
  const pointer = React.useRef({ x: 0, y: 0 });

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
    };
  };

  return (
    <div className={className} onPointerMove={onPointerMove} onPointerLeave={() => (pointer.current = { x: 0, y: 0 })}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop="always"
      >
        <color attach="background" args={['#05070C']} />
        <fog attach="fog" args={['#05070C', 5, 11]} />

        <ambientLight intensity={0.35} />
        <directionalLight position={[-4, 3, 2]} intensity={2.6} color="#19D68F" />
        <pointLight position={[3.5, -2, 2.5]} intensity={22} color="#E9C985" distance={9} decay={2} />
        <spotLight position={[0, 5, 1]} angle={0.5} penumbra={1} intensity={16} color="#14B8A6" />

        <Float speed={1.3} rotationIntensity={0.18} floatIntensity={0.55}>
          <Gem pointer={pointer} />
        </Float>

        <OrbitTile icon="music" angle={0} radius={2.15} tilt={0.42} speed={0.28} />
        <OrbitTile icon="shield" angle={Math.PI / 2} radius={2.05} tilt={0.55} speed={0.24} />
        <OrbitTile icon="bolt" angle={Math.PI} radius={2.2} tilt={0.36} speed={0.31} />
        <OrbitTile icon="chat" angle={(Math.PI * 3) / 2} radius={2.1} tilt={0.6} speed={0.26} />

        <Rig pointer={pointer} />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.85} luminanceThreshold={0.32} luminanceSmoothing={0.4} mipmapBlur radius={0.65} />
          <Vignette eskil={false} offset={0.28} darkness={0.72} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
