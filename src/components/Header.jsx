import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Header() {
  return (
    <motion.header
      className="hdr"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.2, 0.7, 0.1, 1] }}
    >
      <Link to="/" className="hdr__name">
        ענת דוד שטיבלמן
        <span className="mono mute">תערוכות</span>
      </Link>
      <nav className="hdr__nav mono" aria-label="ניווט ראשי">
        <NavLink to="/" end>תערוכות</NavLink>
        <NavLink to="/archive">ארכיון</NavLink>
        <NavLink to="/about">אודות</NavLink>
      </nav>
    </motion.header>
  )
}
