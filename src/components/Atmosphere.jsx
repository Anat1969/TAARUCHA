import { useEffect } from 'react'

// Fixed background layers: base light, a soft light that follows the pointer, a faint
// architectural grid and animated grain. Gives the flat page physical depth.
export default function Atmosphere() {
  useEffect(() => {
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const root = document.documentElement
        root.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`)
        root.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div className="atmo" aria-hidden="true">
      <div className="atmo__base" />
      <div className="atmo__light" />
      <div className="atmo__grid" />
      <div className="atmo__grain" />
    </div>
  )
}
