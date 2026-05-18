'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Download,
  Bell,
  BookOpen,
  MessageSquare,
  Calendar,
  Notebook,
  Calculator,
  Store
} from 'lucide-react'

// Define the specialized PWA Prompt event type
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface HamburgerMenuNavProps {
  lang: 'en' | 'sw'
  theme: 'dark' | 'light'
  onToggleLang: () => void
  onToggleTheme: () => void
  onSignOut?: () => void
  backLabel?: string
  backHref?: string
  pageTitle?: string
  pageTitleIcon?: React.ReactNode
  menuExtraLinks?: { href: string; label: string }[]
  deferredPrompt: BeforeInstallPromptEvent | null
  onInstallApp?: () => void
  onTriggerTestAlert?: () => void
  showRealtimeStatus?: { connected: boolean; connectedLabel: string; connectingLabel: string }
}

export default function HamburgerMenuNav({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onSignOut,
  backLabel,
  backHref = '/dashboard',
  pageTitle,
  pageTitleIcon,
  menuExtraLinks = [],
  deferredPrompt,
  onInstallApp,
  onTriggerTestAlert,
  showRealtimeStatus
}: HamburgerMenuNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const t = {
    academy: lang === 'en' ? 'Academy' : 'Chuo',
    community: lang === 'en' ? 'Community' : 'Jamii',
    calendar: lang === 'en' ? 'Calendar' : 'Ratiba',
    diary: lang === 'en' ? 'Diary' : 'Shajara',
    estimator: lang === 'en' ? 'Estimator' : 'Kikokotoo',
    marketplace: lang === 'en' ? 'Marketplace' : 'Soko',
    agrovetConsole: lang === 'en' ? 'Agrovet Console' : 'Kofia ya Agrovet',
    installApp: lang === 'en' ? 'Install FarmGuard App' : 'Sakinisha App ya FarmGuard',
    testAlert: lang === 'en' ? 'Test 5s Alert' : 'Jaribu Arifa (Sekunde 5)',
    signOut: lang === 'en' ? 'Sign Out' : 'Ondoka',
  }

  const navLinks = [
    { href: '/teachings', label: t.academy },
    { href: '/community', label: t.community },
    { href: '/calendar', label: t.calendar },
    { href: '/notes', label: t.diary },
    { href: '/estimator', label: t.estimator },
    { href: '/marketplace', label: t.marketplace },
    { href: '/agrovets', label: t.agrovetConsole },
  ]

  return (
    <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Left: Back + Brand */}
        <div className="flex items-center gap-6">
          {backHref && backLabel && (
            <>
              <Link href={backHref} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                {backHref !== '#' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                )}
                <span className="hidden sm:inline">{backLabel}</span>
              </Link>
              <div className="w-px h-6 bg-zinc-800" />
            </>
          )}

          {pageTitle && (
            <div className="flex items-center gap-2">
              {pageTitleIcon}
              <span className="font-bold text-white tracking-wide text-sm">{pageTitle}</span>
            </div>
          )}

          {!pageTitle && (
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-wide text-lg">FarmGuard</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Desktop Navigation Links - hidden on mobile/tablet */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {link.label}
              </Link>
            ))}
            {menuExtraLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Realtime Status */}
          {showRealtimeStatus && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${
              showRealtimeStatus.connected
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : 'border-amber-500/20 bg-amber-500/5 text-amber-400 animate-pulse'
            }`}>
              {showRealtimeStatus.connected ? '●' : <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              {showRealtimeStatus.connected ? showRealtimeStatus.connectedLabel : showRealtimeStatus.connectingLabel}
            </span>
          )}

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all text-xs font-semibold"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-all"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

           {/* Desktop Sign Out Button */}
           {onSignOut && (
             <button
               onClick={onSignOut}
               className="hidden lg:flex p-2 rounded-lg border border-zinc-800 hover:border-red-500/30 hover:text-red-400 transition-all items-center gap-2"
               title={t.signOut}
             >
               <LogOut className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-md"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {menuExtraLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-zinc-800/50 my-2" />

              {/* Manual PWA Install Option */}
              {deferredPrompt && onInstallApp && (
                <button
                  onClick={() => {
                    onInstallApp()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-emerald-500/10 mb-1"
                >
                  <Download className="w-4 h-4" />
                  {t.installApp}
                </button>
              )}

              {onTriggerTestAlert && (
                <button
                  onClick={() => {
                    onTriggerTestAlert()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors px-3 py-3 rounded-lg hover:bg-amber-500/10 mb-1"
                >
                  <Bell className="w-4 h-4" />
                  {t.testAlert}
                </button>
              )}

              {onSignOut && (
                <button
                  onClick={() => {
                    onSignOut()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors px-3 py-3 rounded-lg hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  {t.signOut}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
