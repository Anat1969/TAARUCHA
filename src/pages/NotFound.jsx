import { Link } from 'react-router-dom'
import { Page, Lines } from '../components/Motion'

export default function NotFound() {
  return (
    <Page className="state">
      <span className="mono mute">404</span>
      <Lines lines={['הקיר הזה ריק']} className="display display--md" />
      <Link className="btn" to="/">חזרה לתערוכות <span className="arrow">←</span></Link>
    </Page>
  )
}
