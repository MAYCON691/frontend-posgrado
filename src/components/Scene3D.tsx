//Scene3D.tsx
'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Sky } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import Hotspot from '../components/Hostpot'
import Vista360 from './Vista360'
import Header from './Header'
import Loader3D from '../components/Loader3D'
import FPSControls from '../components/FPSControls'
import Joystick from './Joystick'

function Modelo3D() {
  const gltf = useGLTF('/tour-posgrado.glb')
  return <primitive object={gltf.scene} scale={1} />
}

/** Animación de intro al cargar la página */
function IntroCameraAnimation({ onFinish }: { onFinish: () => void }) {
  const { camera } = useThree()
  const start = useRef(new THREE.Vector3(-10, 8, 10))
  const end = useRef(new THREE.Vector3(-9.5, 1.0, 2.0))
  const progress = useRef(0)

  useFrame(() => {
    if (progress.current < 1) {
      progress.current += 0.01
      camera.position.lerpVectors(start.current, end.current, progress.current)
      camera.lookAt(-7, 1.0, -3)
    } else {
      onFinish()
    }
  })

  return null
}

/** Animación genérica para volar de A a B (usada al entrar a Virtual 3D) */
function WalkInAnimation({
  from,
  to,
  onFinish,
}: {
  from: THREE.Vector3
  to: THREE.Vector3
  onFinish: () => void
}) {
  const { camera } = useThree()
  const t = useRef(0)

  useFrame(() => {
    if (t.current < 1) {
      t.current += 0.004
      camera.position.lerpVectors(from, to, t.current)
      camera.lookAt(-7, 1.0, -3)
    } else {
      camera.position.set(to.x, to.y, to.z)
      onFinish()
    }
  })

  return null
}

function AnimatedCamera({
  target,
  onUpdate,
}: {
  target: THREE.Vector3 | null
  onUpdate: (pos: THREE.Vector3) => void
}) {
  const { camera } = useThree()
  useFrame(() => {
    if (target) {
      camera.position.lerp(target, 0.05)
      camera.lookAt(-7, 1.0, -3)
    }
    onUpdate(camera.position.clone())
  })
  return null
}

export default function Scene3D() {
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [camPos, setCamPos] = useState<THREE.Vector3 | null>(null)
  const [mostrar360, setMostrar360] = useState(false)
  const [modoCaminar, setModoCaminar] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [modoNoche, setModoNoche] = useState(false)

  /** ⬇️ Configura aquí el vuelo al entrar a Virtual 3D */
  const WALK_START = useRef(new THREE.Vector3(-15, 12, 12))
  const WALK_END   = useRef(new THREE.Vector3(-0.95, 1.0, -3.10))

  const [walkAnim, setWalkAnim] = useState(false)

  const releasePointer = () => {
    if (document.pointerLockElement) document.exitPointerLock?.()
    document.body.style.cursor = 'auto'
  }

  const irATourPosgrado = () => {
    releasePointer()
    setModoCaminar(false)
    setWalkAnim(false)
    setTargetPos(new THREE.Vector3(-9.86, 1.0, -3.78))
    setShowControls(true)
  }

  const volverAlInicio = () => {
    releasePointer()
    setModoCaminar(false)
    setWalkAnim(false)
    setTargetPos(null)
    setShowControls(false)
  }

  /** Al pulsar Virtual 3D: volamos de WALK_START a WALK_END y luego habilitamos caminar */
  const activarCaminar = () => {
    releasePointer()
    setShowControls(false)
    setTargetPos(null)
    setModoCaminar(false)
    setWalkAnim(true)
  }

  // Suelta el puntero cuando NO caminamos o abrimos la 360
  useEffect(() => {
    if (!modoCaminar || mostrar360) releasePointer()
  }, [modoCaminar, mostrar360])

  return (
    <>
      {cargando && <Loader3D />}

      <Header
        onInicio={volverAlInicio}
        onCaminar={activarCaminar}
        onTourPosgrado={irATourPosgrado}
        modoNoche={modoNoche}
        toggleModoNoche={() => setModoNoche(!modoNoche)}
      />

      {/* Joystick táctil visible sólo en modo caminar */}
      <Joystick active={modoCaminar} size={128} radius={44} deadZone={10} />

      {camPos && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 15,
            background: 'rgba(0,0,0,0.6)',
            color: '#00ccff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            zIndex: 999,
          }}
        >
          x: {camPos.x.toFixed(2)}<br />
          y: {camPos.y.toFixed(2)}<br />
          z: {camPos.z.toFixed(2)}
        </div>
      )}

      {/* ✅ Vista360 siempre montado; se muestra/oculta con CSS */}
      <Vista360
        open={mostrar360}
        onClose={() => {
          releasePointer()
          setMostrar360(false)
        }}
      />

      {/* Oculta el Canvas sólo cuando esté abierta la 360 */}
      {!mostrar360 && (
        <Canvas
          camera={{ position: [-10, 8, 10], fov: 60 }}
          onCreated={({ scene }) => {
            scene.fog = new THREE.Fog('#ffffff', 100, 300)
            setTimeout(() => setCargando(false), 1000)
          }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[15, 10, 5]} />
          <Environment preset="sunset" />
          <Sky
            distance={450000}
            sunPosition={modoNoche ? [-100, -100, -100] : [100, 20, 100]}
            inclination={0.49}
            azimuth={0.25}
          />

          <Modelo3D />

          {/* Intro al cargar, SOLO cuando no caminamos */}
          {!modoCaminar && !showControls && !walkAnim && (
            <IntroCameraAnimation onFinish={() => setShowControls(true)} />
          )}

          {/* Animación para mover la cámara al entrar a Virtual 3D */}
          {walkAnim && (
            <WalkInAnimation
              from={WALK_START.current}
              to={WALK_END.current}
              onFinish={() => {
                setWalkAnim(false)
                setModoCaminar(true)
              }}
            />
          )}

          {/* Cámara animada hacia puntos (botón Tour Posgrado) */}
          {!modoCaminar && !walkAnim && (
            <AnimatedCamera
              target={targetPos}
              onUpdate={(pos) => setCamPos(pos)}
            />
          )}

          {/* ORBIT solo cuando exploramos sin caminar ni animación de entrada */}
          {showControls && !modoCaminar && !walkAnim && (
            <OrbitControls
              target={[-7, 1.0, -3]}
              minPolarAngle={Math.PI / 2}
              maxPolarAngle={Math.PI / 2.05}
              enablePan={false}
              enableZoom={true}
              minDistance={1}
              maxDistance={30}
            />
          )}

          {/* Modo caminar FPS (sin pointer lock) */}
          <FPSControls
            active={modoCaminar}
            eyeHeight={0.3}
            initialPosition={[-9.5, 0.3, 2]}
            speed={3.5}
            runMultiplier={1.8}
            bounds={{ minX: -20, maxX: 10, minZ: -15, maxZ: 12 }}
            onPositionUpdate={(pos) => setCamPos(pos)}
          />

          {/* Hotspots visibles solo si NO caminamos y NO estamos en animación */}
          {!modoCaminar && !walkAnim && (
            <>
              <Hotspot
                position={[-6.3975, 2.0025, -3.0]}
                label="BIENVENIDOS A POSGRADO"
                onClick={irATourPosgrado}
              />
              <Hotspot
                position={[-7.3975, 0.0025, -3.2]}
                label="Entrar a posgrado"
                onClick={() => {
                  releasePointer()
                  setMostrar360(true)
                }}
              />
            </>
          )}
        </Canvas>
      )}
    </>
  )
}
