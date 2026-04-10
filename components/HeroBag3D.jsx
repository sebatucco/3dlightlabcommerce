'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

const floatTransition = {
  duration: 5.5,
  repeat: Infinity,
  ease: 'easeInOut',
}

export default function HeroBag3D() {
  useEffect(() => {
    let mounted = true

    async function loadModelViewer() {
      if (mounted && !customElements.get('model-viewer')) {
        await import('@google/model-viewer')
      }
    }

    loadModelViewer()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="relative mx-auto flex h-[420px] w-full max-w-[520px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_55%)]" />

      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={floatTransition}
        className="relative z-10 w-full"
      >
        <div className="mx-auto h-[420px] w-full max-w-[520px]">
          <model-viewer
            src="/models/logo.glb"
            alt="Modelo 3D principal"
            auto-rotate
            camera-controls
            disable-zoom
            interaction-prompt="none"
            shadow-intensity="0"
            exposure="1"
            environment-image="neutral"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
              '--poster-color': 'transparent',
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}