import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState } from 'react'

export const EASE = [0.2, 0.7, 0.1, 1]

// Page-level fade with a slight lift.
export function Page({ children, ...rest }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.7, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.main>
  )
}

// Lines that rise out of a mask, one after another.
export function Lines({ lines, as: Tag = 'h1', className, delay = 0.15 }) {
  return (
    <Tag className={className}>
      {lines.map((l, i) => (
        <span className="line-mask" key={i}>
          <motion.span
            style={{ display: 'block' }}
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.12 }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

// Reveal on scroll into view.
export function Reveal({ children, delay = 0, y = 40, className, style, as = 'div' }) {
  const M = motion[as]
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </M>
  )
}

// Pointer-driven 3D tilt with spring physics.
export function Tilt({ children, max = 8, className, style }) {
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const sx = useSpring(x, { stiffness: 120, damping: 18 })
  const sy = useSpring(y, { stiffness: 120, damping: 18 })
  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left) / r.width)
        y.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5) }}
    >
      {children}
    </motion.div>
  )
}

// Image that fades and sharpens in once loaded.
export function Img({ src, alt, style, className, onClick, eager }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <motion.img
      src={src}
      alt={alt || ''}
      className={className}
      style={style}
      onClick={onClick}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      initial={false}
      animate={{ opacity: loaded ? 1 : 0, filter: loaded ? 'blur(0px) grayscale(0)' : 'blur(12px) grayscale(1)' }}
      transition={{ duration: 1.2, ease: EASE }}
    />
  )
}
