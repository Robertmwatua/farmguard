'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Globe, 
  Sun, 
  Moon, 
  Notebook, 
  Plus, 
  Search, 
  Trash2, 
  Tag, 
  Loader2, 
  Lock, 
  FileText,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { translations } from '@/lib/translations'

interface FarmerNote {
  id: string
  title: string
  content: string
  category: string
  color: string // 'zinc' | 'emerald' | 'blue' | 'amber' | 'rose'
  created_at: string
}

export default function NotesPage() {
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  // Auth states
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Notes states
  const [notes, setNotes] = useState<FarmerNote[]>([])
  const [filteredNotes, setFilteredNotes] = useState<FarmerNote[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Form states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('General')
  const [noteColor, setNoteColor] = useState('zinc')
  const [formLoading, setFormLoading] = useState(false)

  // Initialize theme, lang, auth, and fetch notes
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
          
          // Fetch notes from Supabase
          const { data: noteRows, error } = await supabase
            .from('farmer_notes')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })

          if (!error && noteRows) {
            setNotes(noteRows as FarmerNote[])
          }
        }
      } catch (err) {
        console.error('Error checking auth:', err)
      } finally {
        setAuthLoading(false)
      }
    }

    checkUserAndFetch()
  }, [])

  // Filter notes on search query and category
  useEffect(() => {
    let result = notes
    if (selectedCategory !== 'All') {
      result = result.filter(n => n.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    }
    setFilteredNotes(result)
  }, [notes, searchQuery, selectedCategory])

  // Handle note submission
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteTitle.trim() || !noteContent.trim() || !user || formLoading) return

    setFormLoading(true)
    const newNote = {
      user_id: user.id,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory,
      color: noteColor
    }

    try {
      const { data: inserted, error } = await supabase
        .from('farmer_notes')
        .insert([newNote])
        .select()
        .single()

      if (!error && inserted) {
        setNotes((prev) => [inserted as FarmerNote, ...prev])
        setIsAddOpen(false)
        setNoteTitle('')
        setNoteContent('')
        setNoteCategory('General')
        setNoteColor('zinc')
      } else {
        throw error
      }
    } catch (err) {
      console.error('Failed to save note:', err)
      alert(lang === 'en' ? 'Database connection sync delayed. Ensure migrations are fully applied.' : 'Kusawazisha hifadhidata kumesitishwa. Hakikisha jedwali la farmer_notes limewekwa Supabase.')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle note deletion
  const handleDeleteNote = async (id: string) => {
    if (!confirm(lang === 'en' ? 'Are you sure you want to delete this farming note?' : 'Je, una uhakika unataka kufuta maelezo haya?')) return

    try {
      const { error } = await supabase
        .from('farmer_notes')
        .delete()
        .eq('id', id)

      if (!error) {
        setNotes((prev) => prev.filter(n => n.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  // Get color style classes
  const getColorClasses = (colorName: string) => {
    switch (colorName) {
      case 'emerald':
        return 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400'
      case 'blue':
        return 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400'
      case 'amber':
        return 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-450'
      case 'rose':
        return 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-455'
      default:
        return 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 text-zinc-300'
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

  // Lock view if not authenticated
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
            {lang === 'en' ? 'Farming Diary Locked' : 'Shajara ya Kilimo Imefungwa'}
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            {lang === 'en' 
              ? 'Draft pesticide treatments, record watering notes, and archive custom crop spacing guidelines. Log in to access your personal digital farming board.'
              : 'Andika matibabu ya wadudu, kumbukumbu za umwagiliaji, na miongozo ya nafasi za mimea. Ingia ili ufungue shajara yako ya kilimo.'}
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
                <Notebook className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">{lang === 'en' ? 'Farming Diary' : 'Shajara ya Ukulima'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/teachings" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Academy' : 'Chuo'}
            </Link>

            <Link href="/community" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Community' : 'Jamii'}
            </Link>

            <Link href="/calendar" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors mr-2">
              {lang === 'en' ? 'Calendar' : 'Ratiba'}
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
        /* Workspace layout */
        <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Top Toolbar */}
          <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl shrink-0">
            
            {/* Category chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              {['All', 'General', 'Diagnostics', 'Irrigation', 'Fertilizer', 'Harvest'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.8 rounded-xl font-bold border transition-all ${
                    selectedCategory === cat
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-800 bg-zinc-950/20 text-zinc-450 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {cat === 'All' ? (lang === 'en' ? '📚 All Diary Logs' : '📚 Rekodi Zote') : cat}
                </button>
              ))}
            </div>

            {/* Search Bar & Write Button */}
            <div className="flex items-center gap-3">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
                <input 
                  type="text"
                  placeholder={lang === 'en' ? 'Search logs...' : 'Tafuta rekodi...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-emerald-500/40 text-white placeholder-zinc-700"
                />
              </div>

              <button
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'en' ? 'Compose Log' : 'Andika Rekodi'}</span>
              </button>
            </div>

          </div>

          {/* Diary Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`border rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden transition-all shadow-md ${getColorClasses(note.color)}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-zinc-950/20 border border-current opacity-80">
                        {note.category}
                      </span>
                      <span className="text-[9px] opacity-60 font-semibold">
                        {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-md mb-2 leading-snug">{note.title}</h3>
                    <p className="text-[11px] leading-relaxed opacity-90 whitespace-pre-wrap">{note.content}</p>
                  </div>

                  <div className="flex justify-end pt-4 mt-4 border-t border-dashed border-current/10">
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-zinc-500 transition-all"
                      title={lang === 'en' ? 'Delete Note' : 'Futa Rekodi'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </motion.div>
              ))}

              {filteredNotes.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center text-zinc-650 bg-zinc-900/10 border border-dashed border-zinc-850 rounded-3xl">
                  <FileText className="w-10 h-10 text-zinc-700 mb-2" />
                  <p className="text-xs">{lang === 'en' ? 'No diary entries found.' : 'Hakuna rekodi yoyote ya shajara iliyopatikana.'}</p>
                </div>
              )}
            </div>
          </div>

        </main>
      )}

      {/* Dynamic Modal to Compose note */}
      <AnimatePresence>
        {isAddOpen && (
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
                    {lang === 'en' ? 'Compose Diary Log' : 'Andika Shajara Mpya'}
                  </h3>
                  <p className="text-[10px] text-zinc-550 font-bold tracking-wider mt-0.5">{lang === 'en' ? 'Add detailed farming records' : 'Kumbukumbu maalum za kilimo'}</p>
                </div>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white hover:border-zinc-700 transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                    {lang === 'en' ? 'Log Title' : 'Jina la Shajara'}
                  </label>
                  <input 
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Tomato Sprayed, Soil pH levels' : 'mfano. Kupuliza Dawa ya Nyanya, pH ya Udongo'}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3.5 text-xs focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                      {lang === 'en' ? 'Category' : 'Aina'}
                    </label>
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3 text-xs focus:outline-none focus:border-emerald-500/40"
                    >
                      <option value="General">{lang === 'en' ? 'General' : 'Kawaida'}</option>
                      <option value="Diagnostics">{lang === 'en' ? 'Diagnostics' : 'Magonjwa'}</option>
                      <option value="Irrigation">{lang === 'en' ? 'Irrigation' : 'Maji'}</option>
                      <option value="Fertilizer">{lang === 'en' ? 'Fertilizer' : 'Mbolea'}</option>
                      <option value="Harvest">{lang === 'en' ? 'Harvest' : 'Mavuno'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                      {lang === 'en' ? 'Card Color Vibe' : 'Rangi ya Kadi'}
                    </label>
                    <select
                      value={noteColor}
                      onChange={(e) => setNoteColor(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3 text-xs focus:outline-none focus:border-emerald-500/40"
                    >
                      <option value="zinc">{lang === 'en' ? 'Zinc (General)' : 'Kijivu (Kawaida)'}</option>
                      <option value="emerald">{lang === 'en' ? 'Emerald (Leaf/Growth)' : 'Kijani (Mmea/Ukuaji)'}</option>
                      <option value="blue">{lang === 'en' ? 'Blue (Water)' : 'Bluu (Maji)'}</option>
                      <option value="amber">{lang === 'en' ? 'Amber (Fertilizer)' : 'Njano (Mbolea)'}</option>
                      <option value="rose">{lang === 'en' ? 'Rose (Threat/Disease)' : 'Nyekundu (Hatari/Ugonjwa)'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">
                    {lang === 'en' ? 'Diary Content' : 'Maelezo ya Shajara'}
                  </label>
                  <textarea 
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={lang === 'en' ? 'Describe soil moisture, leaf spots, chemical dilution ratios, or general observations.' : 'Eleza hali ya unyevu wa udongo, madoa ya majani, au uwiano wa dawa.'}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3.5 text-xs focus:outline-none focus:border-emerald-500/40 resize-none text-zinc-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{lang === 'en' ? 'Save Diary Log' : 'Hifadhi kwenye Shajara'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
