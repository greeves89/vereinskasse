'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, Check, AlertCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Kein Verifizierungstoken gefunden.')
      return
    }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('success')
        setMessage('Ihre E-Mail-Adresse wurde erfolgreich bestätigt.')
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { detail?: string } } }
        setStatus('error')
        setMessage(e.response?.data?.detail || 'Verifizierung fehlgeschlagen. Der Link ist möglicherweise abgelaufen.')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VereinsKasse</h1>
          <p className="text-muted-foreground mt-1">E-Mail Verifizierung</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-2xl text-center"
        >
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm">Verifizierung läuft...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">E-Mail bestätigt!</h2>
              <p className="text-muted-foreground text-sm">{message}</p>
              <Link
                href="/login"
                className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm text-center hover:bg-primary/90 transition-colors mt-4"
              >
                Jetzt anmelden
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Verifizierung fehlgeschlagen</h2>
              <p className="text-muted-foreground text-sm">{message}</p>
              <Link
                href="/login"
                className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm text-center hover:bg-primary/90 transition-colors mt-4"
              >
                Zur Anmeldung
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
