'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth'
import {
  TrendingUp, Users, BookOpen, BarChart3, Shield, Star,
  Check, ArrowRight, Mail, FileText, Bell
} from 'lucide-react'

const features = [
  { icon: BookOpen, title: 'Kassenbuch', desc: 'Einnahmen und Ausgaben erfassen, kategorisieren und exportieren – DATEV-kompatibel.' },
  { icon: Users, title: 'Mitgliederverwaltung', desc: 'Alle Mitglieder im Blick: Status, Beitrag, IBAN, Mitgliedsnummer.' },
  { icon: Bell, title: 'Zahlungserinnerungen', desc: 'Automatische Erinnerungen per E-Mail an Mitglieder mit ausstehenden Beiträgen.' },
  { icon: BarChart3, title: 'Statistiken', desc: 'Dashboard mit Übersicht über Finanzen, Mitglieder und Aktivitäten.' },
  { icon: FileText, title: 'PDF-Export', desc: 'Jahresabschlüsse und Kassenbücher als PDF exportieren.' },
  { icon: Shield, title: 'DSGVO-konform', desc: 'Datenexport, Löschung und alle Rechte nach Art. 15–20 DSGVO.' },
]

const pricing = [
  {
    name: 'Kostenlos',
    price: '0 €',
    period: 'für immer',
    features: ['Bis zu 50 Mitglieder', 'Vollständiges Kassenbuch', 'Kategorien & Statistiken', 'E-Mail-Support'],
    cta: 'Kostenlos starten',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '0,99 €',
    period: 'pro Monat',
    features: ['Unlimitierte Mitglieder', 'PDF-Jahresabschluss', 'DATEV-Export', 'Zahlungserinnerungen', 'Prioritäts-Support'],
    cta: 'Premium starten',
    href: '/register',
    highlight: true,
  },
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, fetchUser } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetchUser().then(() => {
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (!checking && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [checking, isAuthenticated])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">VereinsKasse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Anmelden</Link>
            <Link href="/register" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
            <Star className="w-3 h-3" />
            Kostenlos starten – Premium ab 0,99 €/Monat
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Kassenverwaltung<br /><span className="text-primary">für Ihren Verein</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Mitglieder verwalten, Kassenbuch führen, Zahlungserinnerungen versenden – einfach, sicher und DSGVO-konform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm">
              Jetzt kostenlos starten <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-secondary/50 transition-colors text-sm">
              Bereits registriert? Anmelden
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Alles was Ihr Verein braucht</h2>
          <p className="text-muted-foreground">Kein Buchhaltungsstudium erforderlich.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Einfache Preise</h2>
          <p className="text-muted-foreground">Kein Kleingedrucktes. Jederzeit kündbar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {pricing.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-8 ${plan.highlight ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}`}>
              {plan.highlight && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Star className="w-3 h-3" /> Empfohlen
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/{plan.period}</span>
              </div>
              <ul className="space-y-2.5 my-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-success" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`block w-full py-2.5 rounded-xl text-center font-medium text-sm transition-colors ${plan.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-12 text-center">
          <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-3">Bereit loszulegen?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Kostenlos registrieren – keine Kreditkarte erforderlich. In 2 Minuten startklar.</p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Jetzt kostenlos starten <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">© 2026 VereinsKasse</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">AGB</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
