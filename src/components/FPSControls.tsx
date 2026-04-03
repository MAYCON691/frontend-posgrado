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

  // 🔥 NUEVO → joystick cámara
  cameraInput?: { x: number; y: number }
}

export default function DragFPSControls({
  active,
  eyeHeight = 1,
  speed = 3.5,
  runMultiplier = 1.8,
  initialPosition = [-9.5, 1, 2],
  bounds = { minX: -20, maxX: 10, minZ: -15, maxZ: 12 },
  onPositionUpdate,
  cameraInput,
}: DragFPSControlsProps) {
  const { camera, gl } = useThree()

  const pressed = useRef<Record<string, boolean>>({})
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  const yaw = useRef(0)
  const pitch = useRef(0)

  const dir = useMemo(() => new THREE.Vector3(), [])
  const side = useMemo(() => new THREE.Vector3(), [])
  const move = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  // 🔥 INPUT DEL JOYSTICK
  const camInput = useRef({ x: 0, y: 0 })

  // ---------------- INIT ----------------
  useEffect(() => {
    camera.position.set(...initialPosition)
    camera.position.y = eyeHeight

    const look = new THREE.Vector3(-7, 1.2, -3)
      .sub(camera.position)
      .normalize()

    yaw.current = Math.atan2(look.x, look.z)
    pitch.current = Math.asin(look.y)

    applyRotation()
  }, [])

  // ---------------- TECLADO ----------------
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

  // ---------------- MOUSE + TOUCH ----------------
  useEffect(() => {
    const el = gl.domElement as HTMLCanvasElement

    if (!active) {
      dragging.current = false
      el.style.cursor = 'auto'
      return
    }

    const handleRotation = (x: number, y: number) => {
      const dx = x - last.current.x
      const dy = y - last.current.y

      last.current = { x, y }

      const sens = 0.0025

      yaw.current -= dx * sens
      pitch.current -= dy * sens

      const maxPitch = Math.PI / 2 - 0.01
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current))

      applyRotation()
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

    // 📱 TOUCH
    const onTouchStart = (e: TouchEvent) => {
      dragging.current = true
      const t = e.touches[0]
      last.current = { x: t.clientX, y: t.clientY }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return
      const t = e.touches[0]
      handleRotation(t.clientX, t.clientY)
    }

    const onTouchEnd = () => {
      dragging.current = false
    }

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

  // ---------------- ROTACIÓN ----------------
  const applyRotation = () => {
    camera.rotation.set(0, 0, 0)
    camera.rotateY(yaw.current)
    camera.rotateX(pitch.current)
  }

  // ---------------- FRAME ----------------
  useFrame((_, delta) => {
    if (!active) {
      onPositionUpdate?.(camera.position.clone())
      return
    }

    // 🔥 JOYSTICK DE CÁMARA
    if (cameraInput) {
      camInput.current = cameraInput
    }

    const sensJoystick = 0.04

    yaw.current -= camInput.current.x * sensJoystick
    pitch.current -= camInput.current.y * sensJoystick

    const maxPitch = Math.PI / 2 - 0.01
    pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current))

    applyRotation()

    // ---------------- MOVIMIENTO ----------------
    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()

    side.copy(dir).cross(camera.up).normalize()

    move.set(0, 0, 0)

    const forward =
      (pressed.current['KeyW'] ? 1 : 0) -
      (pressed.current['KeyS'] ? 1 : 0)

    const strafe =
      (pressed.current['KeyD'] ? 1 : 0) -
      (pressed.current['KeyA'] ? 1 : 0)

    if (forward) move.add(tmp.copy(dir).multiplyScalar(forward))
    if (strafe) move.add(tmp.copy(side).multiplyScalar(strafe))

    if (move.lengthSq() > 0) move.normalize()

    const v =
      pressed.current['ShiftLeft'] || pressed.current['ShiftRight']
        ? speed * runMultiplier
        : speed

    move.multiplyScalar(v * delta)

    const nextX = THREE.MathUtils.clamp(
      camera.position.x + move.x,
      bounds.minX,
      bounds.maxX
    )

    const nextZ = THREE.MathUtils.clamp(
      camera.position.z + move.z,
      bounds.minZ,
      bounds.maxZ
    )

    camera.position.set(nextX, eyeHeight, nextZ)

    onPositionUpdate?.(camera.position.clone())
  })

  return null
}