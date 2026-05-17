'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Globe, 
  Sun, 
  Moon, 
  MessageSquare, 
  Send, 
  Search, 
  ShieldCheck, 
  Users, 
  Store, 
  User, 
  Lock, 
  Loader2, 
  Wifi, 
  AlertCircle,
  Hash
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { translations } from '@/lib/translations'

interface Message {
  id: string
  user_id: string
  username: string
  role: string
  content: string
  created_at: string
}

interface ActiveUser {
  presenceGuid?: string
  username: string
  role: string
  online_at: string
}

export default function CommunityPage() {
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  // Auth & Profile states
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [userRole, setUserRole] = useState('farmer')

  // Chat states
  const [messages, setMessages] = useState<Message[]>([])
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Presence states
  const [onlineUsers, setOnlineUsers] = useState<ActiveUser[]>([])
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Initialize theme, lang, auth, messages, and realtime
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)
    document.documentElement.classList.toggle('light', finalTheme === 'light')

    // Fetch user and session
    const checkUserAndInit = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          setUser(currentUser)
          const namePart = currentUser.email?.split('@')[0] || 'Farmer'
          setUsername(namePart)
          const rolePart = currentUser.user_metadata?.role || 'farmer'
          setUserRole(rolePart)

          // Load historical community messages (latest 50)
          const { data: initialMsgs, error: fetchErr } = await supabase
            .from('community_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50)

          if (!fetchErr && initialMsgs) {
            setMessages(initialMsgs)
          }

          // Initialize Realtime subscriptions
          initRealtime(currentUser, namePart, rolePart)
        }
      } catch (err) {
        console.error('Error checking auth:', err)
      } finally {
        setAuthLoading(false)
      }
    }

    checkUserAndInit()

    return () => {
      supabase.channel('community_chat_room').unsubscribe()
      supabase.channel('presence_room').unsubscribe()
    }
  }, [])

  // Filter messages based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredMessages(
        messages.filter(
          m => m.content.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
        )
      )
    }
  }, [messages, searchQuery])

  // Scroll to bottom whenever messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages])

  // Initialize Realtime channels for chat messages and Presence tracking
  const initRealtime = (usr: any, name: string, role: string) => {
    // 1. Message Sync
    const chatChannel = supabase
      .channel('community_chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Prevent duplicates from local inserts
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
        }
      })

    // 2. Presence Tracking
    const presenceChannel = supabase.channel('presence_room', {
      config: { presence: { key: usr.id } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const usersList: ActiveUser[] = []
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any
          if (presences && presences[0]) {
            usersList.push({
              username: presences[0].username || 'Anonymous',
              role: presences[0].role || 'farmer',
              online_at: presences[0].online_at || new Date().toISOString()
            })
          }
        })
        setOnlineUsers(usersList)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            username: name,
            role,
            online_at: new Date().toISOString()
          })
        }
      })
  }

  // Handle message posting
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !user || chatLoading) return

    const tempText = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    try {
      const { data: newRow, error: insertError } = await supabase
        .from('community_messages')
        .insert([
          {
            user_id: user.id,
            username: username,
            role: userRole,
            content: tempText
          }
        ])
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      if (newRow) {
        setMessages(prev => {
          if (prev.some(m => m.id === newRow.id)) return prev
          return [...prev, newRow]
        })
      }
    } catch (err: any) {
      console.error('Failed to post message:', err)
      alert(lang === 'en' ? 'Classroom database sync delayed. Ensure migrations are fully applied.' : 'Hitilafu ya kuhifadhi mazungumzo. Hakikisha jedwali la community_messages limewekwa Supabase.')
    } finally {
      setChatLoading(false)
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

  // Beautiful Lock View if not signed in
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
            {lang === 'en' ? 'Registered Farmers Area' : 'Eneo la Wakulima Waliosajiliwa'}
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            {lang === 'en' 
              ? 'Connect directly with certified farmers and licensed agrovet experts in Nakuru County. Sign in to join the active digital chat community board.'
              : 'Wasiliana na wakulima wengine pamoja na wataalamu wa agrovets waliosajiliwa. Ingia ili kujiunga na ukurasa wa mazungumzo ya kilimo.'}
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
      <nav className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> {t.backToDashboard}
            </Link>
            <div className="w-px h-6 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">{lang === 'en' ? 'Community Hub' : 'Ukurasa wa Jamii'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime Status Pill */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${
              realtimeConnected 
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                : 'border-amber-500/20 bg-amber-500/5 text-amber-400 animate-pulse'
            }`}>
              <Wifi className="w-3 h-3 animate-pulse" />
              {realtimeConnected ? (lang === 'en' ? 'Live Sync' : 'Mawasiliano Safi') : (lang === 'en' ? 'Connecting...' : 'Kujiunga...')}
            </span>

            <Link href="/teachings" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Academy' : 'Chuo'}
            </Link>

            <Link href="/calendar" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Calendar' : 'Ratiba'}
            </Link>

            <Link href="/notes" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Diary' : 'Shajara'}
            </Link>

            <Link href="/estimator" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Estimator' : 'Kikokotoo'}
            </Link>

            <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
            </button>

            <button onClick={toggleTheme} className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </nav>

      {authLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        /* Workspace */
        <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 grid md:grid-cols-[260px_1fr] gap-6 items-stretch overflow-hidden h-[calc(100vh-88px)]">
          
          {/* Left Panel: Member Presence list */}
          <aside className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 flex flex-col justify-between hidden md:flex overflow-y-auto">
            <div>
              <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3.5 mb-4">
                <Users className="w-4.5 h-4.5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  {lang === 'en' ? 'Who is Online' : 'Waliopo Mtandaoni'}
                </h3>
              </div>

              {/* Stats chips */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-xl text-center">
                  <span className="block font-black text-white text-md">
                    {onlineUsers.filter(u => u.role === 'farmer').length}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">{lang === 'en' ? 'Farmers' : 'Wakulima'}</span>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-xl text-center">
                  <span className="block font-black text-white text-md">
                    {onlineUsers.filter(u => u.role === 'agrovet').length}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">{lang === 'en' ? 'Agrovets' : 'Agrovets'}</span>
                </div>
              </div>

              {/* User rows */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs">
                {onlineUsers.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/20 border border-zinc-850/40">
                    <div className="flex items-center gap-2 truncate">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-zinc-300 truncate">{u.username}</span>
                    </div>

                    <span className={`text-[8px] uppercase px-2 py-0.5 rounded border shrink-0 ${
                      u.role === 'agrovet'
                        ? 'text-blue-400 bg-blue-400/5 border-blue-400/20'
                        : 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                    }`}>
                      {u.role === 'agrovet' ? 'Agrovet' : 'Farmer'}
                    </span>
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <span className="text-zinc-600 block text-center py-4">{lang === 'en' ? 'Syncing users...' : 'Kusawazisha wanachama...'}</span>
                )}
              </div>
            </div>

            {/* User Profile display card */}
            <div className="bg-zinc-950/50 border border-zinc-850/60 p-4 rounded-2xl flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${
                userRole === 'agrovet' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {userRole === 'agrovet' ? <Store className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
              </div>
              <div className="truncate text-xs">
                <span className="font-extrabold text-white block truncate">{username}</span>
                <span className="text-[10px] text-zinc-500 capitalize">{userRole === 'agrovet' ? 'Agrovet Expert' : 'Registered Farmer'}</span>
              </div>
            </div>

          </aside>

          {/* Right Panel: Scrollable chat board and inputs */}
          <main className="bg-zinc-900/50 border border-zinc-850 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl relative">
            
            {/* Top Toolbar: Search and Filter */}
            <div className="px-6 py-3.5 border-b border-zinc-850/80 bg-zinc-900/30 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <Hash className="w-4.5 h-4.5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm">nakuru-regional-board</h3>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input 
                  type="text"
                  placeholder={lang === 'en' ? 'Search messages...' : 'Tafuta mazungumzo...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-emerald-500/30 text-white placeholder-zinc-700"
                />
              </div>
            </div>

            {/* Chat message board area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              
              {/* Notice Banner */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-start gap-3 max-w-2xl mx-auto mb-4 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-white uppercase tracking-wider">{lang === 'en' ? 'Nakuru County Crop Shield' : 'Kizuia Magonjwa cha Nakuru'}</h4>
                  <p className="text-zinc-400 leading-relaxed mt-1">
                    {lang === 'en' 
                      ? 'Welcome to Nakurus agricultural forum. Ask diagnostic advice, check local seed availability, or trade tips on drip setups. Keep discussions respectful and aligned to agriculture.'
                      : 'Karibu kwenye jamii ya kilimo ya Nakuru. Uliza ushauri, chunguza dawa za kuku au alizeti dukani, na fanya biashara kwa heshima.'}
                  </p>
                </div>
              </div>

              {/* Message loop */}
              {filteredMessages.map((m) => {
                const isMe = m.user_id === user.id
                const isAgro = m.role === 'agrovet'

                return (
                  <div key={m.id} className={`flex gap-3.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    
                    {/* User profile avatar (if not me) */}
                    {!isMe && (
                      <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 ${
                        isAgro ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {isAgro ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    )}

                    <div className="max-w-[75%] space-y-1">
                      {/* Name header */}
                      <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-extrabold text-zinc-400">{m.username}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[7px] uppercase font-bold border ${
                          isAgro
                            ? 'text-blue-400 bg-blue-400/5 border-blue-400/20'
                            : 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                        }`}>
                          {isAgro ? 'Agrovet' : 'Farmer'}
                        </span>
                        <span className="text-zinc-650 font-medium">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-emerald-500 text-zinc-950 font-bold rounded-tr-none shadow-md shadow-emerald-950/15'
                          : 'bg-zinc-900/60 text-zinc-200 rounded-tl-none border border-zinc-850/60'
                      }`}>
                        {m.content}
                      </div>

                    </div>

                  </div>
                )
              })}

              {/* Empty state */}
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-600">
                  <AlertCircle className="w-8 h-8 mb-2 text-zinc-700" />
                  <p className="text-xs">{lang === 'en' ? 'No messages matches search or board empty.' : 'Hakuna mazungumzo yoyote yaliyopatikana.'}</p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Composer toolbar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-850/80 bg-zinc-900/40 shrink-0 flex items-center gap-2">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === 'en' ? 'Type message to Nakuru community...' : 'Andika ujumbe kwa jamii ya Nakuru...'}
                className="flex-1 bg-zinc-950 border border-zinc-850 text-white rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-emerald-500/40"
              />
              <button 
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-650 text-zinc-950 rounded-xl font-bold transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </main>

        </div>
      )}

    </div>
  )
}
