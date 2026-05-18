'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck, 
  Activity, 
  Droplet, 
  Sprout, 
  Info, 
  ShieldAlert, 
  Loader2, 
  ListChecks,
  Globe,
  Sun,
  Moon,
  LogOut,
  Bot,
  Send,
  Mic,
  MessageSquare,
  Volume2,
  VolumeX
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import WeatherWidget from '@/components/WeatherWidget'
import NearbyAgrovets from '@/components/NearbyAgrovets'
import { translations } from '@/lib/translations'
import HamburgerMenuNav from '@/components/HamburgerMenuNav'

function formatBulletText(value?: string | null) {
  if (!value) return []

  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function getTreatmentNeeded(disease?: string | null) {
  const normalizedDisease = disease?.toLowerCase() ?? ''

  if (normalizedDisease.includes('blight') || normalizedDisease.includes('fung')) {
    return 'fungicide'
  }

  if (normalizedDisease.includes('insect') || normalizedDisease.includes('pest')) {
    return 'insecticide'
  }

  if (normalizedDisease.includes('bacterial')) {
    return 'copper oxychloride'
  }

  return 'fungicide'
}

export default function ScanDetails() {
  const params = useParams()
  const id = params.id as string
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Multi-language & Theme support
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // AI Copilot Summary state
  const [summary, setSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true)

  // AI Copilot Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scan-to-Tracker Pipeline states
  const [user, setUser] = useState<any>(null)
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [trackerSeeded, setTrackerSeeded] = useState(false)

  // Fetch logged in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser(currentUser)
      }
    })
  }, [])

  // Sync preferences from storage
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

  useEffect(() => {
    if (id) {
      fetchScan(id)
    }
  }, [id])

  const fetchScan = async (scanId: string) => {
    const { data: dbData } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (dbData) {
      setData(dbData)
    }
    setLoading(false)
  }

  // Fetch Point-form Summary from Gemini when scan data loads
  useEffect(() => {
    if (data) {
      void fetchSummary()
      
      const welcome = lang === 'en'
        ? `Hello! I am your AI Agronomist Copilot. I have analyzed this leaf. Let me know if you have questions about treating this ${data.plant_name}!`
        : `Habari! Mimi ni Copilot wako wa AI. Nimechunguza jani hili. Nifahamishe kama una maswali kuhusu kutibu ${data.plant_name} huyu!`
      
      setChatMessages([
        { role: 'bot', content: welcome }
      ])
    }
  }, [data, lang])

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true)
      const res = await fetch('/api/scan-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantName: data.plant_name,
          disease: data.disease,
          confidence: data.confidence,
          healthStatus: data.health_status
        })
      })
      const payload = await res.json()
      setSummary(payload.summary)
    } catch {
      setSummary(lang === 'en'
        ? "- Observation: Pathological leaf spots identified.\n- Cause: Environmental spore deposits.\n- Step: Apply copper or mancozeb coverage immediately.\n- Monitor: Scout nearby plants daily."
        : "- Uchunguzi: Madoa ya ugonjwa yamegunduliwa kwenye jani.\n- Chanzo: Unyevu mwingi au upepo shambani.\n- Hatua: Puliza copper au mancozeb mara moja.\n- Chunguza: Angalia mimea ya jirani kila siku."
      )
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleSeedTracker = async () => {
    if (!user || !data || trackerLoading) return
    setTrackerLoading(true)

    try {
      const userId = user.id
      const plantName = data.plant_name || 'Plant'
      const isOptimal = data.health_status === 'Optimal'

      // 1. Seed tasks in LocalStorage Care Tracker
      const savedTasks = localStorage.getItem(`farmguard_tasks_${userId}`)
      let tasksDict = savedTasks ? JSON.parse(savedTasks) : {}

      // Customized premium tasks based on scan health status
      const tasksToSeed = isOptimal ? [
        { id: `t1-${Date.now()}`, text: `Daily morning drip irrigation for ${plantName} (2L)`, completed: false },
        { id: `t2-${Date.now()}`, text: `Mulch ${plantName} root base with dry straw`, completed: false },
        { id: `t3-${Date.now()}`, text: `Apply organic compost around ${plantName} canopy border`, completed: false },
        { id: `t4-${Date.now()}`, text: `Spray cold-pressed Neem Oil at dusk as proactive barrier`, completed: false },
        { id: `t5-${Date.now()}`, text: `Scout leaves weekly for early insect vectors`, completed: false }
      ] : [
        { id: `t1-${Date.now()}`, text: `Isolate and quarantine infected parts of ${plantName}`, completed: false },
        { id: `t2-${Date.now()}`, text: `Mix 30ml Neem + 5ml organic soap in 5L water and spray leaf surfaces`, completed: false },
        { id: `t3-${Date.now()}`, text: `Water early morning only to avoid moisture on leaves`, completed: false },
        { id: `t4-${Date.now()}`, text: `Prune and safely discard diseased leaf branches`, completed: false },
        { id: `t5-${Date.now()}`, text: `Check surrounding plants daily for disease transmission`, completed: false }
      ]

      tasksDict[plantName] = tasksToSeed
      localStorage.setItem(`farmguard_tasks_${userId}`, JSON.stringify(tasksDict))

      // 2. Seed calendar events in Supabase farmer_events
      const today = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      
      const generateDate = (daysAhead: number) => {
        const d = new Date(today)
        d.setDate(today.getDate() + daysAhead)
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }

      const eventsToInsert = [
        {
          user_id: userId,
          title: `💧 Water ${plantName}`,
          date: generateDate(1),
          type: 'watering',
          crop_name: plantName,
          description: `Early morning deep watering for ${plantName}.`
        },
        {
          user_id: userId,
          title: `💧 Water ${plantName}`,
          date: generateDate(3),
          type: 'watering',
          crop_name: plantName,
          description: `Early morning deep watering for ${plantName}.`
        },
        {
          user_id: userId,
          title: `💧 Water ${plantName}`,
          date: generateDate(5),
          type: 'watering',
          crop_name: plantName,
          description: `Early morning deep watering for ${plantName}.`
        },
        {
          user_id: userId,
          title: `🔍 Scout ${plantName} check`,
          date: generateDate(7),
          type: 'scouting',
          crop_name: plantName,
          description: `Perform full leaf and stem diagnostics for ${plantName} to monitor progress.`
        }
      ]

      const { error } = await supabase
        .from('farmer_events')
        .insert(eventsToInsert)

      if (error) throw error

      setTrackerSeeded(true)
    } catch (err) {
      console.error('Failed to seed tracker & calendar:', err)
      alert(lang === 'en' ? 'Database connection sync delayed. Ensure migrations are fully applied.' : 'Kusawazisha hifadhidata kumesitishwa. Hakikisha jedwali la farmer_events limewekwa Supabase.')
    } finally {
      setTrackerLoading(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantName: data.plant_name,
          disease: data.disease,
          confidence: data.confidence,
          healthStatus: data.health_status,
          recommendation: data.recommendation,
          messages: chatMessages.concat({ role: 'user', content: userMsg }).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })
      const payload = await res.json()
      setChatMessages(prev => [...prev, { role: 'bot', content: payload.content }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'bot', content: lang === 'en' ? 'Connection dropped. Please try again.' : 'Hitilafu ya mtandao. Tafadhali jaribu tena.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // Voice Recognition inside scan chat
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert(lang === 'en' ? 'Speech recognition not supported.' : 'Utambuzi wa sauti hauhimiliwi.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = lang === 'sw' ? 'sw-KE' : 'en-US'

    rec.onstart = () => setIsListening(true)
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setChatInput(transcript)
    }

    recognitionRef.current = rec
    rec.start()
  }

  // Voice Read-Aloud Narration Player
  const speakAdvice = () => {
    if (typeof window === 'undefined') return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const plant = data.plant_name
    const disease = data.disease
    const health = data.health_status
    const recText = data.recommendation

    let narrativeText = ''
    if (lang === 'en') {
      narrativeText = `FarmGuard Intelligence Report for ${plant}. Identified crop condition is ${disease} with health status ${health}. Immediate Treatment Protocol is as follows: ${recText}`
    } else {
      narrativeText = `Ripoti ya FarmGuard ya ${plant}. Ugonjwa uliopatikana kwenye mmea ni ${disease} ukiwa na hali ya afya ${health}. Utaratibu wa matibabu ya haraka ni kama ifuatavyo: ${recText}`
    }

    const utterance = new SpeechSynthesisUtterance(narrativeText)

    // Match Swahili vs English speech synthesis voices
    const voices = window.speechSynthesis.getVoices()
    if (lang === 'sw') {
      const swVoice = voices.find(v => v.lang.startsWith('sw') || v.name.toLowerCase().includes('swahili'))
      if (swVoice) utterance.voice = swVoice
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en') || v.name.toLowerCase().includes('english'))
      if (enVoice) utterance.voice = enVoice
    }

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.replace("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-emerald-400 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p>Loading scan intelligence...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <h1 className="text-2xl">Scan record not found in database.</h1>
      </div>
    )
  }

  const getStyleForHealth = (health: string) => {
    if (health === 'Optimal') return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', bar: 'bg-emerald-400' }
    if (health === 'Moderate') return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', bar: 'bg-yellow-400' }
    return { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', bar: 'bg-red-400' }
  }

  const styles = getStyleForHealth(data.health_status || 'Moderate')
  const farmerSummaryItems = formatBulletText(data.farmer_summary)
  const treatmentNeeded = getTreatmentNeeded(data.disease)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans pb-24 transition-colors duration-300">
      
      {/* Navigation */}
      <HamburgerMenuNav
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        onSignOut={handleSignOut}
        backHref="/dashboard"
        backLabel={t.backToDashboard}
        pageTitle={data ? `${data.plant_name} ${t.intelligenceReport}` : 'Scan Report'}
        pageTitleIcon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        deferredPrompt={null}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Navigator Tabs */}
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-1 text-2xl font-bold text-white flex items-center gap-3 flex-wrap">
                <span>{data.plant_name} {t.intelligenceReport}</span>
                <button
                  onClick={speakAdvice}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] ${
                    isSpeaking 
                      ? 'bg-red-500 border-red-400 text-white animate-pulse'
                      : 'bg-emerald-500 border-emerald-400 text-zinc-950 hover:bg-emerald-400 hover:scale-105 active:scale-95'
                  }`}
                  title={lang === 'en' ? 'Narrate Report' : 'Sikiliza Ripoti'}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isSpeaking ? (lang === 'en' ? 'Stop Audio' : 'Zima Sauti') : (lang === 'en' ? '🔊 Read Aloud' : '🔊 Sikiliza Ripoti')}</span>
                </button>
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {t.jumpDesc}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="#summary" className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                {t.summary}
              </a>
              <a href="#overview" className="rounded-lg border border-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                {t.diagnosis}
              </a>
              <a href="#treatment" className="rounded-lg border border-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                {t.treatment}
              </a>
              <a href="#weather" className="rounded-lg border border-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                {t.weather}
              </a>
              <a href="#agrovets" className="rounded-lg border border-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                {t.agrovets}
              </a>
            </div>
          </div>
        </div>

        {/* Dynamic 3-Column Grounded Workspace */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid lg:grid-cols-[1fr_380px] gap-8"
        >
          
          {/* Left Panel */}
          <div className="space-y-6">
            
            <div className="grid md:grid-cols-2 gap-6 items-start">
              
              {/* Left Column */}
              <div className="space-y-6">
                <motion.div variants={itemVariants} className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.image_url} alt={data.plant_name} className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-zinc-950/50 ${styles.border} ${styles.color}`}>
                      {data.health_status}
                    </span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                  <h1 className="text-3xl font-extrabold text-white mb-2">{data.plant_name}</h1>
                  <p className="text-zinc-400 mb-6 flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4" /> {lang === 'en' ? 'Scanned' : 'Ilichunguzwa'} {new Date(data.created_at).toLocaleString()}
                  </p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-zinc-800/50 text-sm">
                      <span className="text-zinc-500 font-medium">{t.detectedCondition}</span>
                      <span className={`font-bold ${styles.color}`}>{data.disease}</span>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-zinc-500 font-medium">{t.confidence}</span>
                        <span className="text-sm font-bold text-white">{data.confidence}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${data.confidence}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full rounded-full ${styles.bar}`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Medicine Advice Card + 🔊 SPEAK USHAURI PLAYER */}
                <motion.div variants={itemVariants} className="bg-zinc-900/50 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-emerald-950/10">
                  
                  {/* Speaker Toggler inside Medicine Prescription Box */}
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        {data.health_status === 'Optimal' ? (
                          <Sprout className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Droplet className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          {data.health_status === 'Optimal' 
                            ? (lang === 'en' ? 'Proactive Upkeep' : 'Utunzaji wa Mmea') 
                            : t.prescription}
                        </h3>
                        <p className="text-xs text-zinc-500 capitalize">
                          {data.health_status === 'Optimal' 
                            ? (lang === 'en' ? 'Optimal Upkeep Shield' : 'Hali ya Mmea ni Salama') 
                            : `${treatmentNeeded} Match`}
                        </p>
                      </div>
                    </div>

                    {/* Audio read-aloud trigger */}
                    <button
                      onClick={speakAdvice}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        isSpeaking 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                      title={lang === 'en' ? 'Narrate Diagnostics' : 'Sikiliza Ripoti'}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Stop' : 'Zima'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Listen' : 'Sikiliza'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-sm text-zinc-300 leading-relaxed mb-6">
                    {data.health_status === 'Optimal' ? (
                      <p>
                        {lang === 'en' 
                          ? 'Your crop is in highly optimal condition! To preserve this health, execute deep-root irrigation in early mornings, apply compost rich in trace minerals, ensure weed-free rows, and apply cold-pressed Neem Oil sprays at dusk as a protective organic shield.'
                          : 'Mmea wako una afya tele kwa sasa! Ili kulinda afya hii, mwagilia maji asubuhi na mapema, changanya mbolea ya samadi kiasili, safisha magugu yote, na upulize mafuta ya mwarobaini kuzuia wadudu waharibifu.'}
                      </p>
                    ) : (
                      <>
                        {treatmentNeeded === 'fungicide' && (
                          <p>
                            {lang === 'en' 
                              ? 'Apply a systemic, broad-spectrum fungicide containing Metalaxyl-M or Mancozeb 80% WP. Dilute at 50g per 20L of water and spray leaf surfaces thoroughly. Repeat every 7-10 days.'
                              : 'Nyunyizia fungicide yenye Metalaxyl-M au Mancozeb 80% WP. Changanya gramu 50 kwa lita 20 za maji na upulize majani yote. Rudia kila baada ya siku 7-10.'}
                          </p>
                        )}
                        {treatmentNeeded === 'insecticide' && (
                          <p>
                            {lang === 'en' 
                              ? 'Apply a premium insecticide containing Emamectin Benzoate 5% SG or Chlorantraniliprole. Direct spray into leaf whorls. Apply early morning or late evening.'
                              : 'Nyunyizia insecticide yenye Emamectin Benzoate 5% SG au Chlorantraniliprole. Puliza katikati ya majani asubuhi na mapema au jioni.'}
                          </p>
                        )}
                        {treatmentNeeded === 'copper oxychloride' && (
                          <p>
                            {lang === 'en' 
                              ? 'Treat with copper bactericide containing Copper Oxychloride 50% WP. Ensure full canopy coverage. Avoid applying in high temperatures.'
                              : 'Tibu kwa dawa ya kuzuia bakteria yenye Copper Oxychloride 50% WP. Hakikisha inapulizwa kwenye mmea mzima. Epuka kupuliza wakati wa jua kali.'}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {data.health_status === 'Optimal' ? (
                    <Link 
                      href="/teachings"
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] focus:outline-none"
                    >
                      <Sprout className="w-4 h-4" />
                      {lang === 'en' ? 'Open Academy Lessons' : 'Fungua Mafunzo ya Kilimo'}
                    </Link>
                  ) : (
                    <a 
                      href="#agrovets"
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] focus:outline-none"
                    >
                      <Sprout className="w-4 h-4" />
                      {t.purchaseNow}
                    </a>
                  )}
                </motion.div>

                {/* Scan-to-Tracker Pipeline Prompt (Feature 8) */}
                {user && (
                  <motion.div 
                    variants={itemVariants}
                    className="bg-zinc-900/60 border border-zinc-850 p-6 rounded-3xl relative overflow-hidden"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 blur-[35px] rounded-full pointer-events-none" />
                    
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                        <Activity className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-white text-sm">
                          {lang === 'en' ? '🔄 Track Crop Operations?' : '🔄 Fuatilia Maendeleo ya Mmea?'}
                        </h4>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          {lang === 'en'
                            ? `Seed a dedicated care checklist in your Care Tracker and schedule 3 dynamic early morning watering cycles in your calendar for this ${data.plant_name}.`
                            : `Hifadhi orodha maalum ya kazi za utunzaji na upange ratiba ya kumwagilia maji mara 3 kwenye kalenda ya ${data.plant_name} huyu.`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      {trackerSeeded ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 rounded-2xl">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>
                            {lang === 'en' 
                              ? 'Setup successful! Check your Dashboard Tracker and Farming Calendar.'
                              : 'Ratiba imewekwa! Angalia Kazi zako na Kalenda yako.'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={handleSeedTracker}
                          disabled={trackerLoading}
                          className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:bg-zinc-800 disabled:text-zinc-650 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          {trackerLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>
                            {lang === 'en'
                              ? 'Yes, Seed Tracker & Calendar'
                              : 'Ndio, Weka kwenye Tracker na Kalenda'}
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Right Column */}
              <div className="space-y-6">
                
                {/* Farmer Summary */}
                <motion.div id="summary" variants={itemVariants} className="scroll-mt-28 bg-emerald-500/10 border border-emerald-400/20 rounded-3xl p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                    {t.quickSummary}
                  </h2>
                  {farmerSummaryItems.length > 0 ? (
                    <ul className="space-y-3">
                      {farmerSummaryItems.map((item, index) => (
                        <li key={index} className="flex gap-3 text-zinc-200 leading-relaxed text-sm">
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-300 leading-relaxed text-sm">
                      {t.quickSummaryDesc}
                    </p>
                  )}
                </motion.div>
                
                {/* Explanation */}
                <motion.div id="overview" variants={itemVariants} className="scroll-mt-28 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-emerald-400" />
                    {t.diagnosticOverview}
                  </h2>
                  <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-line">
                    {data.diagnostic_overview || `This is a dynamically generated report for the ${data.plant_name} crop indicating signs of ${data.disease}. Continuous monitoring and appropriate intervention based on these findings is strongly advised.`}
                  </p>
                </motion.div>

                {/* Treatments */}
                <motion.div id="treatment" variants={itemVariants} className="scroll-mt-28 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldAlert className="w-32 h-32 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Droplet className="w-5 h-5 text-emerald-400" />
                    {t.immediateProtocol}
                  </h2>
                  <div className="space-y-4 relative z-10 text-zinc-300 leading-relaxed text-sm whitespace-pre-line">
                    {data.recommendation}
                  </div>
                </motion.div>

                {/* Recommendations */}
                <motion.div id="prevention" variants={itemVariants} className="scroll-mt-28 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-emerald-400" />
                    {t.longTerm}
                  </h2>
                  <div className="space-y-4 text-zinc-300 leading-relaxed text-sm whitespace-pre-line">
                    {data.long_term_recommendations || "Maintain field monitoring and optimize irrigation schedules to avoid crop stress."}
                  </div>
                </motion.div>

              </div>

            </div>

          </div>

          {/* Right Panel Sidebar */}
          <aside className="space-y-6">
            
            {/* AI Summary Card */}
            <motion.div 
              variants={itemVariants}
              className="bg-zinc-900/70 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
              
              <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                {lang === 'en' ? 'AI Diagnostic Summary' : 'Muhtasari wa AI'}
              </h3>

              {summaryLoading ? (
                <div className="flex items-center gap-3 py-6 text-zinc-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Generating point-form overview...</span>
                </div>
              ) : (
                <div className="text-sm text-zinc-300 space-y-3 leading-relaxed whitespace-pre-line border-b border-zinc-800/80 pb-4 mb-4">
                  {summary}
                </div>
              )}
            </motion.div>

            {/* Copilot Chat Box */}
            <motion.div 
              variants={itemVariants}
              className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 h-[400px] flex flex-col justify-between shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                    {lang === 'en' ? 'Agronomist Copilot' : 'Copilot wa Kilimo'}
                  </span>
                </div>
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent text-xs mb-3">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl ${
                      m.role === 'user'
                        ? 'bg-emerald-500 text-zinc-950 font-medium rounded-tr-none'
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                      <span className="text-[10px] text-zinc-400">Analysing query...</span>
                    </div>
                  </div>
                )}
                {isListening && (
                  <div className="flex justify-start">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-2xl rounded-tl-none flex items-center gap-1.5 animate-pulse text-[10px] text-emerald-400 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {t.voiceStart}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-1.5 shrink-0 relative">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={lang === 'en' ? "Ask about this crop..." : "Uliza kuhusu mmea huu..."}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-2.5 pl-3 pr-9 text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      isListening ? 'bg-red-500/10 text-red-400 animate-pulse' : 'text-zinc-600 hover:text-emerald-400'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-600 rounded-xl font-bold transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>

          </aside>

        </motion.div>

        {/* Weather Context */}
        <section id="weather" className="mt-10 scroll-mt-28">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {t.weatherContext}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">{t.microclimate}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t.microclimateSub}
              </p>
            </div>
            <a href="#agrovets" className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300">
              {lang === 'en' ? 'Go to agrovets' : 'Nenda kwa agrovets'}
            </a>
          </div>
          <WeatherWidget />
        </section>

        {/* Treatment Marketplace */}
        <section id="agrovets" className="mt-10 scroll-mt-28">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Soko la Matibabu
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">{t.nearbyAgrovets}</h2>
              <p className="mt-1 max-w-3xl text-sm text-zinc-500">
                {t.marketplaceDesc}
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {t.treatmentNeededText}: {treatmentNeeded}
            </span>
          </div>
          <NearbyAgrovets treatmentNeeded={treatmentNeeded} />
        </section>
      </main>
    </div>
  )
}
