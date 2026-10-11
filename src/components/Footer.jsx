import { useAsync, fetchSettings } from '../lib/data'

export default function Footer() {
  const { data: s } = useAsync(fetchSettings, [])
  return (
    <footer className="ftr mono">
      <span>© {new Date().getFullYear()} אד׳ ענת דוד שטיבלמן · אשדוד (Ashdod, Israel)</span>
      <span style={{ display: 'flex', gap: 24 }}>
        {s?.instagram && <a href={s.instagram} target="_blank" rel="noreferrer">אינסטגרם</a>}
        {s?.email && <a href={`mailto:${s.email}`}>דוא״ל</a>}
      </span>
    </footer>
  )
}
