'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud,
  X,
  ShieldCheck,
  Leaf,
  Loader2,
  AlertCircle,
  CheckCircle2,
  History,
  ChevronRight,
  Trash2,
  Camera,
  Globe,
  Sun,
  Moon,
  LogOut,
  Calendar,
  Plus,
  Activity,
  CheckSquare,
  Menu,
  Download,
  Bell
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import WeatherWidget from '@/components/WeatherWidget'
import PWANotificationManager from '@/components/PWANotificationManager'
import { translations } from '@/lib/translations'

interface TaskItem {
  id: string
  text: string
  completed: boolean
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [scans, setScans] = useState<any[]>([])
  const [latestScanId, setLatestScanId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Language & Theme states
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Real-time Camera states
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Dashboard Tabs ('scans' | 'tracker' | 'map')
  const [activeTab, setActiveTab] = useState<'scans' | 'tracker' | 'map'>('scans')

  // Satellite Map states
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Adaptive Crop Care Tracker Task lists
  const [trackerTasks, setTrackerTasks] = useState<Record<string, TaskItem[]>>({})
  const [customTaskInput, setCustomTaskInput] = useState<Record<string, string>>({})

  // Sync lang & theme
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

  // Capture PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
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

  const triggerTestAlert = () => {
    if (typeof window === 'undefined') return

    if (!(typeof window !== 'undefined' && "Notification" in window)) {
      alert(lang === 'en' ? "This browser does not support notifications" : "Kivinjari hiki hakihimili arifa")
      return
    }

    (window as any).Notification.requestPermission().then((permission: string) => {
      if (permission === "granted") {
        setTimeout(() => {
          new (window as any).Notification("FarmGuard AI", {
            body: lang === 'en' ? "5-second test alert active! PWA functionality verified." : "Arifa ya majaribio ya sekunde 5 imetumwa! PWA inafanya kazi.",
            icon: "/icon-192.png"
          })
        }, 5000);
      }
    })
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
    setIsMobileMenuOpen(false)
  }

  const t = translations[lang]

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

  // Dynamic Leaflet CSS/Script Injection for SSR compatibility
  useEffect(() => {
    if (activeTab === 'map' && !mapLoaded) {
      // 1. Inject Leaflet CSS stylesheet
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)

      // 2. Inject Leaflet JS Library
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
      script.crossOrigin = ''
      script.onload = () => {
        setMapLoaded(true)
      }
      document.head.appendChild(script)
    }
  }, [activeTab, mapLoaded])

  // Construct Leaflet Satellite Map with color-coded scan pins
  useEffect(() => {
    if (activeTab === 'map' && mapLoaded && typeof window !== 'undefined' && (window as any).L) {
      const L = (window as any).L

      // Fallback farm center (Nairobi coordinates)
      let lat = -1.2921
      let lng = 36.8219

      const initMap = (centerLat: number, centerLng: number) => {
        if (!mapContainerRef.current) return

        if (mapRef.current) {
          mapRef.current.remove()
        }

        const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 17)
        mapRef.current = map

        // High-resolution ESRI World Satellite tile layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Satellite Field Imagery'
        }).addTo(map)

        // Plot colored pins representing crop diagnostic records
        scans.forEach((scan: any, idx: number) => {
          const isCritical = scan.health_status === 'Critical'
          const isModerate = scan.health_status === 'Moderate'

          const color = isCritical ? '#f87171' : isModerate ? '#facc15' : '#34d399'

          // Generate realistic row-offsets centered on the farmer's GPS coordinates
          const offsetLat = centerLat + (Math.sin(idx * 0.9) * 0.0006)
          const offsetLng = centerLng + (Math.cos(idx * 0.9) * 0.0006)

          const marker = L.circleMarker([offsetLat, offsetLng], {
            radius: 10,
            fillColor: color,
            color: '#18181b',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map)

          // Premium custom popup styling
          const popupContent = `
            <div style="font-family: sans-serif; padding: 4px; width: 170px; color: #18181b;">
              <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px; color: #111827;">${scan.plant_name}</h4>
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #4b5563;">Spotted: <b>${scan.disease}</b></p>
              <div style="margin-bottom: 8px;">
                <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${color}20; color: ${color}; border: 1px solid ${color}40;">
                  ${scan.health_status}
                </span>
              </div>
              <a href="/scan/${scan.id}" style="display: block; text-align: center; text-decoration: none; padding: 6px; background: #10b981; color: #fff; border-radius: 6px; font-size: 11px; font-weight: bold;">
                Open Report
              </a>
            </div>
          `
          marker.bindPopup(popupContent)
        })
      }

      // Fetch Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            initMap(pos.coords.latitude, pos.coords.longitude)
          },
          () => {
            initMap(lat, lng)
          },
          { timeout: 5000 }
        )
      } else {
        initMap(lat, lng)
      }
    }
  }, [activeTab, mapLoaded, scans])

  // Initialize and persistent local tasks for unique plants
  useEffect(() => {
    if (scans.length > 0 && userId) {
      const uniquePlants = Array.from(new Set(scans.map((s: any) => s.plant_name))) as string[]
      const savedTasks = localStorage.getItem(`farmguard_tasks_${userId}`)
      let tasksDict: Record<string, TaskItem[]> = savedTasks ? JSON.parse(savedTasks) : {}

      uniquePlants.forEach((plant) => {
        if (!tasksDict[plant]) {
          tasksDict[plant] = [
            { id: '1', text: lang === 'en' ? 'Apply recommended pesticide or fungicide treatment' : 'Nyunyizia dawa inayopendekezwa ya wadudu/fungi', completed: false },
            { id: '2', text: lang === 'en' ? 'Prune and safely quarantine spotted foliage' : 'Kata na utenge mbali majani yote yenye madoa', completed: false },
            { id: '3', text: lang === 'en' ? 'Optimize soil drainage and moisture schedule' : 'Maji ya udongo na mtiririko yaboreshwe shambani', completed: false },
            { id: '4', text: lang === 'en' ? 'Visual inspection of surrounding healthy rows' : 'Ukaguzi wa macho kwenye mistari ya mimea jirani', completed: false }
          ]
        }
      })
      setTrackerTasks(tasksDict)
    }
  }, [scans, userId, lang])

  const toggleTask = (plant: string, taskId: string) => {
    if (!userId) return
    const updated = {
      ...trackerTasks,
      [plant]: trackerTasks[plant].map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    }
    setTrackerTasks(updated)
    localStorage.setItem(`farmguard_tasks_${userId}`, JSON.stringify(updated))
  }

  const addCustomTask = (plant: string) => {
    if (!userId) return
    const text = customTaskInput[plant]?.trim()
    if (!text) return

    const newTask: TaskItem = {
      id: Date.now().toString(),
      text,
      completed: false
    }

    const updated = {
      ...trackerTasks,
      [plant]: [...(trackerTasks[plant] || []), newTask]
    }

    setTrackerTasks(updated)
    localStorage.setItem(`farmguard_tasks_${userId}`, JSON.stringify(updated))
    setCustomTaskInput(prev => ({ ...prev, [plant]: '' }))
  }

  const deleteTask = (plant: string, taskId: string) => {
    if (!userId) return
    const updated = {
      ...trackerTasks,
      [plant]: trackerTasks[plant].filter(t => t.id !== taskId)
    }
    setTrackerTasks(updated)
    localStorage.setItem(`farmguard_tasks_${userId}`, JSON.stringify(updated))
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(lang === 'en' ? 'Are you sure you want to delete this scan record?' : 'Je, una uhakika unataka kufuta kumbukumbu hii ya uchunguzi?')) return

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
    if (!confirm(lang === 'en' ? 'Are you sure you want to clear your entire scan history? This cannot be undone.' : 'Je, una uhakika unataka kufuta kumbukumbu zako zote za uchunguzi? Hili haliwezi kutenguliwa.')) return

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
      setErrorMessage(lang === 'en' ? 'Please upload a valid image file.' : 'Tafadhali pakia picha halali.')
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

  // Camera Actions
  const startCamera = async () => {
    try {
      setIsCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      alert(lang === 'en' ? 'Unable to access camera. Please allow permissions.' : 'Imeshindwa kufungua kamera. Tafadhali ruhusu kamera.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setIsCameraActive(false)
  }

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/jpeg')
      setPreview(dataUrl)

      // Convert back to File so it fits in our robust handleAnalyze channel
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const snappedFile = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' })
      setFile(snappedFile)

      stopCamera()
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

      const plantPart = topResult.label.split('___')[0].replace(/_/g, ' ') || 'Unknown Plant'
      const diseasePart = topResult.label.split('___')[1] ? topResult.label.split('___')[1].replace(/_/g, ' ') : 'healthy'
      const formattedDisease = diseasePart.toLowerCase() === 'healthy' ? 'Healthy (No Disease Detected)' : diseasePart

      const insertPayload = {
        image_url: publicUrlData.publicUrl,
        plant_name: plantPart,
        disease: formattedDisease,
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

      if (insertData) setLatestScanId(insertData.id)
      setStatus('success')
      fetchScans() // Refresh history with user-scoped data

    } catch (error: any) {
      console.error('Upload error:', error)
      setErrorMessage(error.message || 'Failed to upload and analyze image.')
      setStatus('error')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.replace("/")
  }

  const getStyleForHealth = (health: string) => {
    if (health === 'Optimal') return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', bar: 'bg-emerald-400' }
    if (health === 'Moderate') return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', bar: 'bg-yellow-400' }
    return { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', bar: 'bg-red-400' }
  }

  // Parse scans to extract unique crops and their latest conditions
  const trackedCrops = useMemo(() => {
    const cropsMap: Record<string, any> = {}

    scans.forEach((scan) => {
      if (!cropsMap[scan.plant_name]) {
        cropsMap[scan.plant_name] = {
          plantName: scan.plant_name,
          diseaseSpotted: scan.disease,
          healthStatus: scan.health_status || 'Critical',
          confidence: scan.confidence,
          lastScanned: new Date(scan.created_at).toLocaleDateString(),
          imageUrl: scan.image_url,
          id: scan.id
        }
      }
    })

    return Object.values(cropsMap)
  }, [scans])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans transition-colors duration-300 font-sans">

      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="font-bold text-white tracking-wide text-lg">{t.brand}</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
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

            {/* Desktop Navigation Links - hidden on mobile/tablet */}
            <div className="hidden lg:flex items-center gap-1">
              <Link href="/teachings" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {lang === 'en' ? 'Academy' : 'Chuo'}
              </Link>

              <Link href="/community" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {lang === 'en' ? 'Community' : 'Jamii'}
              </Link>

              <Link href="/calendar" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {lang === 'en' ? 'Calendar' : 'Ratiba'}
              </Link>

              <Link href="/notes" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {lang === 'en' ? 'Diary' : 'Shajara'}
              </Link>

              <Link href="/estimator" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {lang === 'en' ? 'Estimator' : 'Kikokotoo'}
              </Link>

              <Link href="/marketplace" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {lang === 'en' ? 'Marketplace' : 'Soko'}
              </Link>

              <Link href="/agrovets" className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-2">
                {t.agrovetConsole.split(' ')[0]}
              </Link>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-all"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="hidden lg:flex p-2 rounded-lg border border-zinc-800 hover:border-red-500/30 hover:text-red-400 transition-all items-center gap-2"
              title={t.signOut}
            >
              <LogOut className="w-4 h-4" />
            </button>
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
                <Link
                  href="/teachings"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang === 'en' ? 'Academy' : 'Chuo'}
                </Link>

                <Link
                  href="/community"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang === 'en' ? 'Community' : 'Jamii'}
                </Link>

                <Link
                  href="/calendar"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang === 'en' ? 'Calendar' : 'Ratiba'}
                </Link>

                <Link
                  href="/notes"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang === 'en' ? 'Diary' : 'Shajara'}
                </Link>

                <Link
                  href="/estimator"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang === 'en' ? 'Estimator' : 'Kikokotoo'}
                </Link>

                <Link
                  href="/marketplace"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {lang === 'en' ? 'Marketplace' : 'Soko'}
                </Link>

                <Link
                  href="/agrovets"
                  className="text-sm font-semibold text-zinc-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-zinc-900/50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t.agrovetConsole.split(' ')[0]}
                </Link>

                <div className="border-t border-zinc-800/50 my-2" />

                {/* Manual PWA Install Option */}
                {deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-3 rounded-lg hover:bg-emerald-500/10 mb-1"
                  >
                    <Download className="w-4 h-4" />
                    {lang === 'en' ? 'Install FarmGuard App' : 'Sakinisha App ya FarmGuard'}
                  </button>
                )}

                <button
                  onClick={() => {
                    triggerTestAlert()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors px-3 py-3 rounded-lg hover:bg-amber-500/10 mb-1"
                >
                  <Bell className="w-4 h-4" />
                  {lang === 'en' ? 'Test 5s Alert' : 'Jaribu Arifa (Sekunde 5)'}
                </button>

                <button
                  onClick={() => {
                    handleSignOut()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors px-3 py-3 rounded-lg hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  {t.signOut}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 overflow-x-hidden">

        {/* Header Block */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between w-full">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] md:text-xs font-semibold text-emerald-300">
              {t.center}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 break-words leading-tight">{t.diagCenter}</h1>
            <p className="max-w-2xl text-zinc-400 text-sm md:text-base leading-relaxed">
              {t.centerDesc}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="#diagnostic" className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              {t.takePhoto.split(' ')[1] || 'Scan'}
            </a>
            <a href="#field-intel" className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              {t.weather}
            </a>
            <a href="#management" className="rounded-lg border border-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              {lang === 'en' ? 'Crop Hub' : 'Kitovu cha Mazao'}
            </a>
            <Link href="/marketplace" className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
              {lang === 'en' ? '🏷️ Bidding Marketplace' : '🏷️ Soko la Zabuni'}
            </Link>
          </div>
        </div>

        {/* PWA Alerts Panel */}
        <div className="mb-8">
          <PWANotificationManager lang={lang} />
        </div>

        {/* Workspace Layout */}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)] xl:items-start">

          {/* Diagnostic Area */}
          <section id="diagnostic" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">{t.uploadZone}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t.uploadZoneSub}
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 md:p-10 relative overflow-hidden">
              <AnimatePresence mode="wait">

                {/* Camera Modal */}
                {isCameraActive ? (
                  <motion.div
                    key="camera-stream-zone"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border border-emerald-500/20 rounded-2xl p-6 bg-zinc-950 flex flex-col items-center justify-center min-h-[400px] relative animate-fade-in"
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-h-[350px] rounded-xl object-cover bg-black"
                    />

                    <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full">
                      <button
                        onClick={capturePhoto}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        {t.capture}
                      </button>
                      <button
                        onClick={stopCamera}
                        className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                      >
                        {t.closeCamera}
                      </button>
                    </div>
                  </motion.div>
                ) : !preview ? (

                  /* Normal Upload zone */
                  <motion.div
                    key="upload-zone"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[400px] relative ${isDragging
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

                    <div className="w-20 h-20 rounded-full bg-zinc-800/80 flex items-center justify-center mb-6 shadow-inner relative group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-10 h-10 text-emerald-400" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{t.dragDrop}</h3>
                    <p className="text-zinc-400 mb-6">{t.browse}</p>

                    <div className="flex gap-3 mb-6 relative z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          startCamera()
                        }}
                        className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold transition-all flex items-center gap-2 animate-pulse"
                      >
                        <Camera className="w-4 h-4" />
                        {t.takePhoto}
                      </button>
                    </div>

                    <div className="text-xs text-zinc-500 flex items-center justify-center gap-4">
                      <span>{t.supports}</span>
                      <span>{t.maxSize}</span>
                    </div>
                  </motion.div>
                ) : (

                  /* Image preview & analysis actions */
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
                        <h3 className="text-2xl font-bold text-white mb-2">{t.imageReady}</h3>
                        <p className="text-zinc-400 text-sm">
                          {file?.name || 'camera_capture.jpg'} {file && `(${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {status === 'idle' && (
                          <button
                            onClick={handleAnalyze}
                            className="group relative w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-lg transition-all shadow-[0_0_35px_-8px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_-4px_rgba(16,185,129,0.55)] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
                          >
                            <Leaf className="w-5 h-5" />
                            {t.runDiagnostic}
                          </button>
                        )}

                        {status === 'uploading' && (
                          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center gap-4">
                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin animate-fade-in" />
                            <span className="text-zinc-300 font-medium">{t.uploadingSecure}</span>
                          </div>
                        )}

                        {status === 'analyzing' && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin animate-fade-in" />
                            <span className="text-emerald-400 font-medium">{t.neuralAnalyzing}</span>
                          </div>
                        )}

                        {status === 'success' && (
                          <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-fade-in">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h4 className="text-lg font-bold text-white mb-1">{t.analysisComplete}</h4>
                            <p className="text-emerald-400 text-sm mb-4">{t.successDesc}</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                              {latestScanId && (
                                <Link
                                  href={`/scan/${latestScanId}`}
                                  className="group w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg font-bold transition-all shadow-[0_0_25px_-6px_rgba(16,185,129,0.35)] hover:shadow-[0_0_40px_-4px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 text-sm focus:outline-none text-center"
                                >
                                  {t.viewReport}
                                </Link>
                              )}
                              <button
                                onClick={clearSelection}
                                className="w-full sm:w-auto px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors text-sm"
                              >
                                {t.newScan}
                              </button>
                            </div>
                          </div>
                        )}

                        {status === 'error' && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="flex items-start gap-3 mb-3">
                              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-shake" />
                              <div>
                                <h4 className="text-red-400 font-bold mb-1">{t.tryAgain}</h4>
                                <p className="text-red-400/80 text-sm">{errorMessage}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setStatus('idle')}
                              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors text-sm"
                            >
                              {t.tryAgain}
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

          {/* Microclimate Advisory */}
          <aside id="field-intel" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">{t.fieldIntel}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t.weatherSub}
              </p>
            </div>

            <div className="space-y-6 xl:sticky xl:top-24">
              <WeatherWidget />
            </div>
          </aside>
        </div>

        {/* ── Multi-Tab Management Hub: Scans vs Care Tracker vs Field Map ── */}
        <div id="management" className="mt-16 scroll-mt-24">
          <div className="border-b border-zinc-800/80 pb-4 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Tabs Trigger Headers */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full">
              <button
                onClick={() => setActiveTab('scans')}
                className={`pb-2 md:pb-4 px-2 text-lg md:text-xl font-bold tracking-tight transition-all relative text-left ${activeTab === 'scans' ? 'text-white border-l-4 md:border-l-0 md:border-b-2 border-emerald-400 font-extrabold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  {t.recentScans}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('tracker')}
                className={`pb-2 md:pb-4 px-2 text-lg md:text-xl font-bold tracking-tight transition-all relative text-left ${activeTab === 'tracker' ? 'text-white border-l-4 md:border-l-0 md:border-b-2 border-emerald-400 font-extrabold shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                  {lang === 'en' ? 'Adaptive Crop Care' : 'Mratibu wa Mazao'}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className={`pb-2 md:pb-4 px-2 text-lg md:text-xl font-bold tracking-tight transition-all relative text-left ${activeTab === 'map' ? 'text-white border-l-4 md:border-l-0 md:border-b-2 border-emerald-400 font-extrabold shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                  {lang === 'en' ? 'Field Satellite Map' : 'Ramani ya Shamba'}
                </span>
              </button>
            </div>

            {activeTab === 'scans' && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClearHistory}
                  className="text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-red-400/20"
                >
                  {t.clearHistory}
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">

            {/* ── TAB 1: RECENT SCANS LIST ── */}
            {activeTab === 'scans' && (
              <motion.div
                key="tab-scans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 animate-fade-in"
              >
                {scans.length === 0 ? (
                  <div className="text-center p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 text-zinc-500">
                    {t.noScans}
                  </div>
                ) : scans.map((scan, i) => {
                  const styles = getStyleForHealth(scan.health_status || 'Moderate')

                  return (
                    <Link href={`/scan/${scan.id}`} key={scan.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
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
                              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{t.diagnosis}</p>
                              <p className="text-zinc-200 font-medium text-xs md:text-sm">{scan.disease}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{lang === 'en' ? 'Health Status' : 'Hali ya Afya'}</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles.bg} ${styles.border} ${styles.color}`}>
                                {scan.health_status}
                              </span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <div className="flex justify-between items-end mb-1">
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{t.confidence}</p>
                                <span className="text-xs font-bold text-zinc-300">{scan.confidence}%</span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${scan.confidence}%` }}
                                  transition={{ duration: 1, delay: 0.2 + (i * 0.05) }}
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
              </motion.div>
            )}

            {/* ── TAB 2: ADAPTIVE CROP CARE TRACKER HUB ── */}
            {activeTab === 'tracker' && (
              <motion.div
                key="tab-tracker"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid gap-8 lg:grid-cols-2 animate-fade-in"
              >
                {trackedCrops.length === 0 ? (
                  <div className="col-span-2 text-center p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 text-zinc-500">
                    {lang === 'en' ? 'Perform leaf diagnostic scans first to initialize adaptive trackers.' : 'Fanya uchunguzi wa majani kwanza ili kuanzisha mratibu wa mazao.'}
                  </div>
                ) : trackedCrops.map((crop) => {
                  const styles = getStyleForHealth(crop.healthStatus)

                  const isCritical = crop.healthStatus === 'Critical'
                  const isModerate = crop.healthStatus === 'Moderate'
                  const scheduleLabel = isCritical
                    ? (lang === 'en' ? '🔴 URGENT DAILY CHECK REQUIRED' : '🔴 UCHUNGUZI WA HARAKA KILA SIKU')
                    : isModerate
                      ? (lang === 'en' ? '🟡 SEMI-WEEKLY scouting (3-day cycle)' : '🟡 UKAGUZI KILA SIKU 3')
                      : (lang === 'en' ? '🟢 WEEKLY VISUAL SCOUTING (7-day cycle)' : '🟢 UKAGUZI KILA BAADA YA SIKU 7')

                  const nextCheckDate = isCritical ? 'Tomorrow' : isModerate ? 'In 2 Days' : 'In 6 Days'
                  const nextCheckLabel = lang === 'en' ? `Next Scouting: ${nextCheckDate}` : `Ukaguzi Ujao: ${nextCheckDate === 'Tomorrow' ? 'Kesho' : nextCheckDate === 'In 2 Days' ? 'Siku 2' : 'Siku 6'}`

                  const tasks = trackerTasks[crop.plantName] || []
                  const totalTasks = tasks.length
                  const completedTasks = tasks.filter(t => t.completed).length
                  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

                  return (
                    <motion.div
                      key={crop.plantName}
                      className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all shadow-xl"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-800 shrink-0 bg-zinc-950">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={crop.imageUrl} alt={crop.plantName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg">{crop.plantName}</h3>
                              <p className="text-xs text-zinc-500">{lang === 'en' ? 'Last spotted:' : 'Uchunguzi wa mwisho:'} {crop.diseaseSpotted}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles.bg} ${styles.border} ${styles.color}`}>
                            {crop.healthStatus}
                          </span>
                        </div>

                        <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wide text-xs">{lang === 'en' ? 'Adaptive Scouting Protocol' : 'Utaratibu wa Ukaguzi'}</h4>
                              <p className="text-xs text-zinc-300 mb-2 font-semibold">{scheduleLabel}</p>
                              <div className="flex gap-2">
                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                  {nextCheckLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-end mb-2 text-xs">
                            <span className="text-zinc-400 font-semibold uppercase tracking-wider">{lang === 'en' ? 'Care Checklist Protocol' : 'Orodha ya Kazi'}</span>
                            <span className="text-emerald-400 font-bold">{percentage}% Completed</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 mb-6">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => toggleTask(crop.plantName, task.id)}
                              className="flex items-start justify-between gap-3 p-3 bg-zinc-950/40 hover:bg-zinc-950/80 border border-zinc-800/40 rounded-xl cursor-pointer select-none transition-colors group"
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => { }}
                                  className="mt-0.5 accent-emerald-400"
                                />
                                <span className={`text-xs ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                                  {task.text}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTask(crop.plantName, task.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 transition-opacity"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-zinc-800/60 pt-4 mt-auto">
                        <input
                          type="text"
                          value={customTaskInput[crop.plantName] || ''}
                          onChange={(e) => setCustomTaskInput({ ...customTaskInput, [crop.plantName]: e.target.value })}
                          placeholder={lang === 'en' ? "Schedule new localized chore..." : "Panga kazi mpya hapa..."}
                          className="flex-1 bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500/40"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addCustomTask(crop.plantName)
                            }
                          }}
                        />
                        <button
                          onClick={() => addCustomTask(crop.plantName)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold transition-all shrink-0"
                          title="Schedule Custom Chore"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                    </motion.div>
                  )
                })}
              </motion.div>
            )}

            {/* ── TAB 3: ADAPTIVE FIELD SATELLITE MAP ── */}
            {activeTab === 'map' && (
              <motion.div
                key="tab-map"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 animate-fade-in"
              >
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="mb-4">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-400 animate-pulse" />
                      {lang === 'en' ? 'Field Health Satellite Map' : 'Ramani ya Satilaiti ya Afya'}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {lang === 'en'
                        ? 'Real-time diagnostic hot-spots mapped to your field plot. Colored pins show crop pathology (Red = Critical, Yellow = Moderate, Green = Healthy).'
                        : 'Maeneo yenye maambukizi ya ugonjwa yaliyopangwa kwenye ramani ya shamba lako (Nyekundu = Hatari, Njano = Kiasi, Kijani = Afya).'}
                    </p>
                  </div>

                  <div className="relative">
                    {!mapLoaded && (
                      <div className="absolute inset-0 bg-zinc-950/80 rounded-2xl flex items-center justify-center gap-3 z-30">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <span className="text-zinc-400 text-sm">Loading field satellite imaging...</span>
                      </div>
                    )}
                    <div
                      ref={mapContainerRef}
                      id="field-map-container"
                      className="h-[400px] md:h-[480px] w-full rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl relative z-10"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
