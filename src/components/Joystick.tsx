//Joystick.tsx

'use client'

import { useEffect, useRef, useState } from 'react'

interface JoystickProps {
  /** Mostrar/ocultar joystick (úsalo con modoCaminar) */
  active: boolean
  /** Tamaño del joystick en px */
  size?: number
  /** Radio máximo del desplazamiento del “stick” en px */
  radius?: number
  /** Zona muerta (pixels) para no enviar teclas por micro-movimientos */
  deadZone?: number
}

type KeyState = { KeyW: boolean; KeyA: boolean; KeyS: boolean; KeyD: boolean }

export default function Joystick({
  active,
  size = 120,
  radius = 40,
  deadZone = 8,
}: JoystickProps) {
  const [stick, setStick] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragging = useRef(false)
  const center = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const keysRef = useRef<KeyState>({ KeyW: false, KeyA: false, KeyS: false, KeyD: false })
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Utilidades para enviar/retirar teclas
  const sendKey = (code: keyof KeyState, down: boolean) => {
    if (keysRef.current[code] === down) return
    keysRef.current[code] = down
    const type = down ? 'keydown' : 'keyup'
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }))
  }

  const clearKeys = () => {
    ;(['KeyW', 'KeyA', 'KeyS', 'KeyD'] as (keyof KeyState)[]).forEach((c) => sendKey(c, false))
  }

  // Calcula qué teclas presionar según el vector del stick
  const updateKeysFromVector = (vx: number, vy: number) => {
    const mag = Math.hypot(vx, vy)
    if (mag < deadZone) {
      clearKeys()
      return
    }
    const left = vx < -deadZone
    const right = vx > deadZone
    const up = vy < -deadZone
    const down = vy > deadZone
    sendKey('KeyW', up)
    sendKey('KeyS', down)
    sendKey('KeyA', left)
    sendKey('KeyD', right)
  }

  // Handlers
  const start = (x: number, y: number) => {
    dragging.current = true
    center.current = { x, y }
    setStick({ x: 0, y: 0 })
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
    updateKeysFromVector(dx, dy)
  }

  const end = () => {
    dragging.current = false
    setStick({ x: 0, y: 0 })
    clearKeys()
  }

  // Eventos mouse/touch dentro del joystick
  useEffect(() => {
    const el = containerRef.current
    if (!el || !active) return

    // Evita scroll en móvil
    el.style.touchAction = 'none'

    const getPoint = (e: TouchEvent | MouseEvent) => {
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0]
        return { x: t.clientX, y: t.clientY }
      }
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
    }

    const onPointerDown = (e: TouchEvent | MouseEvent) => {
      const p = getPoint(e)
      start(p.x, p.y)
      e.preventDefault()
    }
    const onPointerMove = (e: TouchEvent | MouseEvent) => {
      const p = getPoint(e)
      move(p.x, p.y)
      e.preventDefault()
    }
    const onPointerUp = (e: TouchEvent | MouseEvent) => {
      end()
      e.preventDefault()
    }

    el.addEventListener('mousedown', onPointerDown as any)
    el.addEventListener('mousemove', onPointerMove as any)
    window.addEventListener('mouseup', onPointerUp as any)

    el.addEventListener('touchstart', onPointerDown as any, { passive: false })
    el.addEventListener('touchmove', onPointerMove as any, { passive: false })
    window.addEventListener('touchend', onPointerUp as any)
    window.addEventListener('touchcancel', onPointerUp as any)

    return () => {
      el.removeEventListener('mousedown', onPointerDown as any)
      el.removeEventListener('mousemove', onPointerMove as any)
      window.removeEventListener('mouseup', onPointerUp as any)

      el.removeEventListener('touchstart', onPointerDown as any)
      el.removeEventListener('touchmove', onPointerMove as any)
      window.removeEventListener('touchend', onPointerUp as any)
      window.removeEventListener('touchcancel', onPointerUp as any)
      clearKeys()
    }
  }, [active, radius, deadZone])

  if (!active) return null

  // Estilos
  const outer = size
  const knob = outer / 2.8

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        width: outer,
        height: outer,
        borderRadius: outer,
        background: 'rgba(0,0,0,0.25)',
        border: '2px solid rgba(255,255,255,0.25)',
        zIndex: 9999,
        touchAction: 'none',
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
