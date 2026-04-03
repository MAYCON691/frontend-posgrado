// src/components/Vista360.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Vec3 = [number, number, number]

type InfoDetail = {
  title: string
  subtitle?: string
  description?: string
  image?: string
  fields?: Array<{ label: string; value: string; href?: string }>
}

type SceneConfig = {
  arrows: Array<{ to: string; position: Vec3; size?: number; label?: string }>
  infos?: Array<{ position: Vec3; size?: number; text: string; detail?: InfoDetail }>
}

/** Config de escenas (ajusta a tus JPGs en /public) */
const SCENES: Record<string, SceneConfig> = {
  ASENSOR: {
    arrows: (() => {
      const baseX = 1100, baseZ = -200, baseY = -800, gapY = 150, size = 150
      const positions: Vec3[] = [
        [baseX, baseY + 0 * gapY, baseZ],
        [baseX, baseY + 1 * gapY, baseZ],
        [baseX, baseY + 2 * gapY, baseZ],
        [baseX, baseY + 3 * gapY, baseZ],
        [baseX, baseY + 4 * gapY, baseZ],
      ]
      const floors = ['PISO_1', 'PISO_2', 'PISO_3', 'PISO_4', 'PISO_5'] as const
      return floors.map((to, i) => ({ to, position: positions[i], size, label: `Ir a ${to.replace('_', ' ')}` }))
    })(),
  },
  PISO_1: {
    arrows: [{ to: 'ASENSOR', position: [-4860, -80, -1180], size: 700, label: 'Entrar en ASENSOR' }],
    infos: [
      {
        position: [-1200, -60, -1180],
        size: 260,
        text: 'Recepción',
        detail: {
          title: 'Recepción – Posgrado UPEA',
          subtitle: 'Atención al estudiante y público',
          description: 'Punto de información, ingreso de trámites y derivación a oficinas.',
          image: '/recepcion.jpg',
          fields: [
            { label: 'Encargado(a)', value: 'Lic. Wendy Condori' },
            { label: 'Cargo', value: 'Responsable de Recepción' },
            { label: 'Horario', value: 'Lun–Vie 08:30–16:30' },
            { label: 'Teléfono', value: '+591 700-00000', href: 'tel:+59170000000' },
            { label: 'Email', value: 'recepcion.posgrado@upea.edu.bo', href: 'mailto:recepcion.posgrado@upea.edu.bo' },
            { label: 'Ubicación', value: 'Planta Baja, ingreso principal' },
          ],
        },
      },
    ],
  },
  PISO_2: { arrows: [{ to: 'ASENSOR', position: [0, 0, -1200], size: 200, label: 'Entrar en ASENSOR' }] },
  PISO_3: { arrows: [{ to: 'ASENSOR', position: [0, 0, -1200], size: 200, label: 'Entrar en ASENSOR' }] },
  PISO_4: { arrows: [{ to: 'ASENSOR', position: [0, 0, -1200], size: 200, label: 'Entrar en ASENSOR' }] },
  PISO_5: { arrows: [{ to: 'ASENSOR', position: [0, 0, -1200], size: 200, label: 'Entrar en ASENSOR' }] },
}

interface Vista360Props {
  /** <- NUEVO: si está en true se muestra; si es false se oculta pero NO se desmonta */
  open: boolean
  onClose: () => void
}

export default function Vista360({ open, onClose }: Vista360Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [infoPanel, setInfoPanel] = useState<InfoDetail | null>(null)

  // refs internos para conservar el visor entre aperturas
  const viewerRef = useRef<any>(null)
  const pansRef = useRef<Record<string, any>>({})
  const initialized = useRef(false)

  // Carga librerías legacy sólo la 1ra vez que se abre
  useEffect(() => {
    if (!open || initialized.current || !containerRef.current) return

    let cancelled = false

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const el = document.createElement('script')
        el.src = src
        el.async = true
        el.onload = () => resolve()
        el.onerror = () => reject(new Error('No se pudo cargar ' + src))
        document.body.appendChild(el)
      })

    ;(async () => {
      try {
        // Si no existe PANOLENS en window, carga legacy three + panolens desde /public/lib
        if (!(window as any).PANOLENS) {
          if (!(window as any).THREE) {
            await loadScript('/lib/three-legacy.min.js')
          }
          await loadScript('/lib/panolens.min.js')
        }
        if (cancelled) return

        const PANOLENS = (window as any).PANOLENS
        const viewer = new PANOLENS.Viewer({
          container: containerRef.current!,
          autoRotate: false,
          cameraFov: 75,
          controlBar: true,
          output: 'console',
        })
        viewerRef.current = viewer

        const getPanorama = (name: string) => {
          if (pansRef.current[name]) return pansRef.current[name]
          const pano = new PANOLENS.ImagePanorama(`/${name}.jpg`)

          pano.addEventListener('click', (e: any) => {
            const p = e?.intersection?.point
            if (p) console.log(`[${name}] click:`, p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2))
          })

          const cfg = SCENES[name]
          if (cfg?.arrows?.length) {
            cfg.arrows.forEach(({ to, position, size = 160, label }) => {
              const arrow = new PANOLENS.Infospot(size, PANOLENS.DataImage.Arrow)
              arrow.position.set(...position)
              if (label) arrow.addHoverText(label, 24)
              arrow.addEventListener('click', () => {
                const next = getPanorama(to)
                viewer.setPanorama(next)
              })
              pano.add(arrow)
            })
          }

          if (cfg?.infos?.length) {
            cfg.infos.forEach(({ position, size = 200, text, detail }) => {
              const info = new PANOLENS.Infospot(size, PANOLENS.DataImage.Info)
              info.position.set(...position)
              info.addHoverText(text, 24)
              info.addEventListener('click', () => detail && setInfoPanel(detail))
              pano.add(info)
            })
          }

          pansRef.current[name] = pano
          return pano
        }

        // panorama inicial
        const start = getPanorama('PISO_1')
        viewer.add(start)
        viewer.setPanorama(start)

        // precarga
        ;['ASENSOR', 'PISO_2', 'PISO_3', 'PISO_4', 'PISO_5'].forEach((n) => viewer.add(getPanorama(n)))

        initialized.current = true
      } catch (err) {
        console.error(err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <div
      // ✅ no desmontamos: sólo ocultamos cuando open = false
      style={{
        display: open ? 'block' : 'none',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Botón cerrar 360 */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 80,
          right: 20,
          zIndex: 10000,
          backgroundColor: '#05d5ff',
          color: '#000',
          padding: '10px 15px',
          borderRadius: '8px',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        CERRAR VISTA 360°
      </button>

      {/* Panel de información */}
      {infoPanel && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: 16,
          }}
          onClick={() => setInfoPanel(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 92vw)',
              background: 'rgba(15,15,20,0.95)',
              color: '#eaf6ff',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 18px',
                background: 'linear-gradient(135deg,#0ea5e9 0%,#2563eb 60%)',
                color: 'white',
              }}
            >
              {infoPanel.image && (
                <img
                  src={infoPanel.image}
                  alt="Foto"
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 12,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                    border: '2px solid rgba(255,255,255,0.6)',
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{infoPanel.title}</div>
                {infoPanel.subtitle && <div style={{ opacity: 0.95, fontSize: 14 }}>{infoPanel.subtitle}</div>}
              </div>
              <button
                onClick={() => setInfoPanel(null)}
                aria-label="Cerrar"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  borderRadius: 8,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              {infoPanel.description && <p style={{ margin: 0, color: '#c7e8ff' }}>{infoPanel.description}</p>}
              {infoPanel.fields?.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {infoPanel.fields.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{f.label}</div>
                      {f.href ? (
                        <a href={f.href} style={{ color: '#7dd3fc', fontWeight: 700, textDecoration: 'none' }}>
                          {f.value}
                        </a>
                      ) : (
                        <div style={{ fontWeight: 700 }}>{f.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 16px 16px' }}>
              {infoPanel.fields?.some((f) => f.href?.startsWith('tel:')) && (
                <a
                  href={infoPanel.fields.find((f) => f.href?.startsWith('tel:'))?.href}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    padding: '10px 14px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  Llamar
                </a>
              )}
              {infoPanel.fields?.some((f) => f.href?.startsWith('mailto:')) && (
                <a
                  href={infoPanel.fields.find((f) => f.href?.startsWith('mailto:'))?.href}
                  style={{
                    background: '#6366f1',
                    color: 'white',
                    padding: '10px 14px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  Enviar correo
                </a>
              )}
              <button
                onClick={() => setInfoPanel(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
