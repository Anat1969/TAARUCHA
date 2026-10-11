import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { EASE } from './Motion'

// Edit entry point inside an exhibition page. Anonymous visitors see a quiet "עריכה" tab;
// the authorised account sees a floating edit bar that opens this exhibition in the studio.
export default function EditBar({ exhibitionId }) {
  const { session, isAdmin, ready, signOut } = useAuth()
  const { pathname } = useLocation()
  if (session === undefined) return null

  return (
    <AnimatePresence mode="wait">
      {session && ready && isAdmin ? (
        <motion.div key="admin" className="editbar" role="region" aria-label="מצב עריכה"
          initial={{ y: 80, opacity: 0, rotateX: 20 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}>
          <span className="editbar__dot" aria-hidden="true" />
          <span className="mono">מצב עריכה</span>
          <Link className="editbar__btn" to={`/studio/e/${exhibitionId}`}>עריכת התערוכה</Link>
          <Link className="editbar__btn" to={`/studio/e/${exhibitionId}#add`}>הוספת עבודה</Link>
          <Link className="editbar__btn ghost" to="/studio">כל התערוכות</Link>
          <button className="editbar__btn ghost" onClick={signOut}>יציאה</button>
        </motion.div>
      ) : session && ready && !isAdmin ? (
        <motion.div key="denied" className="editbar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <span className="mono">{session.user.email} אינו מורשה לעריכה</span>
          <button className="editbar__btn ghost" onClick={signOut}>יציאה</button>
        </motion.div>
      ) : !session ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, delay: 1 }}>
          <Link className="edit-tab mono" to={`/studio?next=${encodeURIComponent(pathname)}`} aria-label="כניסה לעריכה">עריכה</Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// Small per-work edit shortcut shown on the wall to the authorised account.
export function WorkEditLink({ exhibitionId, workId }) {
  const { isAdmin, ready, session } = useAuth()
  if (!session || !ready || !isAdmin) return null
  return <Link className="work-edit mono" to={`/studio/e/${exhibitionId}#w-${workId}`}>עריכת העבודה</Link>
}
