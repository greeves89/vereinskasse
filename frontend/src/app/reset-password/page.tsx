'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, Lock, Eye, EyeOff, AlertCircle, Check, Loader2 } from 'lucide-react'
import api from '@/lib/api'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError('Ungültiger Link. Bitte fordern Sie einen neuen an.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Fehler beim Zurücksetzen. Link möglicherweise abgelaufen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VereinsKasse</h1>
          <p className="text-muted-foreground mt-1">Neues Passwort vergeben</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-2xl"
        >
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Passwort geändert!</h2>
              <p className="text-muted-foreground text-sm">
                Ihr Passwort wurde erfolgreich geändert. Sie werden in Kürze weitergeleitet...
              </p>
              <Link href="/login" className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm text-center hover:bg-primary/90 transition-colors">
                Jetzt anmelden
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-6">Neues Passwort</h2>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Neues Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mindestens 8 Zeichen"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Passwort bestätigen</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Passwort wiederholen"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Wird gespeichert...' : 'Passwort ändern'}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
