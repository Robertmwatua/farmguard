'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
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
  Hash,
  Trash2,
  Edit2,
  Check,
  X,
  MoreVertical
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { translations } from '@/lib/translations'
import HamburgerMenuNav from '@/components/HamburgerMenuNav'

interface Message {
  id: string
  user_id: string
  username: string
  role: string
  content: string
  created_at: string
  updated_at?: string
  is_deleted?: boolean
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
  
  // Edit states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  
  // Menu states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Presence states
  const [onlineUsers, setOnlineUsers] = useState<ActiveUser[]>([])
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Refs to store channel instances for cleanup
  const chatChannelRef = useRef<any>(null)
  const presenceChannelRef = useRef<any>(null)

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

          // Load historical community messages (latest 50) - only non-deleted
          const { data: initialMsgs, error: fetchErr } = await supabase
            .from('community_messages')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(50)

          if (!fetchErr && initialMsgs) {
            setMessages(initialMsgs)
          }

          // Initialize Realtime subscriptions
          await initRealtime(currentUser, namePart, rolePart)
        }
      } catch (err) {
        console.error('Error checking auth:', err)
      } finally {
        setAuthLoading(false)
      }
    }

    checkUserAndInit()

    // Click outside handler for menus
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    
    // CLEANUP FUNCTION
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      
      // Clean up chat channel if it exists
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current)
        chatChannelRef.current = null
      }
      
      // Clean up presence channel if it exists
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
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
  const initRealtime = async (usr: any, name: string, role: string) => {
    // 1. Message Sync Channel - Listen for INSERT, UPDATE, DELETE
    const chatChannel = supabase
      .channel('community_chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          const newMsg = payload.new as Message
          // Only add if not deleted
          if (!newMsg.is_deleted) {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_messages' },
        (payload) => {
          const updatedMsg = payload.new as Message
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === updatedMsg.id ? updatedMsg : msg
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_messages' },
        (payload) => {
          const deletedMsg = payload.old as Message
          setMessages((prev) => prev.filter(msg => msg.id !== deletedMsg.id))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
          console.log('Successfully connected to community chat channel')
        }
      })

    // Store channel reference for cleanup
    chatChannelRef.current = chatChannel

    // 2. Presence Tracking Channel
    const presenceChannel = supabase
      .channel('presence_room', {
        config: { presence: { key: usr.id } }
      })
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
            role: role,
            online_at: new Date().toISOString()
          })
          console.log('Successfully connected to presence channel')
        }
      })

    // Store presence channel reference for cleanup
    presenceChannelRef.current = presenceChannel
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
            content: tempText,
            is_deleted: false
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
      alert(lang === 'en' ? 'Failed to send message. Please try again.' : 'Hitilafu ya kutuma ujumbe. Tafadhali jaribu tena.')
    } finally {
      setChatLoading(false)
    }
  }

  // Handle message edit
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim() || !user) return

    try {
      const { error: updateError } = await supabase
        .from('community_messages')
        .update({ 
          content: newContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user can only edit their own messages

      if (updateError) {
        throw updateError
      }

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent.trim(), updated_at: new Date().toISOString() }
            : msg
        )
      )
      
      // Clear edit mode
      setEditingMessageId(null)
      setEditingContent('')
      
      // Show success feedback
      if (lang === 'en') {
        // Optional: show toast notification
        console.log('Message edited successfully')
      }
    } catch (err: any) {
      console.error('Failed to edit message:', err)
      alert(lang === 'en' ? 'Failed to edit message. Please try again.' : 'Hitilafu ya kuhariri ujumbe. Tafadhali jaribu tena.')
    }
  }

  // Handle message delete (soft delete)
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return

    const confirmMessage = lang === 'en' 
      ? 'Are you sure you want to delete this message? This action cannot be undone.'
      : 'Una uhakika unataka kufuta ujumbe huu? Hatua hii haiwezi kubatilishwa.'

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      // Soft delete - mark as deleted
      const { error: deleteError } = await supabase
        .from('community_messages')
        .update({ 
          is_deleted: true,
          content: lang === 'en' ? '[Message deleted]' : '[Ujumbe umefutwa]'
        })
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user can only delete their own messages

      if (deleteError) {
        throw deleteError
      }

      // Remove from local state immediately for better UX
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      
      // Close menu if open
      setActiveMenuId(null)
      
      // Show success feedback
      if (lang === 'en') {
        console.log('Message deleted successfully')
      }
    } catch (err: any) {
      console.error('Failed to delete message:', err)
      alert(lang === 'en' ? 'Failed to delete message. Please try again.' : 'Hitilafu ya kufuta ujumbe. Tafadhali jaribu tena.')
    }
  }

  // Handle hard delete (permanent deletion - admin only)
  const handleHardDeleteMessage = async (messageId: string) => {
    if (!user || userRole !== 'admin') return

    const confirmMessage = lang === 'en' 
      ? '⚠️ ADMIN: Permanently delete this message? This action cannot be undone.'
      : '⚠️ ADMIN: Futa ujumbe huu kabisa? Hatua hii haiwezi kubatilishwa.'

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('community_messages')
        .delete()
        .eq('id', messageId)

      if (deleteError) {
        throw deleteError
      }

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      setActiveMenuId(null)
      
      alert(lang === 'en' ? 'Message permanently deleted!' : 'Ujumbe umefutwa kabisa!')
    } catch (err: any) {
      console.error('Failed to hard delete message:', err)
      alert(lang === 'en' ? 'Failed to delete message. Please try again.' : 'Hitilafu ya kufuta ujumbe. Tafadhali jaribu tena.')
    }
  }

  // Handle clear entire chat (admin only)
  const handleClearChat = async () => {
    if (userRole !== 'admin') {
      alert(lang === 'en' ? 'Only admins can clear the entire chat.' : 'Ni wasimamizi pekee wanaoweza kufuta mazungumzo yote.')
      return
    }

    if (!window.confirm(lang === 'en' ? '⚠️ ADMIN: Are you sure you want to clear ALL chat messages? This action cannot be undone.' : '⚠️ ADMIN: Una uhakika unataka kufuta MZUNGUMZO WOTE? Hatua hii haiwezi kubatilishwa.')) {
      return
    }

    try {
      // Hard delete all messages
      const { error: deleteError } = await supabase
        .from('community_messages')
        .delete()
        .neq('id', '0')

      if (deleteError) {
        throw deleteError
      }

      // Clear local state
      setMessages([])
      setFilteredMessages([])

      alert(lang === 'en' ? 'Chat cleared successfully!' : 'Mzungumzo umesafishwa kikamilifu!')
    } catch (err: any) {
      console.error('Failed to clear chat:', err)
      alert(lang === 'en' ? 'Failed to clear chat. Please try again.' : 'Hitilafu ya kufuta mzungumzo. Tafadhali jaribu tena.')
    }
  }

  // Start editing a message
  const startEditing = (message: Message) => {
    setEditingMessageId(message.id)
    setEditingContent(message.content)
    setActiveMenuId(null)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.replace("/")
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

  // Message Menu Component
  const MessageMenu = ({ message, onClose }: { message: Message; onClose: () => void }) => {
    const isOwner = message.user_id === user?.id
    const isAdmin = userRole === 'admin'

    if (!isOwner && !isAdmin) return null

    return (
      <div 
        ref={menuRef}
        className="absolute right-0 top-8 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden"
      >
        {isOwner && (
          <>
            <button
              onClick={() => {
                startEditing(message)
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'en' ? 'Edit Message' : 'Hariri Ujumbe'}
            </button>
            <button
              onClick={() => {
                handleDeleteMessage(message.id)
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              {lang === 'en' ? 'Delete Message' : 'Futa Ujumbe'}
            </button>
          </>
        )}
        {isAdmin && !isOwner && (
          <button
            onClick={() => {
              handleHardDeleteMessage(message.id)
              onClose()
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-950/50 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Admin: Delete Message' : 'Msimamizi: Futa Ujumbe'}
          </button>
        )}
      </div>
    )
  }

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
      <HamburgerMenuNav
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        onSignOut={handleSignOut}
        backHref="/dashboard"
        backLabel={t.backToDashboard}
        pageTitle={lang === 'en' ? 'Community Hub' : 'Ukurasa wa Jamii'}
        pageTitleIcon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
        deferredPrompt={null}
        showRealtimeStatus={{ connected: realtimeConnected, connectedLabel: lang === 'en' ? 'Live Sync' : 'Mawasiliano Safi', connectingLabel: lang === 'en' ? 'Connecting...' : 'Kujiunga...' }}
      />

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
                <span className="text-[10px] text-zinc-500 capitalize">
                  {userRole === 'agrovet' ? 'Agrovet Expert' : userRole === 'admin' ? 'Administrator' : 'Registered Farmer'}
                </span>
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

               {/* Clear Chat Button - Admin only */}
               {userRole === 'admin' && (
                 <button 
                   onClick={handleClearChat}
                   disabled={chatLoading}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-800/50 bg-red-950/20 text-red-400 hover:border-red-500/50 hover:text-red-300 transition-all text-xs font-semibold ${
                     chatLoading ? 'opacity-50 cursor-not-allowed' : ''
                   }`}
                 >
                   {chatLoading ? (
                     <Loader2 className="w-3 h-3 animate-spin" />
                   ) : (
                     <Trash2 className="w-3.5 h-3.5" />
                   )}
                   <span>{lang === 'en' ? 'Clear All Chat' : 'Futa Mzungumzo Wote'}</span>
                 </button>
               )}
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
                const isAdmin = m.role === 'admin'
                const isEditing = editingMessageId === m.id
                const showMenu = activeMenuId === m.id

                return (
                  <div key={m.id} className={`flex gap-3.5 ${isMe ? 'justify-end' : 'justify-start'} relative group`}>
                    
                    {/* User profile avatar (if not me) */}
                    {!isMe && (
                      <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 ${
                        isAdmin ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                        isAgro ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : isAgro ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    )}

                    <div className="max-w-[75%] space-y-1 relative">
                      {/* Name header */}
                      <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-extrabold text-zinc-400">{m.username}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[7px] uppercase font-bold border ${
                          isAdmin ? 'text-purple-400 bg-purple-400/5 border-purple-400/20' :
                          isAgro ? 'text-blue-400 bg-blue-400/5 border-blue-400/20' : 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                        }`}>
                          {isAdmin ? 'Admin' : isAgro ? 'Agrovet' : 'Farmer'}
                        </span>
                        {m.updated_at && m.updated_at !== m.created_at && (
                          <span className="text-zinc-600 text-[8px] italic">
                            ({lang === 'en' ? 'edited' : 'imehaririwa'})
                          </span>
                        )}
                        <span className="text-zinc-650 font-medium">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Message bubble with edit mode */}
                      {isEditing ? (
                        <div className="flex gap-2 items-start">
                          <input
                            type="text"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleEditMessage(m.id, editingContent)
                              }
                            }}
                            className="flex-1 bg-zinc-800 border border-emerald-500/30 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditMessage(m.id, editingContent)}
                            className="p-1.5 bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5 text-zinc-950" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-zinc-300" />
                          </button>
                        </div>
                      ) : (
                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed relative ${
                          isMe
                            ? 'bg-emerald-500 text-zinc-950 font-bold rounded-tr-none shadow-md shadow-emerald-950/15'
                            : 'bg-zinc-900/60 text-zinc-200 rounded-tl-none border border-zinc-850/60'
                        }`}>
                          {m.content}
                          
                          {/* Three dots menu button - only for message owner or admin */}
                          {(isMe || userRole === 'admin') && (
                            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setActiveMenuId(showMenu ? null : m.id)}
                                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                              </button>
                              {showMenu && (
                                <MessageMenu message={m} onClose={() => setActiveMenuId(null)} />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Avatar for my messages (optional) */}
                    {isMe && (
                      <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 mt-1 ${
                        isAdmin ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                        isAgro ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : isAgro ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    )}

                  </div>
                )
              })}

              {/* Empty state */}
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-600">
                  <AlertCircle className="w-8 h-8 mb-2 text-zinc-700" />
                  <p className="text-xs">{lang === 'en' ? 'No messages match search or board empty.' : 'Hakuna mazungumzo yoyote yaliyopatikana.'}</p>
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