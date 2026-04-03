// src/components/Header.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onInicio: () => void;
  onCaminar: () => void;
  onTourPosgrado: () => void;
  modoNoche: boolean;
  toggleModoNoche: () => void;
}

export default function Header({
  onInicio,
  onCaminar,
  onTourPosgrado,
  modoNoche,
  toggleModoNoche,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const [openLogin, setOpenLogin] = useState(false);
  const router = useRouter();

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          padding: '14px 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: '#fff',
          zIndex: 10000,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* LOGO Y TÍTULO */}
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
          <span style={{ color: 'white' }}>POSGRADO </span>
          <span style={{ color: '#00ccff' }}>UPEA VIRTUAL</span>
        </div>

        {/* NAVEGACIÓN */}
        <nav style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <button
            onClick={onInicio}
            style={{
              background: 'transparent',
              color: '#ffcc00',
              fontWeight: 'bold',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Inicio
          </button>

          <button
            onClick={onCaminar}
            style={{
              background: 'transparent',
              color: '#fff',
              fontWeight: 'bold',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Virtual 3D
          </button>

          <button
            onClick={onTourPosgrado}
            style={{
              background: 'linear-gradient(to right, #007bff, #0056d2)',
              color: '#fff',
              fontWeight: 'bold',
              padding: '10px 18px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(0px)';
              el.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
            }}
          >
            <span style={{ transition: 'transform 0.3s ease' }}>→</span>
            <span style={{ fontWeight: 'bold' }}>TOUR POSGRADO</span>
          </button>

          {/* Switch noche */}
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: 8 }}>
            <input type="checkbox" checked={modoNoche} onChange={toggleModoNoche} style={{ display: 'none' }} />
            <div
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '14px',
                background: modoNoche ? '#444' : '#007bff',
                padding: '2px',
                boxShadow: '0 0 0 2px #007bff',
                display: 'flex',
                alignItems: 'center',
                transition: '0.3s ease',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  background: 'white',
                  borderRadius: '50%',
                  transform: modoNoche ? 'translateX(22px)' : 'translateX(0)',
                  transition: '0.3s ease',
                }}
              />
            </div>
          </label>

          {/* Auth */}
          {!user ? (
            <button
              onClick={() => setOpenLogin(true)}
              style={{
                marginLeft: 8,
                background: 'transparent',
                color: '#7dd3fc',
                border: '1px solid rgba(125,211,252,.4)',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Entrar
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 8 }}>
              <span style={{ opacity: 0.9, fontSize: 14 }}>
                {user.name || user.email} · {user.role}
              </span>

              {/* 👇 SOLO PARA ADMIN */}
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin/editor')}
                  style={{
                    background: 'linear-gradient(to right, #0ea5e9, #2563eb)',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,.35)',
                  }}
                  title="Abrir editor de hotspots 360°"
                >
                  Editor 360°
                </button>
              )}

              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  color: '#fecaca',
                  border: '1px solid rgba(254,202,202,.4)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Salir
              </button>
            </div>
          )}
        </nav>
      </header>

      <LoginModal open={openLogin} onClose={() => setOpenLogin(false)} />
    </>
  );
}
