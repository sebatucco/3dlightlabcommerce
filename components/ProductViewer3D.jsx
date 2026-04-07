'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function ProductViewer3D() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="absolute inset-0 bg-neutral-900" />
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
      {/* Background subtle pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Central mate silhouette animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{
            y: [-5, 5, -5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Mate cup shape */}
          <div className="relative w-32 h-40">
            {/* Cup body */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-32 rounded-b-full"
              style={{
                background: 'linear-gradient(180deg, #3d3d3d 0%, #1a1a1a 100%)',
                boxShadow: 'inset 0 -10px 30px rgba(0,0,0,0.5), 0 10px 40px rgba(0,0,0,0.5)',
              }}
            />
            
            {/* Cup rim */}
            <div 
              className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #4a4a4a 0%, #666 50%, #4a4a4a 100%)',
              }}
            />
            
            {/* Bombilla */}
            <motion.div
              className="absolute top-0 left-1/2 w-1 h-36 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full"
              style={{
                transformOrigin: 'bottom center',
                transform: 'translateX(-50%) rotate(15deg)',
              }}
              animate={{
                rotate: [15, 18, 15],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Bombilla tip */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-400" />
            </motion.div>
            
            {/* Steam effect */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-2 left-1/2 w-6 h-10 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                  filter: 'blur(4px)',
                  marginLeft: `${(i - 1) * 10}px`,
                }}
                animate={{
                  y: [-20, -60],
                  opacity: [0.3, 0],
                  scale: [1, 1.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
          
          {/* Reflection */}
          <div 
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-8 rounded-full opacity-20 blur-md"
            style={{
              background: 'radial-gradient(ellipse, white 0%, transparent 70%)',
            }}
          />
        </motion.div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-white/10" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-white/10" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-white/10" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-white/10" />
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-gray-500 text-xs">
          Vista del producto
        </p>
      </div>
    </div>
  )
}
