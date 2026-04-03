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

    const preventMenu = (e: MouseEvent) => e.preventDefault()
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return // botón derecho
      dragging.current = true
      last.current = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }

      const sensX = 0.0025
      const sensY = 0.0025
      // (arrastre invertido como lo dejaste)
      yaw.current -= dx * sensX
      pitch.current -= dy * sensY

      const maxPitch = Math.PI / 2 - 0.01
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current))

      applyRotation()
    }
    const onUp = () => {
      dragging.current = false
      el.style.cursor = 'auto'
    }

    el.addEventListener('contextmenu', preventMenu)
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      el.removeEventListener('contextmenu', preventMenu)
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      el.style.cursor = 'auto'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
