import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePageMenu } from './Header'

// Edit entry point inside an exhibition page, as items of the A&I logo button (no floating bar):
// visitors get "כניסה לעריכה"; the authorised account gets this exhibition's edit actions.
export default function EditBar({ exhibitionId }) {
  const { session, isAdmin, ready, signOut } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const email = session?.user?.email

  usePageMenu(
    session === undefined
      ? { items: [], status: '' }
      : session && ready && isAdmin
        ? {
            status: 'מצב עריכה',
            items: [
              { label: 'עריכת התערוכה', onSelect: () => navigate(`/studio/e/${exhibitionId}`) },
              { label: 'הוספת עבודה', onSelect: () => navigate(`/studio/e/${exhibitionId}#add`) },
              { label: 'כל התערוכות', onSelect: () => navigate('/studio') },
              { label: 'יציאה', onSelect: signOut },
            ],
          }
        : session && ready && !isAdmin
          ? { status: '', items: [{ label: `${email} אינו מורשה לעריכה`, disabled: true }, { label: 'יציאה', onSelect: signOut }] }
          : !session
            ? { status: '', items: [{ label: 'כניסה לעריכה', onSelect: () => navigate(`/studio?next=${encodeURIComponent(pathname)}`) }] }
            : { items: [], status: '' },
    [session, ready, isAdmin, exhibitionId, pathname],
  )
  return null
}

// Small per-work edit shortcut shown on the wall to the authorised account.
export function WorkEditLink({ exhibitionId, workId }) {
  const { isAdmin, ready, session } = useAuth()
  if (!session || !ready || !isAdmin) return null
  return <Link className="work-edit mono" to={`/studio/e/${exhibitionId}#w-${workId}`}>עריכת העבודה</Link>
}
