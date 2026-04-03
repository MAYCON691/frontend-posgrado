// src/components/LoginModal.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@posgrado.bo'); // demo
  const [password, setPassword] = useState('Admin123!');   // demo
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login({ email, password });
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100000,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: 360,
          background: '#101827',
          color: '#e5e7eb',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.1)',
          boxShadow: '0 10px 40px rgba(0,0,0,.5)',
          padding: 18,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Iniciar sesión</div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: .85 }}>Correo</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{
              background: '#0b1220',
              border: '1px solid #223',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 8,
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: .85 }}>Contraseña</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{
              background: '#0b1220',
              border: '1px solid #223',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 8,
              outline: 'none',
            }}
          />
        </label>

        {err && <div style={{ color: '#fca5a5', fontSize: 13 }}>{err}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 6,
            background: 'linear-gradient(90deg,#0ea5e9,#2563eb)',
            color: 'white',
            fontWeight: 800,
            border: 'none',
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'pointer',
            opacity: loading ? .7 : 1,
          }}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#93c5fd',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
