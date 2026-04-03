'use client'

import { useEffect, useRef, useState } from 'react'

interface CameraJoystickProps {
  active: boolean
  size?: number
  radius?: number
  onMove?: (dx: number, dy: number) => void
}

export default function CameraJoystick({
  active,
  size = 120,
  radius = 40,
  onMove,
}: CameraJoystickProps) {
  const [stick, setStick] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const center = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)

  const start = (x: number, y: number) => {
    dragging.current = true
    center.current = { x, y }
  }

  const move = (x: number, y: number) => {
    if (!dragging.current) return

    let dx = x - center.current.x
    let dy = y - center.current.y

    const mag = Math.hypot(dx, dy)
    if (mag > radius) {
      const k = radius / mag
      dx *= k
      dy *= k
    }

    setStick({ x: dx, y: dy })

    // 🔥 ENVÍA MOVIMIENTO DE CÁMARA
    onMove?.(dx / radius, dy / radius)
  }

  const end = () => {
    dragging.current = false
    setStick({ x: 0, y: 0 })
    onMove?.(0, 0)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el || !active) return

    el.style.touchAction = 'none'

    const getPoint = (e: any) => {
      if (e.touches) {
        const t = e.touches[0]
        return { x: t.clientX, y: t.clientY }
      }
      return { x: e.clientX, y: e.clientY }
    }

    const down = (e: any) => {
      const p = getPoint(e)
      start(p.x, p.y)
    }

    const moveEv = (e: any) => {
      const p = getPoint(e)
      move(p.x, p.y)
    }

    const up = () => end()

    el.addEventListener('mousedown', down)
    el.addEventListener('mousemove', moveEv)
    window.addEventListener('mouseup', up)

    el.addEventListener('touchstart', down, { passive: false })
    el.addEventListener('touchmove', moveEv, { passive: false })
    window.addEventListener('touchend', up)

    return () => {
      el.removeEventListener('mousedown', down)
      el.removeEventListener('mousemove', moveEv)
      window.removeEventListener('mouseup', up)

      el.removeEventListener('touchstart', down)
      el.removeEventListener('touchmove', moveEv)
      window.removeEventListener('touchend', up)
    }
  }, [active])

  if (!active) return null

  const outer = size
  const knob = outer / 2.8

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        right: 16, // 🔴 lado derecho
        bottom: 16,
        width: outer,
        height: outer,
        borderRadius: outer,
        background: 'rgba(0,0,0,0.25)',
        border: '2px solid rgba(255,255,255,0.25)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: outer / 2 + stick.x - knob / 2,
          top: outer / 2 + stick.y - knob / 2,
          width: knob,
          height: knob,
          borderRadius: knob,
          background: 'rgba(255,255,255,0.85)',
        }}
      />
    </div>
  )
}