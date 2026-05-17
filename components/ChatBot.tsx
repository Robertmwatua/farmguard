'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  Loader2, 
  Minimize2, 
  Mic, 
  Globe,
  Sun,
  Moon
} from 'lucide-react'
import { translations } from '@/lib/translations'

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Voice integration states
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Language & Theme synced states
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sync preferences from local storage
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)

    const syncPreferences = () => {
      const currentLang = localStorage.getItem('lang') as 'en' | 'sw'
      if (currentLang) setLang(currentLang)
      const currentTheme = localStorage.getItem('theme') as 'dark' | 'light'
      if (currentTheme) setTheme(currentTheme)
    }
    window.addEventListener('storage', syncPreferences)
    window.addEventListener('local-storage', syncPreferences)

    return () => {
      window.removeEventListener('storage', syncPreferences)
      window.removeEventListener('local-storage', syncPreferences)
    }
  }, [])

  const t = translations[lang]

  // Set default greetings depending on language
  useEffect(() => {
    const greeting = lang === 'en' 
      ? 'Hello! I am your FarmGuard Assistant. How can I help with your crops today?'
      : 'Habari! Mimi ni Msaidizi wako wa FarmGuard. Ninawezaje kukusaidia na mazao yako leo?'
    setMessages([
      { role: 'bot', content: greeting }
    ])
  }, [lang])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat({ role: 'user', content: userMessage }).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to get response')

      setMessages(prev => [...prev, { role: 'bot', content: data.content }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'bot', content: lang === 'en' ? 'Sorry, I encountered an error. Please try again.' : 'Samahani, nimekutana na hitilafu. Tafadhali jaribu tena.' }])
    } finally {
      setIsLoading(false)
    }
  }

  // Voice Speech Recognition Handler
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert(lang === 'en' ? 'Speech recognition is not supported in this browser.' : 'Utambuzi wa sauti hauhimiliwi katika kivinjari hiki.')
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

    rec.onstart = () => {
      setIsListening(true)
    }

    rec.onerror = (e: any) => {
      console.error('[Speech Error]', e)
      setIsListening(false)
      setMessages(prev => [...prev, { role: 'bot', content: t.voiceError }])
    }

    rec.onend = () => {
      setIsListening(false)
    }

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
    }

    recognitionRef.current = rec
    rec.start()
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] md:w-[400px] h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-colors duration-300"
          >
            {/* Header */}
            <div className="p-4 bg-emerald-500 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">{t.chatBotTitle}</h3>
                  <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-wider">{t.chatbotSub}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-emerald-500 text-zinc-950 font-medium rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs text-zinc-400">{t.thinking}</span>
                  </div>
                </div>
              )}
              {isListening && (
                <div className="flex justify-start">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">{t.voiceStart}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.chatbotPlaceholder}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                />
                
                {/* Voice Input Button inside input bar */}
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'text-zinc-500 hover:text-emerald-400'
                  }`}
                  title={t.voiceStart}
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Submit Message */}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-600 rounded-xl font-bold transition-all flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-zinc-800 text-white' : 'bg-emerald-500 text-zinc-950 font-bold'
        }`}
      >
        {isOpen ? <Minimize2 className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  )
}
