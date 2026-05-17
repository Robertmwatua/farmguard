'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { translations } from '@/lib/translations'
import { 
  ShieldCheck, 
  CloudLightning, 
  Sprout, 
  UploadCloud, 
  Activity, 
  Leaf, 
  MoveRight,
  Droplet,
  Globe,
  AlertCircle,
  Loader2,
  Info,
  ShieldAlert,
  ClipboardList,
  Sun,
  Moon,
  LogOut
} from 'lucide-react'

export default function Home() {
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [session, setSession] = useState<any>(null)
  
  const [isClassifying, setIsClassifying] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<{
    diagnosticOverview: string;
    immediateProtocol: string;
    longTermRecommendations: string;
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Language & Theme Initialization
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)
    document.documentElement.classList.toggle('light', finalTheme === 'light')

    // Listen to changes from other pages
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

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const t = translations[lang]

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedImage(URL.createObjectURL(file))
    setResults(null)
    setUploadError(null)
    setIsClassifying(true)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (response.status === 422 && data.error === "Not a plant") {
        setUploadError(data.message)
        setIsClassifying(false)
        return
      }

      if (!response.ok) throw new Error(data.error || 'Failed to classify')
      
      setResults(data.classification.slice(0, 3))
      setAiAnalysis(data.analysis)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setIsClassifying(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.2 } 
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 selection:bg-emerald-500/30 font-sans overflow-x-hidden transition-colors duration-300">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="font-bold text-white tracking-wide text-lg">{t.brand}</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button 
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all text-xs font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'en' ? '🇬🇧 EN' : '🇰🇪 SW'}
            </button>

            {/* Theme Switcher */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-500/30 hover:text-white transition-all"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
            </button>

            {session ? (
              <div className="flex items-center gap-3">
                <Link 
                  href="/dashboard" 
                  className="text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 px-4 py-2 rounded-lg transition-all"
                >
                  {t.dashboard.split(' ')[0]}
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="p-2 rounded-lg border border-zinc-800 hover:border-red-500/30 hover:text-red-400 transition-all"
                  title={t.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="text-xs font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 hover:text-zinc-950 px-4 py-2 rounded-lg transition-all"
              >
                {t.signIn}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        {/* Abstract Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t.networkActive}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
              {t.heroTitle1} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                {t.heroTitle2}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t.heroDesc}
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-0.5">
                {t.dashboard}
                <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full font-bold text-lg transition-all"
              >
                <UploadCloud className="w-5 h-5 text-emerald-400" />
                {t.quickDiagnostic}
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>
          </motion.div>

          {/* AI Results Section */}
          <AnimatePresence>
            {(selectedImage || isClassifying || results || uploadError) && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="mt-20 max-w-5xl mx-auto"
              >
                <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                  {/* Decorative glow */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row gap-12 items-center">
                    {/* Image Preview */}
                    <div className="w-full lg:w-1/2 relative group">
                      <div className="aspect-square rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                        {selectedImage ? (
                          <img src={selectedImage} alt="Uploaded leaf" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-zinc-600">
                            <UploadCloud className="w-12 h-12" />
                            <p>No image selected</p>
                          </div>
                        )}
                      </div>
                      {isClassifying && (
                        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl border border-emerald-500/30">
                          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                          <p className="text-emerald-400 font-bold tracking-widest text-sm uppercase animate-pulse">Neural Processing...</p>
                        </div>
                      )}
                    </div>

                    {/* Results Content */}
                    <div className="w-full lg:w-1/2">
                      {!isClassifying && !results && !uploadError && (
                        <div className="text-center lg:text-left">
                          <h3 className="text-3xl font-bold text-white mb-4">Neural Scanner Ready</h3>
                          <p className="text-zinc-400 leading-relaxed mb-8">
                            Our AI models are trained on over 50,000 botanical images. Upload a leaf photo to receive an instant pathology report.
                          </p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
                          >
                            Select Image <MoveRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {uploadError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                          <div className="flex items-center gap-3 text-red-400 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <h4 className="font-bold">{t.tryAgain}</h4>
                          </div>
                          <p className="text-red-400/80 text-sm">{uploadError}</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-all"
                          >
                            {t.tryAgain}
                          </button>
                        </div>
                      )}

                      {results && (
                        <div className="space-y-6">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            {t.analysisComplete}
                          </div>
                          <h3 className="text-3xl font-bold text-white">{t.detectedCondition}</h3>
                          
                          <div className="space-y-4">
                            {results.map((res: any, idx: number) => (
                              <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-lg font-bold text-zinc-100 capitalize">{res.label.replace(/_/g, ' ')}</span>
                                  <span className="text-emerald-400 font-mono font-bold">{(res.score * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${res.score * 100}%` }}
                                    transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                                    className="h-full bg-emerald-500 rounded-full"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiAnalysis && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-8 space-y-6 animate-fade-in"
                        >
                          <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-6">
                            <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3">
                              <Info className="w-4 h-4" /> {t.diagnosticOverview}
                            </h4>
                            <p className="text-zinc-300 text-sm leading-relaxed">{aiAnalysis.diagnosticOverview}</p>
                          </div>

                          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                            <h4 className="flex items-center gap-2 text-red-400 font-bold mb-3">
                              <ShieldAlert className="w-4 h-4" /> {t.immediateProtocol}
                            </h4>
                            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{aiAnalysis.immediateProtocol}</p>
                          </div>

                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
                            <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3">
                              <ClipboardList className="w-4 h-4" /> {t.longTerm}
                            </h4>
                            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{aiAnalysis.longTermRecommendations}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* How It Works Grid */}
      <section className="py-24 px-6 relative border-t border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Intelligent System Flow</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">A seamless architectural breakdown from field capture to actionable intelligence.</p>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6 relative"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Connection Lines (Desktop Only) */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-zinc-800 via-emerald-500/30 to-zinc-800 -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <motion.div variants={itemVariants} className="relative z-10 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 shadow-inner border border-zinc-700">
                <Leaf className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. Capture Image</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Farmer captures a high-resolution image of a symptomatic leaf directly from the field using any mobile device.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={itemVariants} className="relative z-10 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                <UploadCloud className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. Supabase Upload</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                The file securely uploads to Supabase storage over an encrypted channel for rapid, low-latency neural AI evaluation.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={itemVariants} className="relative z-10 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 shadow-inner border border-zinc-700">
                <Activity className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Dashboard Metrics</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Diagnostic metrics, confidence scores, and treatment protocols seamlessly populate on the desktop command center.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Matrix */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Core Technology Stack</h2>
              <p className="text-zinc-400 max-w-xl">Purpose-built technical infrastructure designed for scale and precision.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8 md:p-10 group overflow-hidden relative">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sprout className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">AI Leaf Diagnostics</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                Utilizing state-of-the-art computer vision models powered by our proprietary neural network to classify blights, rusts, and pest damage with high accuracy.
              </p>
            </div>

            {/* Feature 2 & 3 Column */}
            <div className="grid gap-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex items-start gap-6 hover:bg-zinc-900 transition-colors">
                <div className="bg-zinc-800 p-3 rounded-lg shrink-0">
                  <CloudLightning className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Low-Latency Cloud Sync</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Powered by Supabase infrastructure for real-time data propagation across the web dashboard instantly upon mobile upload.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex items-start gap-6 hover:bg-zinc-900 transition-colors">
                <div className="bg-zinc-800 p-3 rounded-lg shrink-0">
                  <Globe className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Predictive Weather Risk Engine</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Correlating diagnostic history with incoming weather patterns to forecast and mitigate humidity-driven fungal outbreaks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Farmer Benefits Section */}
      <section className="py-24 px-6 relative border-t border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Tangible Business Value</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Translating raw data into measurable agricultural efficiency.</p>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              {
                icon: ShieldCheck,
                title: "Prevent Devastating Loss",
                desc: "Identify pathogens days before visual human detection is possible, salvaging otherwise compromised yields."
              },
              {
                icon: Droplet,
                title: "Minimize Chemical Waste",
                desc: "Apply targeted pesticide treatments only where explicitly needed, cutting operational costs by up to 30%."
              },
              {
                icon: Activity,
                title: "Global Remote Oversight",
                desc: "Monitor sprawling crop plots from a centralized command center without deploying field scouts manually."
              }
            ].map((benefit, i) => (
              <motion.div key={i} variants={itemVariants} className="text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)] border border-zinc-800">
                  <benefit.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-sm max-w-xs mx-auto">
                  {benefit.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer Banner CTA */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
        
        <div className="max-w-5xl mx-auto px-6 py-24 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8">
            Ready to secure your harvest?
          </h2>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)] hover:-translate-y-1">
            {t.workspace}
            <MoveRight className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="border-t border-zinc-800/50 py-6 px-6 text-center text-sm text-zinc-500">
          <p>&copy; {new Date().getFullYear()} FarmGuard AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}