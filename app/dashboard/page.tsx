'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, X, ShieldCheck, Leaf, Loader2, AlertCircle, CheckCircle2, History, ChevronRight, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import WeatherWidget from '@/components/WeatherWidget'

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [scans, setScans] = useState<any[]>([])
  const [latestScanId, setLatestScanId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Route Protection: redirect unauthenticated users to /login ──────────
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!sessionData.session) {
        window.location.replace("/login");
        return;
      }

      setUserId(sessionData.session.user.id);
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── User-scoped scan fetch ──────────────────────────────────────────────
  const fetchScans = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[dashboard] fetchScans error:', error);
      return;
    }

    if (data) setScans(data)
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchScans()
    }
  }, [userId, fetchScans])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this scan record?')) return

    try {
      const response = await fetch(`/api/scans/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete')
      
      setScans(scans.filter(s => s.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your entire scan history? This cannot be undone.')) return

    try {
      const response = await fetch('/api/scans', {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to clear history')
      
      setScans([])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file.')
      setStatus('error')
      return
    }
    
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
    setStatus('idle')
    setErrorMessage('')
  }

  const clearSelection = () => {
    setFile(null)
    setPreview(null)
    setStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    try {
      setStatus('uploading')
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('plant-images')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: publicUrlData } = supabase.storage
        .from('plant-images')
        .getPublicUrl(filePath)

      setStatus('analyzing')
      
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/classify', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let message = 'Failed to classify image.'
        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
          const errorPayload = await response.json().catch(() => null)
          message = errorPayload?.message || errorPayload?.error || message
        } else {
          const errorText = await response.text().catch(() => '')
          message = errorText.trim().startsWith('<') ? message : errorText || message
        }

        setErrorMessage(message)
        setStatus('error')
        return
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('Failed to classify image.')
      }

      const data = await response.json()

      if (!Array.isArray(data.classification) || !data.classification[0]) {
        throw new Error(data.error || 'Failed to classify image.')
      }

      const topResult = data.classification[0]
      const aiAnalysis = data.analysis
      const insertPayload = {
         image_url: publicUrlData.publicUrl,
         plant_name: topResult.label.split('___')[0].replace(/_/g, ' ') || 'Unknown Plant',
         disease: topResult.label.replace(/_/g, ' '),
         health_status: topResult.label.toLowerCase().includes('healthy') ? 'Optimal' : 'Critical',
         confidence: parseFloat((topResult.score * 100).toFixed(1)),
         recommendation: aiAnalysis.immediateProtocol,
         diagnostic_overview: aiAnalysis.diagnosticOverview,
         long_term_recommendations: aiAnalysis.longTermRecommendations,
         farmer_summary: aiAnalysis.farmerSummary,
         user_id: userId,
      }

      let { data: insertData, error: dbError } = await supabase
        .from('scans')
        .insert([insertPayload])
        .select()
        .single()

      if (dbError && dbError.message.toLowerCase().includes('farmer_summary')) {
        const { farmer_summary, ...legacyInsertPayload } = insertPayload
        const retry = await supabase
          .from('scans')
          .insert([legacyInsertPayload])
          .select()
          .single()

        insertData = retry.data
        dbError = retry.error
      }

      if (dbError) throw new Error(dbError.message)

      setLatestScanId(insertData.id)
      setStatus('success')
      fetchScans() // Refresh history with user-scoped data
      
    } catch (error: any) {
      console.error('Upload error:', error)
      setErrorMessage(error.message || 'Failed to upload and analyze image.')
      setStatus('error')
    }
  }

  const getStyleForHealth = (health: string) => {
    if (health === 'Optimal') return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', bar: 'bg-emerald-400' }
    if (health === 'Moderate') return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', bar: 'bg-yellow-400' }
    return { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', bar: 'bg-red-400' }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans">
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="font-bold text-white tracking-wide text-lg">FarmGuard AI</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/agrovets" className="text-zinc-400 transition-colors hover:text-emerald-300">
              Agrovet Console
            </Link>
            <span className="flex items-center gap-2 text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Network Connected
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Field command center
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">Diagnostic Center</h1>
            <p className="max-w-2xl text-zinc-400">
              Run crop diagnosis, monitor weather risk, and jump back into historical reports from
              one organized workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="#diagnostic" className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              Scan
            </a>
            <a href="#field-intel" className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              Weather
            </a>
            <a href="#history" className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              History
            </a>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)] xl:items-start">
          <section id="diagnostic" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">1. Upload & Diagnose</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Start with a leaf image. The report page will carry the summary, weather context,
                and weather-aware next steps.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-10 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!preview ? (
              <motion.div
                key="upload-zone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[400px] ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept="image/*"
                />
                
                <div className="w-20 h-20 rounded-full bg-zinc-800/80 flex items-center justify-center mb-6 shadow-inner">
                  <UploadCloud className="w-10 h-10 text-emerald-400" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Drag & drop image here</h3>
                <p className="text-zinc-400 mb-6">or click to browse from your device</p>
                
                <div className="text-xs text-zinc-500 flex items-center justify-center gap-4">
                  <span>Supports: JPG, PNG, WEBP</span>
                  <span>Max file size: 10MB</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview-zone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col md:flex-row gap-8"
              >
                <div className="w-full md:w-1/2 relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-square flex items-center justify-center group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={preview} 
                    alt="Leaf Preview" 
                    className={`object-contain w-full h-full transition-opacity duration-300 ${status === 'analyzing' || status === 'uploading' ? 'opacity-50' : 'opacity-100'}`}
                  />
                  
                  {status === 'idle' && (
                    <button 
                      onClick={clearSelection}
                      className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  {(status === 'uploading' || status === 'analyzing') && (
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <motion.div 
                        initial={{ top: '0%' }}
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.5)] z-20"
                      />
                    </div>
                  )}
                </div>

                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">Image Ready</h3>
                    <p className="text-zinc-400 text-sm">
                      {file?.name} ({(file!.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>

                  <div className="space-y-4">
                    {status === 'idle' && (
                      <button 
                        onClick={handleAnalyze}
                        className="group relative w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-lg transition-all shadow-[0_0_35px_-8px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_-4px_rgba(16,185,129,0.55)] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                      >
                        <Leaf className="w-5 h-5" />
                        Run Diagnostic Analysis
                      </button>
                    )}

                    {status === 'uploading' && (
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center gap-4">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        <span className="text-zinc-300 font-medium">Encrypting & uploading to secure cloud...</span>
                      </div>
                    )}

                    {status === 'analyzing' && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        <span className="text-emerald-400 font-medium">Neural network analyzing biological markers...</span>
                      </div>
                    )}

                    {status === 'success' && (
                      <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <h4 className="text-lg font-bold text-white mb-1">Analysis Complete</h4>
                        <p className="text-emerald-400 text-sm mb-4">Diagnostics have been successfully processed.</p>
                        <div className="flex gap-3 justify-center">
                          {latestScanId && (
                            <Link 
                              href={`/scan/${latestScanId}`}
                              className="group px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg font-bold transition-all shadow-[0_0_25px_-6px_rgba(16,185,129,0.35)] hover:shadow-[0_0_40px_-4px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                            >
                              View Full Report
                            </Link>
                          )}
                          <button 
                            onClick={clearSelection}
                            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors text-sm"
                          >
                            New Scan
                          </button>
                        </div>
                      </div>
                    )}

                    {status === 'error' && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-3 mb-3">
                          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-red-400 font-bold mb-1">Upload Failed</h4>
                            <p className="text-red-400/80 text-sm">{errorMessage}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setStatus('idle')}
                          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            </div>
          </section>

          <aside id="field-intel" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">2. Field Intelligence</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Live weather risk stays visible while you prepare a scan.
              </p>
            </div>

            <div className="space-y-6 xl:sticky xl:top-24">
              <WeatherWidget />
            </div>
          </aside>
        </div>

        {/* Scan History Section */}
        <div id="history" className="mt-16 scroll-mt-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Recent Scans
              </h2>
              <p className="text-sm text-zinc-400">Your historical diagnostic records</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleClearHistory}
                className="text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors px-3 py-1 rounded-lg border border-zinc-800 hover:border-red-400/20"
              >
                Clear History
              </button>
              <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {scans.length === 0 ? (
              <div className="text-center p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 text-zinc-500">
                No scans found in database.
              </div>
            ) : scans.map((scan, i) => {
              const styles = getStyleForHealth(scan.health_status || 'Moderate')
              
              return (
                <Link href={`/scan/${scan.id}`} key={scan.id}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${styles.bg} ${styles.border}`}>
                        <Leaf className={`w-6 h-6 ${styles.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{scan.plant_name}</h3>
                        <p className="text-zinc-400 text-sm">{new Date(scan.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 w-full md:w-auto">
                        <div>
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Disease</p>
                          <p className="text-zinc-200 font-medium">{scan.disease}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Health Status</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles.bg} ${styles.border} ${styles.color}`}>
                            {scan.health_status}
                          </span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <div className="flex justify-between items-end mb-1">
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Confidence</p>
                            <span className="text-xs font-bold text-zinc-300">{scan.confidence}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${scan.confidence}%` }}
                              transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                              className={`h-full rounded-full ${styles.bar}`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => handleDelete(e, scan.id)}
                        className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded-lg transition-colors group-hover:opacity-100 md:opacity-0"
                        title="Delete scan"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
