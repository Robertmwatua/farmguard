'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, 
  Sun, 
  Moon, 
  Calendar as CalendarIcon, 
  Plus, 
  Droplet, 
  Eye, 
  FlaskConical, 
  Sprout, 
  Trophy, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  CalendarCheck,
  Check
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { translations } from '@/lib/translations'
import HamburgerMenuNav from '@/components/HamburgerMenuNav'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string // YYYY-MM-DD
  type: 'watering' | 'scouting' | 'fertilizer' | 'harvest' | 'event'
  crop_name?: string
}

interface SummitEvent {
  id: string
  title: string
  titleSw: string
  date: string
  location: string
  locationSw: string
  category: string
  categorySw: string
  organizer: string
  description: string
  descriptionSw: string
}

export default function CalendarPage() {
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  // Auth states
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Calendar states
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // Summits list state
  const [summits, setSummits] = useState<SummitEvent[]>([])
  const [summitsLoading, setSummitsLoading] = useState(false)
  const [addedSummitIds, setAddedSummitIds] = useState<string[]>([])

  // Modal / Form states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState<'watering' | 'scouting' | 'fertilizer' | 'harvest' | 'event'>('scouting')
  const [eventCrop, setEventCrop] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Initialize theme, lang, auth, and fetch data
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)
    document.documentElement.classList.toggle('light', finalTheme === 'light')

    const checkUserAndFetch = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          setUser(currentUser)
          
          // Fetch calendar events
          const { data: calendarRows, error } = await supabase
            .from('farmer_events')
            .select('*')
            .eq('user_id', currentUser.id)

          if (!error && calendarRows) {
            setEvents(calendarRows as CalendarEvent[])
          }

          // Fetch regional summits from API
          fetchSummits()
        }
      } catch (err) {
        console.error('Error fetching calendar data:', err)
      } finally {
        setAuthLoading(false)
      }
    }

    checkUserAndFetch()
  }, [])

  const fetchSummits = async () => {
    setSummitsLoading(true)
    try {
      const res = await fetch('/api/events')
      const payload = await res.json()
      if (payload.events) {
        setSummits(payload.events)
      }
    } catch (err) {
      console.error('Failed to fetch summits:', err)
    } finally {
      setSummitsLoading(false)
    }
  }

  // Add event handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTitle.trim() || !selectedDate || !user || formLoading) return

    setFormLoading(true)
    const newEvent = {
      user_id: user.id,
      title: eventTitle.trim(),
      type: eventType,
      date: selectedDate,
      crop_name: eventCrop.trim() || null,
      description: eventDesc.trim() || null
    }

    try {
      const { data: inserted, error } = await supabase
        .from('farmer_events')
        .insert([newEvent])
        .select()
        .single()

      if (!error && inserted) {
        setEvents((prev) => [...prev, inserted as CalendarEvent])
        setIsAddOpen(false)
        setEventTitle('')
        setEventCrop('')
        setEventDesc('')
      } else {
        throw error
      }
    } catch (err) {
      console.error('Failed to insert event:', err)
      alert(lang === 'en' ? 'Database connection sync delayed. Ensure migrations are fully applied.' : 'Kusawazisha hifadhidata kumesitishwa. Hakikisha jedwali la farmer_events limewekwa Supabase.')
    } finally {
      setFormLoading(false)
    }
  }

  // Quick addition of summits to the calendar
  const handleAddSummitToCalendar = async (summit: SummitEvent) => {
    if (!user) return
    const newEvent = {
      user_id: user.id,
      title: lang === 'en' ? summit.title : summit.titleSw,
      type: 'event' as const,
      date: summit.date,
      crop_name: 'General',
      description: lang === 'en' ? `${summit.organizer} - ${summit.location}` : `${summit.organizer} - ${summit.locationSw}`
    }

    try {
      const { data: inserted, error } = await supabase
        .from('farmer_events')
        .insert([newEvent])
        .select()
        .single()

      if (!error && inserted) {
        setEvents((prev) => [...prev, inserted as CalendarEvent])
        setAddedSummitIds((prev) => [...prev, summit.id])
      }
    } catch (err) {
      console.error('Failed to add summit:', err)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.replace("/")
  }

  // Calendar calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = {
    en: [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    sw: [
      'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 
      'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Disemba'
    ]
  }

  const daysOfWeek = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    sw: ['Jap', 'Jat', 'Jne', 'Jtano', 'Alh', 'Ijuma', 'Jmosi']
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay()
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  const formatCellDate = (dayNum: number) => {
    const padM = String(month + 1).padStart(2, '0')
    const padD = String(dayNum).padStart(2, '0')
    return `${year}-${padM}-${padD}`
  }

  // Type configuration mapping
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'watering':
        return { dot: 'bg-blue-400', border: 'border-blue-500/20 bg-blue-500/5 text-blue-400', label: lang === 'en' ? 'Watering' : 'Umwagiliaji', icon: Droplet }
      case 'scouting':
        return { dot: 'bg-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400', label: lang === 'en' ? 'Scouting' : 'Ukaguzi', icon: Eye }
      case 'fertilizer':
        return { dot: 'bg-amber-400', border: 'border-amber-500/20 bg-amber-500/5 text-amber-400', label: lang === 'en' ? 'Fertilization' : 'Mbolea', icon: FlaskConical }
      case 'harvest':
        return { dot: 'bg-yellow-400', border: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-450', label: lang === 'en' ? 'Harvest' : 'Mavuno', icon: Sprout }
      default:
        return { dot: 'bg-purple-400', border: 'border-purple-500/20 bg-purple-500/5 text-purple-400', label: lang === 'en' ? 'Summit/Expo' : 'Maonyesho', icon: CalendarIcon }
    }
  }

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

  // Lock panel if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-850 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/5 blur-[80px] rounded-full" />
          <Lock className="w-14 h-14 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white mb-3">
            {lang === 'en' ? 'Farming Calendar Locked' : 'Ratiba ya Kilimo Imefungwa'}
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            {lang === 'en' 
              ? 'Plot precision crop operations, sync watering schedules, and pin upcoming regional soil clinics. Log in to access your personal agronomist planner.'
              : 'Panga shughuli zako za kilimo, landanisha ratiba ya matone ya maji, na panga kliniki za udongo za mkoa. Ingia ili ufungue ratiba yako.'}
          </p>

          <Link href="/login" className="w-full flex items-center justify-center py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {lang === 'en' ? 'Sign In / Register Account' : 'Ingia kwenye Akaunti'}
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans pb-10 flex flex-col justify-between">
      
      {/* Navigation */}
      <HamburgerMenuNav
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        onSignOut={handleSignOut}
        backHref="/dashboard"
        backLabel={t.backToDashboard}
        pageTitle={lang === 'en' ? 'Farming Calendar' : 'Ratiba ya Ukulima'}
        pageTitleIcon={<CalendarIcon className="w-4 h-4 text-emerald-400" />}
        deferredPrompt={null}
      />

      {authLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        /* Workspace layout */
        <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 grid lg:grid-cols-[1fr_360px] gap-6 items-stretch overflow-hidden">
          
          {/* Left panel: Active Monthly Calendar Grid */}
          <main className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
            
            {/* Calendar controller */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-white capitalize leading-tight">
                  {monthNames[lang][month]} {year}
                </h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">
                  {lang === 'en' ? 'Water & scouting planner' : 'Ratiba ya umwagiliaji na ukaguzi'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-2 border border-zinc-800 bg-zinc-950/40 rounded-xl hover:border-emerald-500/30 text-zinc-400 hover:text-white transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={handleNextMonth} className="p-2 border border-zinc-800 bg-zinc-950/40 rounded-xl hover:border-emerald-500/30 text-zinc-400 hover:text-white transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="flex-1 flex flex-col justify-between min-h-[380px]">
              
              {/* Day header */}
              <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                {daysOfWeek[lang].map((d, idx) => (
                  <span key={idx} className="text-[10px] uppercase font-black tracking-wider text-zinc-500">{d}</span>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-2.5 flex-1">
                {calendarDays.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={idx} className="bg-zinc-950/5 border border-transparent rounded-2xl min-h-[50px]" />
                  }

                  const cellDate = formatCellDate(dayNum)
                  const dayEvents = events.filter((e) => e.date === cellDate)
                  const isSelected = selectedDate === cellDate
                  const isToday = new Date().toISOString().split('T')[0] === cellDate

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDate(cellDate)
                        setIsAddOpen(true)
                      }}
                      className={`relative min-h-[60px] p-2.5 border rounded-2xl text-left flex flex-col justify-between transition-all hover:bg-zinc-900/40 select-none group ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/5 text-white' 
                          : isToday
                            ? 'border-emerald-500/30 bg-zinc-900/60 text-white'
                            : 'border-zinc-850 bg-zinc-950/20 text-zinc-400'
                      }`}
                    >
                      <span className={`text-[10px] font-black ${isToday ? 'text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md' : ''}`}>
                        {dayNum}
                      </span>

                      {/* Event visual indicator dots */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dayEvents.slice(0, 3).map((e) => {
                          const conf = getTypeStyle(e.type)
                          return (
                            <span 
                              key={e.id}
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${conf.dot}`}
                              title={e.title}
                            />
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[7px] text-zinc-500 font-bold">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

            </div>

          </main>

          {/* Right panel: Events list & regional expos (Feature 5) */}
          <aside className="space-y-6 flex flex-col">
            
            {/* Interactive regional agricultural summits (Feature 5) */}
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 flex-1 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-3 mb-4 shrink-0">
                  <CalendarCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
                      {lang === 'en' ? 'Regional Agri Events' : 'Maonyesho ya Mkoa'}
                    </h3>
                    <p className="text-[8px] text-zinc-550 uppercase tracking-widest font-black mt-0.5">Summits & soil clinics</p>
                  </div>
                </div>

                {summitsLoading ? (
                  <div className="py-12 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                    {summits.map((sum) => {
                      const isAdded = addedSummitIds.includes(sum.id)
                      const itemTitle = lang === 'en' ? sum.title : sum.titleSw
                      const itemLoc = lang === 'en' ? sum.location : sum.locationSw
                      const itemCat = lang === 'en' ? sum.category : sum.categorySw
                      const itemDesc = lang === 'en' ? sum.description : sum.descriptionSw

                      return (
                        <div key={sum.id} className="bg-zinc-950/40 border border-zinc-850/60 p-4 rounded-2xl text-xs space-y-2 relative overflow-hidden">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              {itemCat}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold">{sum.date}</span>
                          </div>

                          <h4 className="font-extrabold text-white leading-snug">{itemTitle}</h4>
                          <p className="text-zinc-400 text-[10px] leading-relaxed">{itemDesc}</p>

                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{itemLoc}</span>
                          </div>

                          <button
                            onClick={() => handleAddSummitToCalendar(sum)}
                            disabled={isAdded}
                            className={`w-full py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                              isAdded
                                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                                : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-350 hover:text-white'
                            }`}
                          >
                            {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            <span>{isAdded ? (lang === 'en' ? 'Added to Calendar' : 'Imeongezwa kwenye Ratiba') : (lang === 'en' ? 'Add to My Calendar' : 'Weka kwenye Ratiba')}</span>
                          </button>
                        </div>
                      )
                    })}
                    {summits.length === 0 && (
                      <span className="text-zinc-650 block text-center py-6 text-xs">{lang === 'en' ? 'No expos found.' : 'Hakuna maonyesho yaliyopatikana.'}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

          </aside>

        </div>
      )}

      {/* Dynamic Drawer / Modal to Quick-Add custom Events */}
      <AnimatePresence>
        {isAddOpen && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-850 w-full max-w-md rounded-3xl p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-850 mb-5">
                <div>
                  <h3 className="font-extrabold text-white text-md">
                    {lang === 'en' ? 'Add Field Activity' : 'Ongeza Shughuli ya Shambani'}
                  </h3>
                  <p className="text-[10px] text-zinc-550 font-bold tracking-wider mt-0.5">{selectedDate}</p>
                </div>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white hover:border-zinc-700 transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Show events scheduled for this day */}
              {events.filter(e => e.date === selectedDate).length > 0 && (
                <div className="mb-5 space-y-2">
                  <span className="text-[9px] uppercase font-black tracking-wider text-zinc-500 block mb-1">
                    {lang === 'en' ? 'Tasks Scheduled Today' : 'Kazi Zilizopangwa Leo'}
                  </span>
                  <div className="max-h-[100px] overflow-y-auto space-y-2 pr-1">
                    {events.filter(e => e.date === selectedDate).map((e) => {
                      const style = getTypeStyle(e.type)
                      const Icon = style.icon
                      return (
                        <div key={e.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${style.border}`}>
                          <div className="flex items-center gap-2 truncate">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-bold truncate">{e.title}</span>
                          </div>
                          {e.crop_name && <span className="text-[8px] uppercase tracking-wide opacity-80">{e.crop_name}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Event creation form */}
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                    {lang === 'en' ? 'Task Title' : 'Jina la Kazi'}
                  </label>
                  <input 
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Water Tomato plot, Weed Maize' : 'mfano. Mwagilia nyanya, Palilia mahindi'}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3.5 text-xs focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                      {lang === 'en' ? 'Task Category' : 'Aina ya Kazi'}
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3 text-xs focus:outline-none focus:border-emerald-500/40"
                    >
                      <option value="scouting">{lang === 'en' ? '🔍 Scouting' : '🔍 Ukaguzi'}</option>
                      <option value="watering">{lang === 'en' ? '💧 Watering' : '💧 Umwagiliaji'}</option>
                      <option value="fertilizer">{lang === 'en' ? '🧪 Fertilization' : '🧪 Mbolea'}</option>
                      <option value="harvest">{lang === 'en' ? '🌾 Harvest' : '🌾 Mavuno'}</option>
                      <option value="event">{lang === 'en' ? '📅 Summit/Event' : '📅 Kongamano'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                      {lang === 'en' ? 'Target Crop' : 'Zao Muhimu'}
                    </label>
                    <input 
                      type="text"
                      value={eventCrop}
                      onChange={(e) => setEventCrop(e.target.value)}
                      placeholder={lang === 'en' ? 'Tomato, Maize, Coffee' : 'Nyanya, Mahindi, Kahawa'}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3.5 text-xs focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                    {lang === 'en' ? 'Description (Optional)' : 'Maelezo ya Ziada (Hiari)'}
                  </label>
                  <textarea 
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder={lang === 'en' ? 'Specify water amount or diagnostic findings' : 'Eleza kwa kifupi kiasi cha maji au dawa inayohitajika'}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3.5 text-xs focus:outline-none focus:border-emerald-500/40 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{lang === 'en' ? 'Add Event to Calendar' : 'Hifadhi Kazi kwenye Ratiba'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
