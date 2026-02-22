'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'
import { Header } from '@/components/layout/header'
import { useAuthStore } from '@/lib/auth'
import { usersApi, gdprApi } from '@/lib/api'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  User, Lock, Shield, Download, Trash2, Crown, Check, AlertTriangle, Loader2, X,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

function SettingsContent() {
  const router = useRouter()
  const { user, fetchUser, logout } = useAuthStore()
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    organization_name: user?.organization_name || '',
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [error, setError] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setError('')
    try {
      await usersApi.updateProfile(profileData)
      await fetchUser()
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Speichern')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    setPasswordSaving(true)
    setError('')
    try {
      await usersApi.changePassword(passwordData.current_password, passwordData.new_password)
      setPasswordSuccess(true)
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Ändern des Passworts')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    setError('')
    try {
      const response = await api.post('/stripe/create-checkout-session')
      const { checkout_url } = response.data
      window.location.href = checkout_url
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Starten des Checkout')
      setUpgrading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Abonnement wirklich kündigen? Es bleibt bis zum Ende der Laufzeit aktiv.')) return
    setCancelling(true)
    setError('')
    try {
      await api.post('/stripe/cancel-subscription')
      await fetchUser()
      toast('Ihr Abonnement wird am Ende der Laufzeit gekündigt.', 'success')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Fehler beim Kündigen')
    } finally {
      setCancelling(false)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await gdprApi.exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `vereinskasse_daten_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('Fehler beim Exportieren der Daten', 'error')
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Möchten Sie Ihr Konto wirklich löschen? Alle Daten werden unwiderruflich gelöscht (DSGVO Art. 17).'
    )
    if (!confirmed) return
    const confirmed2 = confirm('Sind Sie absolut sicher? Diese Aktion kann nicht rückgängig gemacht werden!')
    if (!confirmed2) return

    try {
      await gdprApi.deleteAccount()
      await logout()
      router.push('/login')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast(error.response?.data?.detail || 'Fehler beim Löschen des Kontos', 'error')
    }
  }

  const isPremium = user?.subscription_tier === 'premium'

  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Einstellungen" subtitle="Profil und Konto verwalten" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          {/* Profile */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card/80 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Profil</h2>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">E-Mail</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Vereinsname</label>
                <input
                  type="text"
                  value={profileData.organization_name}
                  onChange={(e) => setProfileData({ ...profileData, organization_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {profileSuccess ? <Check className="w-4 h-4" /> : null}
                  {profileSaving ? 'Speichern...' : profileSuccess ? 'Gespeichert!' : 'Speichern'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card/80 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Passwort ändern</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Aktuelles Passwort</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Neues Passwort</label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Passwort bestätigen</label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {passwordSuccess ? <Check className="w-4 h-4" /> : null}
                  {passwordSaving ? 'Ändern...' : passwordSuccess ? 'Geändert!' : 'Passwort ändern'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Subscription */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card/80 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Crown className="w-4 h-4 text-warning" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Abonnement</h2>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">Aktueller Plan:</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPremium ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                    {isPremium ? 'Premium' : 'Kostenlos'}
                  </span>
                </div>
                {!isPremium && (
                  <p className="text-xs text-muted-foreground">
                    Bis zu 50 Mitglieder, Kassenbuch und Kategorien
                  </p>
                )}
                {isPremium && user?.subscription_expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Läuft ab: {new Date(user.subscription_expires_at).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!isPremium && (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-black text-sm font-medium hover:bg-warning/90 disabled:opacity-50 transition-colors"
                  >
                    {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                    {upgrading ? 'Weiterleitung...' : 'Jetzt upgraden – 0,99€/Monat'}
                  </button>
                )}
                {isPremium && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    {cancelling ? 'Kündige...' : 'Abonnement kündigen'}
                  </button>
                )}
              </div>
            </div>

            {/* Features comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border bg-secondary/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kostenlos</p>
                <ul className="space-y-2">
                  {['Bis zu 50 Mitglieder', 'Kassenbuch', 'Kategorien', 'Grundberichte'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`p-4 rounded-lg border ${isPremium ? 'border-warning/40 bg-warning/5' : 'border-border bg-secondary/20'}`}>
                <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-3">Premium – 0,99€/Monat</p>
                <ul className="space-y-2">
                  {[
                    'Unlimitierte Mitglieder',
                    'DATEV-Export (CSV)',
                    'Jahresabschluss als PDF',
                    'Zahlungserinnerungen',
                    'E-Mail an Mitglieder',
                    'Prioritäts-Support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* DSGVO */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card/80 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-info" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Datenschutz (DSGVO)</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                <div>
                  <p className="text-sm font-medium text-foreground">Meine Daten exportieren</p>
                  <p className="text-xs text-muted-foreground">DSGVO Art. 20 - Datenportabilität</p>
                </div>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportieren
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="text-sm font-medium text-destructive">Konto löschen</p>
                  <p className="text-xs text-muted-foreground">DSGVO Art. 17 - Recht auf Löschung</p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Konto löschen
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
    </MobileNavProvider>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}
