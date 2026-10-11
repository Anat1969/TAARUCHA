import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext({ session: undefined, isAdmin: false, ready: false })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) { setIsAdmin(false); setReady(true); return }
    setReady(false)
    supabase.rpc('taarucha_whoami').then(({ data }) => { setIsAdmin(data === true); setReady(true) })
  }, [session])

  return <AuthCtx.Provider value={{ session, isAdmin, ready }}>{children}</AuthCtx.Provider>
}

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q'

// Whether Google sign-in is switched on in Supabase. Resolves to null when the check itself fails.
let googleCheck
export function googleEnabled() {
  googleCheck ??= fetch(`${SB_URL}/auth/v1/settings`, { headers: { apikey: SB_KEY } })
    .then((r) => r.json()).then((cfg) => !!cfg?.external?.google).catch(() => null)
  return googleCheck
}

const AUTH_ERR = {
  'Invalid login credentials': 'דוא״ל או סיסמה שגויים',
  'Email not confirmed': 'כתובת הדוא״ל עדיין לא אומתה',
}
const heb = (error) => AUTH_ERR[error?.message] || error?.message

export function useAuth() {
  const ctx = useContext(AuthCtx)
  const signIn = useCallback(async (returnTo) => {
    const redirectTo = returnTo || window.location.href
    if ((await googleEnabled()) === false) return 'הכניסה עם Google עדיין לא הופעלה. אפשר להיכנס עם דוא״ל וסיסמה.'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    })
    return error ? 'הכניסה עם Google נכשלה: ' + heb(error) : null
  }, [])
  const signInWithPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? heb(error) : null
  }, [])
  const sendLink = useCallback(async (email, returnTo) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: returnTo || window.location.href },
    })
    return error ? heb(error) : null
  }, [])
  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? heb(error) : null
  }, [])
  const signOut = useCallback(() => supabase.auth.signOut(), [])
  return { ...ctx, signIn, signInWithPassword, sendLink, updatePassword, signOut }
}

export function GoogleMark() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 48 48" style={{ flex: '0 0 auto' }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}
