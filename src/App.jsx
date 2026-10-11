import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { useEffect, lazy, Suspense } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Atmosphere from './components/Atmosphere'
import Home from './pages/Home'
import Exhibition from './pages/Exhibition'
import Archive from './pages/Archive'
import About from './pages/About'
import NotFound from './pages/NotFound'
const Studio = lazy(() => import('./studio/Studio'))

export default function App() {
  const location = useLocation()
  const isStudio = location.pathname.startsWith('/studio')

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  if (isStudio) return (
    <Suspense fallback={<div className="state"><div className="loader" /></div>}>
      <Routes><Route path="/studio/*" element={<Studio />} /></Routes>
    </Suspense>
  )

  return (
    <MotionConfig reducedMotion="user">
      <Atmosphere />
      <Header />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/e/:slug" element={<Exhibition />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </MotionConfig>
  )
}
