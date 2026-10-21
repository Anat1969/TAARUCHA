import { useEffect, useState } from 'react'

// Chrome offers installation through `beforeinstallprompt`; keep the event until the visitor asks.
let deferred = null
const subs = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

export function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); return () => subs.delete(f) }, [])
  return {
    canInstall: !!deferred,
    install: async () => {
      if (!deferred) return
      deferred.prompt()
      await deferred.userChoice.catch(() => {})
      deferred = null
      subs.forEach((f) => f())
    },
  }
}
