'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  ShieldCheck, 
  ArrowLeft, 
  Store, 
  Sprout, 
  Plus, 
  Globe, 
  Sun, 
  Moon, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  DollarSign,
  Truck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Gavel,
  Tag,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { translations } from '@/lib/translations'

interface Bid {
  id: string
  request_id: string
  agrovet_id: string
  agrovet_name: string
  price: number
  delivery_days: number
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

interface RequestTicket {
  id: string
  user_id: string
  plant_name: string
  disease: string
  treatment_needed: string
  quantity: string
  description: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  bids?: Bid[]
}

export default function MarketplacePage() {
  const [role, setRole] = useState<'farmer' | 'agrovet'>('farmer')
  const [userId, setUserId] = useState<string | null>(null)
  const [scans, setScans] = useState<any[]>([])
  const [requests, setRequests] = useState<RequestTicket[]>([])
  const [loading, setLoading] = useState(true)

  // Language & Theme
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // UI state
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states - Request Creation
  const [selectedScanId, setSelectedScanId] = useState<string>('')
  const [customPlant, setCustomPlant] = useState('')
  const [customDisease, setCustomDisease] = useState('')
  const [customTreatment, setCustomTreatment] = useState('fungicide')
  const [quantity, setQuantity] = useState('1 unit')
  const [description, setDescription] = useState('')

  // Form states - Placing Bid
  const [bidPrice, setBidPrice] = useState<string>('')
  const [bidDelivery, setBidDelivery] = useState<string>('1')
  const [bidMessage, setBidMessage] = useState<string>('')

  // Sync preferences
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)
    document.documentElement.classList.toggle('light', finalTheme === 'light')

    const syncPreferences = () => {
      const currentLang = localStorage.getItem('lang') as 'en' | 'sw'
      if (currentLang) setLang(currentLang)
      const currentTheme = localStorage.getItem('theme') as 'dark' | 'light'
      if (currentTheme) {
        setTheme(currentTheme)
        document.documentElement.classList.toggle('light', currentTheme === 'light')
      }
    }
    window.addEventListener('storage', syncPreferences)
    window.addEventListener('local-storage', syncPreferences)

    return () => {
      window.removeEventListener('storage', syncPreferences)
      window.removeEventListener('local-storage', syncPreferences)
    }
  }, [])

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'sw' : 'en'
    setLang(nextLang)
    localStorage.setItem('lang', nextLang)
    window.dispatchEvent(new Event('local-storage'))
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('light', nextTheme === 'light')
    window.dispatchEvent(new Event('local-storage'))
  }

  const t = translations[lang]

  // Protect and Fetch user role
  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.replace('/login')
        return
      }

      setUserId(session.user.id)
      const userRole = session.user.user_metadata?.role || 'farmer'
      setRole(userRole)

      // Fetch Scans if farmer
      if (userRole === 'farmer') {
        const { data: dbScans } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
        if (dbScans) setScans(dbScans)
      }

      // Fetch Marketplace tickets
      void fetchRequests()
    }

    loadSession()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/marketplace/requests')
      const payload = await res.json()
      if (res.ok) {
        setRequests(payload.requests || [])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill form from selected scan
  useEffect(() => {
    if (selectedScanId) {
      const scan = scans.find(s => s.id === selectedScanId)
      if (scan) {
        setCustomPlant(scan.plant_name)
        setCustomDisease(scan.disease)
        // Match treatment
        const diseaseNorm = scan.disease.toLowerCase()
        if (diseaseNorm.includes('blight') || diseaseNorm.includes('fung')) {
          setCustomTreatment('fungicide')
        } else if (diseaseNorm.includes('insect') || diseaseNorm.includes('pest')) {
          setCustomTreatment('insecticide')
        } else if (diseaseNorm.includes('bacterial')) {
          setCustomTreatment('copper oxychloride')
        } else {
          setCustomTreatment('fungicide')
        }
      }
    } else {
      setCustomPlant('')
      setCustomDisease('')
      setCustomTreatment('fungicide')
    }
  }, [selectedScanId, scans])

  // Post new farmer request ticket
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customPlant || !customDisease || !customTreatment || isSubmitting) return

    try {
      setIsSubmitting(true)
      setActionError(null)
      setActionSuccess(null)

      const res = await fetch('/api/marketplace/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantName: customPlant,
          disease: customDisease,
          treatmentNeeded: customTreatment,
          quantity,
          description
        })
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to submit request')

      setActionSuccess(lang === 'en' ? 'Bidding ticket published successfully!' : 'Tiketi ya zabuni imechapishwa kikamilifu!')
      setIsCreateOpen(false)
      setSelectedScanId('')
      setQuantity('1 unit')
      setDescription('')
      await fetchRequests()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit competitive agrovet bid
  const handlePlaceBid = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault()
    const priceNum = Number(bidPrice)
    if (!requestId || !priceNum || priceNum <= 0 || isSubmitting) return

    try {
      setIsSubmitting(true)
      setActionError(null)
      setActionSuccess(null)

      const res = await fetch('/api/marketplace/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          price: priceNum,
          deliveryDays: Number(bidDelivery),
          message: bidMessage
        })
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to submit bid')

      setActionSuccess(lang === 'en' ? 'Your competitive bid submitted!' : 'Zabuni yako imetumwa kikamilifu!')
      setBidPrice('')
      setBidDelivery('1')
      setBidMessage('')
      setExpandedRequestId(null)
      await fetchRequests()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Accept a bid (Farmer transaction)
  const handleAcceptBid = async (bidId: string) => {
    if (!confirm(lang === 'en' ? 'Are you sure you want to accept this offer? All other bids will be closed.' : 'Je, una uhakika unataka kukubali ofa hii? Zabuni zingine zote zitafungwa.')) return

    try {
      setActionError(null)
      setActionSuccess(null)

      const res = await fetch('/api/marketplace/bids', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId,
          action: 'accept'
        })
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to accept bid')

      setActionSuccess(lang === 'en' ? 'Deal locked! Agrovet notified.' : 'Mkataba umefungwa! Agrovet amejulishwa.')
      setExpandedRequestId(null)
      await fetchRequests()
    } catch (err: any) {
      setActionError(err.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.replace("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-emerald-400 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p>Loading marketplace ecosystem...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans pb-24 transition-colors duration-300">
      
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> {t.backToDashboard}
            </Link>
            <div className="w-px h-6 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
                <Store className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">{t.brand} Marketplace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all text-xs font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
            </button>

            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
            </button>

            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg border border-zinc-800 hover:border-red-500/30 hover:text-red-400 transition-all flex items-center gap-2"
              title={t.signOut}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Banner/Header */}
        <div className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Gavel className="w-36 h-36 text-white" />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 mb-3">
                {role === 'farmer' ? 'FARMER CONSOLE' : 'AGROVET CONSOLE'}
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                {lang === 'en' ? 'Smart Treatment Bidding' : 'Zabuni ya Matibabu ya Afya'}
              </h1>
              <p className="mt-2 text-zinc-400 max-w-2xl text-sm md:text-base leading-relaxed">
                {role === 'farmer' 
                  ? 'Publish your crop diagnostic prescription results to nearby agrovets. Receive competitive, reverse-bidded price offers and lock the best deal!'
                  : 'Submit competitive bids for regional crop medication requests. Win sales agreements, input supply deliveries, and expand your farmer network.'}
              </p>
            </div>

            {role === 'farmer' && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold rounded-2xl text-sm transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-2 shrink-0 self-start md:self-auto"
              >
                <Plus className="w-5 h-5" />
                {lang === 'en' ? 'Publish Crop Need' : 'Chapisha Mahitaji ya Mazao'}
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm font-semibold"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{actionSuccess}</span>
            </motion.div>
          )}
          {actionError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-semibold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{actionError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Farmer Publish Need Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-400" />
                {lang === 'en' ? 'Create Prescription Ticket' : 'Unda Tiketi ya Matibabu'}
              </h2>

              <form onSubmit={handleCreateRequest} className="space-y-4">
                
                {/* Pre-fill Scan Linker */}
                {scans.length > 0 && (
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      {lang === 'en' ? 'Link from Scan History (Optional)' : 'Unganisha kutoka kwa Historia ya Scans (Hiari)'}
                    </span>
                    <select
                      value={selectedScanId}
                      onChange={(e) => setSelectedScanId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500/40 outline-none"
                    >
                      <option value="">-- {lang === 'en' ? 'Select a scan record' : 'Chagua uchunguzi'} --</option>
                      {scans.map((scan) => (
                        <option key={scan.id} value={scan.id}>
                          {scan.plant_name} ({scan.disease}) - {new Date(scan.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Plant/Crop' : 'Mmea/Mazao'}</span>
                    <input
                      type="text"
                      required
                      value={customPlant}
                      onChange={(e) => setCustomPlant(e.target.value)}
                      placeholder="e.g. Maize"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500/40 outline-none"
                    />
                  </label>
                  
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Disease condition' : 'Ugonjwa'}</span>
                    <input
                      type="text"
                      required
                      value={customDisease}
                      onChange={(e) => setCustomDisease(e.target.value)}
                      placeholder="e.g. Late Blight"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500/40 outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Prescription Match' : 'Dawa Inayohitajika'}</span>
                    <select
                      value={customTreatment}
                      onChange={(e) => setCustomTreatment(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500/40 outline-none"
                    >
                      <option value="fungicide">Fungicide</option>
                      <option value="insecticide">Insecticide</option>
                      <option value="copper oxychloride">Copper Oxychloride</option>
                      <option value="mancozeb">Mancozeb</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Required Quantity' : 'Kiasi Kinachohitajika'}</span>
                    <input
                      type="text"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 500g, 2 Litres"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500/40 outline-none"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Additional specifications' : 'Ufafanuzi zaidi'}</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Requesting premium delivery in 24 hours to Eldoret area if possible."
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:border-emerald-500/40 outline-none h-20 resize-none"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 font-bold rounded-xl text-sm transition-all focus:outline-none"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {lang === 'en' ? 'Publish Ticket' : 'Tuma Zabuni'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Unified Request Listings (Reverse Bids Area) */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-xs">
            <Gavel className="w-5 h-5 text-emerald-400" />
            {role === 'farmer' 
              ? (lang === 'en' ? 'Your Active Prescription Bidding Tickets' : 'Tiketi Zako za Zabuni Zinazoendelea')
              : (lang === 'en' ? 'Regional Crop Prescription Requests' : 'Mahitaji ya Dawa ya Mazao Shambani')}
          </h2>

          <div className="space-y-6">
            {requests.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/30 rounded-3xl border border-zinc-800/60 text-zinc-500">
                {lang === 'en' ? 'No active crop requests published in the marketplace.' : 'Hakuna tiketi zozote za matibabu zilizochapishwa sokoni.'}
              </div>
            ) : requests
              // If farmer, let them view all, or they can view their own. Actually let farmers see all (which is extremely cool, so they see what other farmers are buying!). But highlight their own!
              .map((ticket) => {
                const isTicketOwner = ticket.user_id === userId
                const bidsCount = ticket.bids?.length || 0
                const isExpanded = expandedRequestId === ticket.id
                
                // Check if active agrovet has already placed a bid
                const hasAgrovetBid = ticket.bids?.find(b => b.agrovet_id === userId)
                
                return (
                  <motion.div 
                    key={ticket.id}
                    className={`bg-zinc-900/40 border rounded-3xl overflow-hidden transition-all shadow-xl ${
                      ticket.status === 'completed'
                        ? 'border-emerald-500/20 opacity-80'
                        : isTicketOwner
                          ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
                          : 'border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    
                    {/* Ticket Header Row */}
                    <div 
                      onClick={() => setExpandedRequestId(isExpanded ? null : ticket.id)}
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          ticket.status === 'completed' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400'
                        }`}>
                          <Sprout className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-extrabold text-white text-lg">{ticket.plant_name}</h3>
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold border border-zinc-700 capitalize">
                              {ticket.treatment_needed}
                            </span>
                            {isTicketOwner && (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                {lang === 'en' ? 'YOUR TICKET' : 'TIKETI YAKO'}
                              </span>
                            )}
                            {ticket.status === 'completed' && (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-zinc-950 font-bold border border-emerald-400">
                                {lang === 'en' ? 'DEAL LOCKED' : 'IMEKUBALIWA'}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-zinc-500 text-xs mt-1">
                            {lang === 'en' ? 'Diagnosed pathology:' : 'Ugonjwa uliogunduliwa:'} <span className="text-zinc-300 font-semibold">{ticket.disease}</span> | {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-start md:self-auto">
                        <div className="grid grid-cols-2 gap-6 text-xs text-left">
                          <div>
                            <span className="text-zinc-500 font-medium uppercase tracking-wider block mb-0.5">{lang === 'en' ? 'Req Qty' : 'Kiasi'}</span>
                            <span className="text-zinc-200 font-bold text-sm">{ticket.quantity}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 font-medium uppercase tracking-wider block mb-0.5">{lang === 'en' ? 'Bids Placed' : 'Zabuni'}</span>
                            <span className="text-emerald-400 font-extrabold text-sm">{bidsCount} Offers</span>
                          </div>
                        </div>

                        <div className="text-zinc-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Ticket Expanded Details & Actions Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-zinc-800/80 bg-zinc-950/40 p-6 space-y-6"
                        >
                          {/* Specifications description */}
                          {ticket.description && (
                            <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-4 text-xs text-zinc-300 flex items-start gap-3">
                              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <p className="italic leading-relaxed">"{ticket.description}"</p>
                            </div>
                          )}

                          {/* ── AGROVET ACTION: SUBMIT PRICE BID FORM ── */}
                          {role === 'agrovet' && ticket.status === 'active' && !hasAgrovetBid && (
                            <form 
                              onSubmit={(e) => handlePlaceBid(e, ticket.id)}
                              className="bg-zinc-900/50 border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-inner"
                            >
                              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-400" />
                                {lang === 'en' ? 'Submit Competitive Price Offer' : 'Wasilisha Zabuni Yako ya Bei'}
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Bid Price (Ksh)' : 'Bei ya Zabuni (Ksh)'}</span>
                                  <div className="relative mt-2">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">KSH</span>
                                    <input 
                                      type="number"
                                      required
                                      value={bidPrice}
                                      onChange={(e) => setBidPrice(e.target.value)}
                                      placeholder="e.g. 1200"
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500/40"
                                    />
                                  </div>
                                </label>

                                <label className="block">
                                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Delivery Turnaround' : 'Muda wa Uwasilishaji'}</span>
                                  <select 
                                    value={bidDelivery}
                                    onChange={(e) => setBidDelivery(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/40 mt-2"
                                  >
                                    <option value="1">1 Day (Immediate)</option>
                                    <option value="2">2 Days</option>
                                    <option value="3">3 Days</option>
                                    <option value="5">5 Days</option>
                                  </select>
                                </label>
                              </div>

                              <label className="block">
                                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{lang === 'en' ? 'Short message for the farmer' : 'Ujumbe mfupi kwa mkulima'}</span>
                                <input 
                                  type="text"
                                  value={bidMessage}
                                  onChange={(e) => setBidMessage(e.target.value)}
                                  placeholder="e.g. We have premium Syngenta fungicide in stock. Fast delivery available."
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/40 mt-2"
                                />
                              </label>

                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                              >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {lang === 'en' ? 'Submit Bid' : 'Wasilisha Ofa'}
                              </button>
                            </form>
                          )}

                          {/* ── AGROVET ACTION: SHOWING PREVIOUS BID ── */}
                          {role === 'agrovet' && hasAgrovetBid && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between text-emerald-400 text-xs">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>
                                  {lang === 'en' 
                                    ? `You submitted a competitive bid of Ksh ${hasAgrovetBid.price} (${hasAgrovetBid.delivery_days} day delivery)`
                                    : `Uliwasilisha zabuni ya Ksh ${hasAgrovetBid.price} (Uwasilishaji wa siku ${hasAgrovetBid.delivery_days})`}
                                </span>
                              </div>
                              <span className="font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded text-[9px]">
                                {hasAgrovetBid.status}
                              </span>
                            </div>
                          )}

                          {/* ── BIDS OFFERS LIST (VISIBLE TO FARMERS & SYSTEM AGROVETS) ── */}
                          <div className="space-y-3">
                            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-zinc-500">
                              {lang === 'en' ? 'Submitted Offers' : 'Ofa Zilizowasilishwa'}
                            </h4>

                            {bidsCount === 0 ? (
                              <div className="text-center py-6 text-zinc-500 text-xs italic">
                                {lang === 'en' ? 'Waiting for local agrovets to place competitive bids...' : 'Kusubiri agrovets wa eneo kuwasilisha zabuni zao...'}
                              </div>
                            ) : (
                              <div className="grid gap-3">
                                {ticket.bids?.map((bid) => {
                                  const isBidAccepted = bid.status === 'accepted'
                                  
                                  return (
                                    <div 
                                      key={bid.id}
                                      className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                                        isBidAccepted
                                          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-md shadow-emerald-950/10'
                                          : 'bg-zinc-900/60 border-zinc-800/60'
                                      }`}
                                    >
                                      {/* Bid parameters */}
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <h5 className="font-bold text-white text-sm">{bid.agrovet_name}</h5>
                                          {isBidAccepted && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-zinc-950 px-2 py-0.5 text-[9px] font-bold">
                                              <CheckCircle2 className="w-3 h-3" />
                                              {lang === 'en' ? 'WINNING BID' : 'ZABUNI ILIYOSHINDA'}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {bid.message && (
                                          <p className="text-zinc-400 text-xs flex items-center gap-1.5 mb-2.5">
                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span>"{bid.message}"</span>
                                          </p>
                                        )}

                                        <div className="flex gap-4 flex-wrap text-xs text-zinc-500 font-medium">
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <b className="text-zinc-200">Ksh {bid.price}</b>
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <b className="text-zinc-200">{bid.delivery_days} {bid.delivery_days === 1 ? 'Day' : 'Days'}</b> {lang === 'en' ? 'delivery' : 'uwasilishaji'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Accept button (Visible only to Farmer who owns this ticket) */}
                                      {isTicketOwner && ticket.status === 'active' && (
                                        <button 
                                          onClick={() => handleAcceptBid(bid.id)}
                                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shrink-0 self-start md:self-auto"
                                        >
                                          {lang === 'en' ? 'Accept Offer' : 'Kubali Ofa'}
                                        </button>
                                      )}

                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                )
              })}
          </div>
        </div>

      </main>
    </div>
  )
}
