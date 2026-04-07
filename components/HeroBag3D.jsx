'use client'

import { motion } from 'framer-motion'

const floatTransition = {
  duration: 5.5,
  repeat: Infinity,
  ease: 'easeInOut',
}

export default function HeroBag3D() {
  return (
    <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center">
      <div className="absolute inset-6 border border-white/15 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_58%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(44,38,31,0.12)]" />

      <motion.img
        src="/mate-hero1.png"
        alt="Mate artesanal Sendas del Tafí"
        className="relative z-10 w-[300px] drop-shadow-[0_28px_45px_rgba(0,0,0,0.28)] md:w-[430px]"
        animate={{ y: [0, -10, 0] }}
        transition={floatTransition}
      />
    </div>
  )
}
