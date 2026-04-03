//Hostpot.tsx:
'use client'
import { Html } from '@react-three/drei'
import Image from 'next/image'

interface HotspotProps {
  position: [number, number, number]
  label?: string
  onClick?: () => void
}

export default function Hotspot({ position, label, onClick }: HotspotProps) {
  return (
    <Html position={position} center>
      <div onClick={onClick} style={{ cursor: 'pointer', textAlign: 'center' }}>
        <Image src="/pin.png" alt="Pin" width={30} height={30} />
        {label && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: '5px',
              marginTop: '4px',
              padding: '2px 5px',
              fontSize: '12px',
            }}
          >
            {label}
          </div>
        )}
      </div>
    </Html>
  )
}