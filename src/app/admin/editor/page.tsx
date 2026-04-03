// src/app/admin/editor/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Panorama, Hotspot, HotspotType } from '@/types/backend';

// Evitar SSR con objetos window (PANOLENS/THREE)
const PanolensReady = dynamic(() => Promise.resolve(() => null), { ssr: false });

type Tool = 'select' | 'add-link' | 'add-info' | 'move';

export default function EditorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // ⛔️ Guard: proteger solo para ADMIN
  if (authLoading) {
    return <div style={{ padding: 20, color: '#fff' }}>Verificando sesión…</div>;
  }
  if (!user || user.role !== 'ADMIN') {
    if (typeof window !== 'undefined') alert('No autorizado');
    router.replace('/');
    return null;
  }

  const [panoramas, setPanoramas] = useState<Panorama[]>([]);
  const [current, setCurrent] = useState<Panorama | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Para crear LINK
  const [linkLabel, setLinkLabel] = useState('');
  const [linkSize, setLinkSize] = useState<number>(200);
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  // Para crear INFO
  const [infoTitle, setInfoTitle] = useState('');
  const [infoSubtitle, setInfoSubtitle] = useState('');
  const [infoDescription, setInfoDescription] = useState('');
  const [infoSize, setInfoSize] = useState<number>(220);

  // Refs de Panolens/Three
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const panoRef = useRef<any>(null);
  const threeRef = useRef<any>(null);

  // Mapa local de spots renderizados (idHotspot -> PANOLENS.Infospot)
  const spotMap = useRef<Map<string, any>>(new Map());

  // Helper: cargar script
  function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.body.appendChild(s);
    });
  }

  // Cargar panoramas del backend
  useEffect(() => {
    (async () => {
      try {
        const pans = await api.get<Panorama[]>('/panoramas');
        setPanoramas(pans);
        setCurrent(pans[0] ?? null);
      } catch (e: any) {
        setStatus(e.message || 'Error cargando panoramas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Inicializa visor cuando hay contenedor y panorama actual
  useEffect(() => {
    if (!containerRef.current || !current) return;

    // ✅ Congelamos valores no nulos para todo el efecto
    const panoId = current.id;
    const panoFile = current.fileUrl;

    let disposed = false;
    let innerCleanup: (() => void) | undefined;

    (async () => {
      setStatus('Cargando visor…');

      // ✅ Cargar THREE **legacy** global solo para Panolens
      if (!(window as any).THREE) {
        await loadScript('/lib/three-legacy.min.js'); // por ej. three r121 (UMD)
      }
      threeRef.current = (window as any).THREE;

      // ✅ Cargar Panolens desde /public/lib/panolens.min.js
      if (!(window as any).PANOLENS) {
        await loadScript('/lib/panolens.min.js');
      }

      if (disposed) return;

      const PANOLENS = (window as any).PANOLENS;
      const viewer = new PANOLENS.Viewer({
        container: containerRef.current!,
        controlBar: true,
        autoRotate: false,
        output: 'overlay',
      });
      viewerRef.current = viewer;

      // Panorama actual
      const pano = new PANOLENS.ImagePanorama(panoFile);
      panoRef.current = pano;
      viewer.add(pano);
      viewer.setPanorama(pano);

      pano.addEventListener('enter', () => {
        // limpiar spots previos si cambiamos de panorama
        for (const [, s] of spotMap.current) pano.remove(s);
        spotMap.current.clear();
      });

      // Handler de click (crear/mover)
      const onViewerClick = async (e: any) => {
        const world = e?.intersection?.point;
        if (!world || !panoRef.current) return;

        // Coordenadas locales y separación contra z-fighting
        const local = panoRef.current.worldToLocal(world.clone());
        const len = local.length();
        local.setLength(len - 30);

        if (tool === 'add-link') {
          if (!linkTargetId) {
            alert('Selecciona “Panorama destino” antes de colocar el LINK.');
            return;
          }
          try {
            const body = {
              type: 'LINK' as HotspotType,
              label: linkLabel || 'Ir',
              size: linkSize,
              x: +local.x.toFixed(2),
              y: +local.y.toFixed(2),
              z: +local.z.toFixed(2),
              toPanoramaId: linkTargetId,
              panoramaId: panoId, // ✅ congelado
            };
            const hs = await api.post<Hotspot>('/hotspots', body);
            await renderHotspot(hs);
            setHotspots((prev) => [...prev, hs]);
          } catch (err: any) {
            alert(err.message || 'Error creando LINK');
          }
        }

        if (tool === 'add-info') {
          try {
            const body = {
              type: 'INFO' as HotspotType,
              label: infoTitle || 'Info',
              size: infoSize,
              x: +local.x.toFixed(2),
              y: +local.y.toFixed(2),
              z: +local.z.toFixed(2),
              infoTitle,
              infoSubtitle,
              infoDescription,
              panoramaId: panoId, // ✅ congelado
            };
            const hs = await api.post<Hotspot>('/hotspots', body);
            await renderHotspot(hs);
            setHotspots((prev) => [...prev, hs]);
          } catch (err: any) {
            alert(err.message || 'Error creando INFO');
          }
        }
      };

      viewer.addEventListener('click', onViewerClick);

      // Hotkeys (s/l/i)
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 's') setTool('select');
        if (ev.key === 'l') setTool('add-link');
        if (ev.key === 'i') setTool('add-info');
      };
      window.addEventListener('keydown', onKey);

      // Hotspots existentes (✅ usando panoId)
      const existing = await api.get<Hotspot[]>(`/hotspots?panoramaId=${panoId}`);
      setHotspots(existing);
      for (const hs of existing) await renderHotspot(hs);

      setStatus('');

      // Guardamos cleanup real
      innerCleanup = () => {
        try {
          viewer.removeEventListener('click', onViewerClick);
          window.removeEventListener('keydown', onKey);
        } catch {}
      };
    })();

    // Limpieza del efecto
    return () => {
      disposed = true;
      try {
        innerCleanup?.();
        for (const [, s] of spotMap.current) panoRef.current?.remove?.(s);
        spotMap.current.clear();
        viewerRef.current?.dispose?.();
      } catch {}
      viewerRef.current = null;
      panoRef.current = null;
    };
  }, [
    current,
    tool,
    linkLabel,
    linkSize,
    linkTargetId,
    infoTitle,
    infoSubtitle,
    infoDescription,
    infoSize,
  ]);

  // Renderiza un hotspot (BD -> visor)
  const renderHotspot = async (hs: Hotspot) => {
    const PANOLENS = (window as any).PANOLENS;
    const THREE = threeRef.current;
    const pano = panoRef.current;
    if (!PANOLENS || !THREE || !pano) return;

    const size = hs.size ?? 200;
    const icon = hs.type === 'LINK' ? PANOLENS.DataImage.Arrow : PANOLENS.DataImage.Info;

    const spot = new PANOLENS.Infospot(size, icon);

    // Posición local con separación anti z-fighting
    const v = new THREE.Vector3(hs.x, hs.y, hs.z);
    v.setLength(v.length() - 30);
    spot.position.copy(v);

    // Más defensa contra z-fighting
    if (spot.material) {
      spot.material.depthTest = false;
      spot.material.depthWrite = false;
    }
    spot.renderOrder = 9999;

    // Hover
    if (hs.type === 'LINK') spot.addHoverText(hs.label || 'Ir', 18);
    if (hs.type === 'INFO') spot.addHoverText(hs.infoTitle || hs.label || 'Info', 18);

    // Click en el spot
    spot.addEventListener('click', async () => {
      // Seleccionar: eliminar o navegar / mostrar info
      if (tool === 'select') {
        // LINK: navegar
        if (hs.type === 'LINK' && hs.toPanoramaId) {
          const dest = panoramas.find((p) => p.id === hs.toPanoramaId);
          if (dest) setCurrent(dest);
          return;
        }
        // INFO: panel simple
        if (hs.type === 'INFO') {
          alert(
            `${hs.infoTitle ?? hs.label ?? 'Información'}\n\n` +
              (hs.infoSubtitle ? hs.infoSubtitle + '\n' : '') +
              (hs.infoDescription || '')
          );
          return;
        }

        // Eliminar
        const want = confirm('¿Eliminar este hotspot?');
        if (want) {
          try {
            await api.del(`/hotspots/${hs.id}`);
            pano.remove(spot);
            spotMap.current.delete(hs.id);
            setHotspots((prev) => prev.filter((h) => h.id !== hs.id));
          } catch (err: any) {
            alert(err.message || 'No se pudo eliminar');
          }
        }
        return;
      }

      // Modo mover: clic al spot, luego clic al nuevo lugar
      if (tool === 'move') {
        setStatus('Clic en el nuevo punto para reubicar…');

        const once = async (e: any) => {
          const world = e?.intersection?.point;
          if (!world) return;
          const local = pano.worldToLocal(world.clone());
          const len = local.length();
          local.setLength(len - 30);

          try {
            const upd = await api.put<Hotspot>(`/hotspots/${hs.id}`, {
              x: +local.x.toFixed(2),
              y: +local.y.toFixed(2),
              z: +local.z.toFixed(2),
            });

            const nv = new threeRef.current.Vector3(upd.x, upd.y, upd.z);
            nv.setLength(nv.length() - 30);
            spot.position.copy(nv);

            setHotspots((prev) => prev.map((h) => (h.id === upd.id ? upd : h)));
          } catch (err: any) {
            alert(err.message || 'Error moviendo hotspot');
          } finally {
            setStatus('');
            viewerRef.current?.removeEventListener?.('click', once);
            setTool('select');
          }
        };

        viewerRef.current?.addEventListener?.('click', once);
      }
    });

    pano.add(spot);
    spotMap.current.set(hs.id, spot);
  };

  // UI: barra de herramientas
  const toolbar = useMemo(
    () => (
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10_000,
          display: 'grid',
          gap: 10,
          background: 'rgba(0,0,0,.55)',
          padding: 12,
          borderRadius: 12,
          color: '#eaf6ff',
          minWidth: 280,
        }}
      >
        <div style={{ fontWeight: 800 }}>Editor 360°</div>

        {/* Selector de panorama */}
        <label style={{ fontSize: 13, opacity: 0.9 }}>Panorama</label>
        <select
          value={current?.id ?? ''}
          onChange={(e) => setCurrent(panoramas.find((p) => p.id === e.target.value) || null)}
          style={{ padding: 8, borderRadius: 8 }}
        >
          {panoramas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* Herramientas */}
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            onClick={() => setTool('select')}
            style={{ ...btn, background: tool === 'select' ? '#0ea5e9' : '#1f2937' }}
          >
            Seleccionar / Navegar (S)
          </button>
          <button
            onClick={() => setTool('move')}
            style={{ ...btn, background: tool === 'move' ? '#0ea5e9' : '#1f2937' }}
          >
            Mover hotspot (clic al hotspot y luego al nuevo punto)
          </button>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* Crear LINK */}
        <div style={{ fontWeight: 700 }}>Nuevo LINK (flecha)</div>
        <div style={{ display: 'grid', gap: 6 }}>
          <input
            placeholder="Etiqueta (opcional)"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            style={inp}
          />
          <select
            value={linkTargetId}
            onChange={(e) => setLinkTargetId(e.target.value)}
            style={inp}
          >
            <option value="">— Panorama destino —</option>
            {panoramas
              .filter((p) => p.id !== current?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
          <input
            type="number"
            min={100}
            max={600}
            step={10}
            value={linkSize}
            onChange={(e) => setLinkSize(Number(e.target.value))}
            style={inp}
            placeholder="Tamaño (px)"
          />
          <button
            onClick={() => setTool('add-link')}
            style={{ ...btn, background: tool === 'add-link' ? '#0ea5e9' : '#1f2937' }}
          >
            Colocar LINK (L) y click en el panorama
          </button>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* Crear INFO */}
        <div style={{ fontWeight: 700 }}>Nuevo INFO</div>
        <div style={{ display: 'grid', gap: 6 }}>
          <input placeholder="Título" value={infoTitle} onChange={(e) => setInfoTitle(e.target.value)} style={inp} />
          <input
            placeholder="Subtítulo (opcional)"
            value={infoSubtitle}
            onChange={(e) => setInfoSubtitle(e.target.value)}
            style={inp}
          />
          <textarea
            placeholder="Descripción"
            value={infoDescription}
            onChange={(e) => setInfoDescription(e.target.value)}
            style={{ ...inp, height: 70 }}
          />
          <input
            type="number"
            min={100}
            max={600}
            step={10}
            value={infoSize}
            onChange={(e) => setInfoSize(Number(e.target.value))}
            style={inp}
            placeholder="Tamaño (px)"
          />
          <button
            onClick={() => setTool('add-info')}
            style={{ ...btn, background: tool === 'add-info' ? '#0ea5e9' : '#1f2937' }}
          >
            Colocar INFO (I) y click en el panorama
          </button>
        </div>

        {!!status && <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div>}
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Consejos: usa S/L/I para cambiar de herramienta. Con “Seleccionar” puedes navegar por los links. Con “Mover”
          haz click al hotspot y luego al nuevo punto.
        </div>
      </div>
    ),
    [panoramas, current, tool, linkLabel, linkSize, linkTargetId, infoTitle, infoSubtitle, infoDescription, infoSize, status]
  );

  if (loading) return <div style={{ padding: 20 }}>Cargando…</div>;
  if (!current) return <div style={{ padding: 20 }}>No hay panoramas publicados.</div>;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {toolbar}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <PanolensReady />
    </div>
  );
}

/* Estilos base de inputs/botones (simple) */
const inp: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.04)',
  color: '#eaf6ff',
};

const btn: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  cursor: 'pointer',
};
