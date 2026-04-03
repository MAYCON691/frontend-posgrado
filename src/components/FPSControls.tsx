//FPSControl
'use client'

import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

type Vec3 = [number, number, number]

interface DragFPSControlsProps {
  active: boolean
  eyeHeight?: number
  speed?: number
  runMultiplier?: number
  initialPosition?: Vec3
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }
  onPositionUpdate?: (pos: THREE.Vector3) => void
}

export default function DragFPSControls({
  active,
  eyeHeight = 1,                 // ⬅️ altura de cámara más baja
  speed = 3.5,
  runMultiplier = 1.8,
  initialPosition = [-9.5, 1, 2], // ⬅️ misma Y que eyeHeight
  bounds = { minX: -20, maxX: 10, minZ: -15, maxZ: 12 },
  onPositionUpdate,
}: DragFPSControlsProps) {
  const { camera, gl } = useThree()
  const pressed = useRef<Record<string, boolean>>({})
  const dragging = useRef(false)
  const last = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const yaw = useRef(0)
  const pitch = useRef(0)
  const dir = useMemo(() => new THREE.Vector3(), [])
  const side = useMemo(() => new THREE.Vector3(), [])
  const move = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  // Inicializa posición/rotación
  useEffect(() => {
    camera.position.set(...initialPosition)
    camera.position.y = eyeHeight
    const look = new THREE.Vector3(-7, 1.2, -3).sub(camera.position).normalize()
    yaw.current = Math.atan2(look.x, look.z)
    pitch.current = Math.asin(look.y)
    applyRotation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => (pressed.current[e.code] = true)
    const up = (e: KeyboardEvent) => (pressed.current[e.code] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Mouse (clic derecho) mientras active === true
 useEffect(() => {
  const el = gl.domElement as HTMLCanvasElement

  if (!active) {
    dragging.current = false
    el.style.cursor = 'auto'
    return
  }

  // 🖱️ MOUSE
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    el.style.cursor = 'grabbing'
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return
    handleRotation(e.clientX, e.clientY)
  }

  const onMouseUp = () => {
    dragging.current = false
    el.style.cursor = 'auto'
  }

  // 📱 TOUCH (AQUÍ ESTÁ LA MAGIA)
  const onTouchStart = (e: TouchEvent) => {
    dragging.current = true
    const touch = e.touches[0]
    last.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!dragging.current) return
    const touch = e.touches[0]
    handleRotation(touch.clientX, touch.clientY)
  }

  const onTouchEnd = () => {
    dragging.current = false
  }

  // 🎯 Función compartida
  const handleRotation = (x: number, y: number) => {
    const dx = x - last.current.x
    const dy = y - last.current.y
    last.current = { x, y }

    const sensX = 0.0025
    const sensY = 0.0025

    yaw.current -= dx * sensX
    pitch.current -= dy * sensY

    const maxPitch = Math.PI / 2 - 0.01
    pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current))

    applyRotation()
  }

  // LISTENERS
  el.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  el.addEventListener('touchstart', onTouchStart)
  el.addEventListener('touchmove', onTouchMove)
  el.addEventListener('touchend', onTouchEnd)

  return () => {
    el.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  }
}, [active])
  const applyRotation = () => {
    camera.rotation.set(0, 0, 0)
    camera.rotateY(yaw.current)
    camera.rotateX(pitch.current)
  }

  useFrame((_, delta) => {
    if (!active) {
      onPositionUpdate?.(camera.position.clone())
      return
    }

    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()
    side.copy(dir).cross(camera.up).normalize()

    move.set(0, 0, 0)
    const forward = (pressed.current['KeyW'] ? 1 : 0) - (pressed.current['KeyS'] ? 1 : 0)
    const strafe  = (pressed.current['KeyD'] ? 1 : 0) - (pressed.current['KeyA'] ? 1 : 0)
    if (forward) move.add(tmp.copy(dir).multiplyScalar(forward))
    if (strafe)  move.add(tmp.copy(side).multiplyScalar(strafe))
    if (move.lengthSq() > 0) move.normalize()

    const v = (pressed.current['ShiftLeft'] || pressed.current['ShiftRight'])
      ? speed * runMultiplier
      : speed

    move.multiplyScalar(v * delta)

    const nextX = THREE.MathUtils.clamp(camera.position.x + move.x, bounds.minX, bounds.maxX)
    const nextZ = THREE.MathUtils.clamp(camera.position.z + move.z, bounds.minZ, bounds.maxZ)
    camera.position.set(nextX, eyeHeight, nextZ)

    onPositionUpdate?.(camera.position.clone())
  })

  return null
}
