//Loader3D.tsx 
'use client'
import Image from 'next/image'

export default function Loader3D() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        zIndex: 99999,
      }}
    >
      <Image
        src="/CARGALOGO.png"
        alt="Cargando..."
        width={160}
        height={160}
        style={{ animation: 'spin 2s linear infinite' }}
      />
      <p style={{ color: '#00ccff', marginTop: '20px', fontSize: '18px' }}>
        Cargando entorno virtual...
      </p>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
