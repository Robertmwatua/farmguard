'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Globe,
  Sun,
  Moon,
  LogOut,
  BookOpen,
  GraduationCap,
  Award,
  HelpCircle,
  Trophy,
  ChevronRight,
  Bot,
  Send,
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Sprout,
  Droplets,
  Bug,
  Activity,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { translations } from '@/lib/translations'
import HamburgerMenuNav from '@/components/HamburgerMenuNav'

// Local teachings curriculum data
const curriculumData = {
  en: [
    {
      id: 'soil',
      title: 'Soil Chemistry & Nutrient Management',
      icon: Sprout,
      desc: 'Master the elements of dirt. Learn NPK balances, pH testing, and organic composting.',
      color: 'from-amber-600/20 to-emerald-600/20',
      borderColor: 'border-amber-500/30',
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      lessons: [
        { title: 'The NPK Trio', content: 'Nitrogen (N) stimulates leafy vegetative growth. Phosphorus (P) fosters robust root systems and blooming. Potassium (K) drives disease resistance and structural cellular thickness.' },
        { title: 'Demystifying pH', content: 'Most crops thrive in slightly acidic to neutral soils (6.0 - 7.0 pH). Highly acidic soils tie up essential nutrients; apply agricultural lime (calcium carbonate) to raise pH.' },
        { title: 'Organic Revitalization', content: 'Incorporate well-rotted animal manure and green cover crop residues (like clover) to rebuild soil organic matter, increasing water-holding capacity by up to 20%.' }
      ]
    },
    {
      id: 'water',
      title: 'Precision Irrigation & Moisture Efficiency',
      icon: Droplets,
      desc: 'Learn high-efficiency drip networks, soil tensiometers, and seasonal water budgeting.',
      color: 'from-blue-600/20 to-teal-600/20',
      borderColor: 'border-blue-500/30',
      badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      lessons: [
        { title: 'Drip vs Overhead', content: 'Drip systems deliver water directly to the plant root zones, cutting evaporation loss by 40-50% compared to traditional overhead sprinklers and keeping leaves dry to prevent fungal incubation.' },
        { title: 'Tensiometer Mechanics', content: 'Tensiometers measure soil water tension. Water crops when the gauge reads between 30-50 centibars; this keeps roots oxygenated while avoiding water stress.' },
        { title: 'Mulching Shields', content: 'Overlaying dry grass, straw, or black plastic sheeting acts as a thermal shield. This slows moisture evaporation, keeping soil temperatures stable and cutting weed growth by 90%.' }
      ]
    },
    {
      id: 'pests',
      title: 'Integrated Pest Management & Organic Defenses',
      icon: Bug,
      desc: 'Stop pests without heavy chemicals. Practice beneficial insect planting and organic sprays.',
      color: 'from-red-600/20 to-amber-600/20',
      borderColor: 'border-red-500/30',
      badgeColor: 'text-red-400 bg-red-400/10 border-red-400/20',
      lessons: [
        { title: 'Biological Warfare', content: 'Interplant sunflowers, marigolds, and dill. These companion crops attract beneficial predators like ladybugs and lacewings, which naturally devour aphid populations.' },
        { title: 'The Neem Solution', content: 'Mix 30ml of high-quality cold-pressed Neem Oil with 5ml of organic liquid soap in 5L of water. Spray at dusk to repel sucking pests without poisoning pollinators.' },
        { title: 'Physical Barriers', content: 'Employ row covers and insect netting (0.6mm mesh) to physically quarantine fragile seedlings from early infestation by whiteflies, thrips, and beetles.' }
      ]
    },
    {
      id: 'tech',
      title: 'Hydroponics & Controlled Agro-Tech',
      icon: Activity,
      desc: 'Discover vertical hydroponics, water-soluble nutrients, and greenhouse ventilation.',
      color: 'from-emerald-600/20 to-cyan-600/20',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      lessons: [
        { title: 'NFT Hydroponics', content: 'Nutrient Film Technique (NFT) passes a continuous, shallow stream of water-soluble NPK over roots. This maximizes oxygen and water absorption, speeding lettuce growth cycles by 30%.' },
        { title: 'Substrate Choices', content: 'Use coco coir or expanded clay pebbles (hydroton). They provide excellent drainage, structural anchor support, and remain completely chemically inert.' },
        { title: 'Ventilation Cycles', content: 'Greenhouses must maintain a relative humidity below 70% to prevent mildew. Establish cross-draft active fans to change field air 60 times per hour.' }
      ]
    },
    {
      id: 'livestock',
      title: 'Smart Poultry & Small Livestock Care',
      icon: Sparkles,
      desc: 'Master layer nutrition, biosecurity protocols, and temperature-controlled brooding.',
      color: 'from-purple-600/20 to-pink-600/20',
      borderColor: 'border-purple-500/30',
      badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      lessons: [
        { title: 'Brooder Warmth', content: 'Keep chick brooders at 35°C (95°F) for the first week, lowering it by 2.5°C weekly until fully feathered. Cold chicks huddle, lead to smothering and poor growth.' },
        { title: 'Feed-to-Egg Ratios', content: 'Layers require 16% crude protein feeds fortified with 3.5% calcium. Insufficient calcium drains the hen\'s skeletal frame, resulting in weak, soft-shelled eggs.' },
        { title: 'Biosecurity Shields', content: 'Use virucidal footbaths at all coop entrances. Limit external visitors to prevent Newcastle Disease and Avian Influenza from tracking in on footwear.' }
      ]
    }
  ],
  sw: [
    {
      id: 'soil',
      title: 'Kemia ya Udongo na Lishe ya Mimea',
      icon: Sprout,
      desc: 'Miliki sayansi ya ardhi. Jifunze uwiano wa NPK, kupima pH, na kutengeneza mbolea ya viumbe hai.',
      color: 'from-amber-600/20 to-emerald-600/20',
      borderColor: 'border-amber-500/30',
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      lessons: [
        { title: 'Utatu wa NPK', content: 'Nitrogen (N) inachochea ukuaji wa majani. Phosphorus (P) inaimarisha mizizi na maua. Potassium (K) inaleta kinga ya magonjwa na unene wa seli za mmea.' },
        { title: 'Kuelewa pH ya Udongo', content: 'Mazao mengi yanasitawi kwenye udongo usio na tindikali kali (6.0 hadi 7.0 pH). Udongo wenye tindikali nyingi huzuia lishe; weka chokaa ya kilimo ili kupunguza tindikali.' },
        { title: 'Kurutubisha Kiasili', content: 'Changanya samadi iliyooza vizuri au mabaki ya mimea ya jamii ya kunde (kama chooko) ili kuongeza uwezo wa udongo kushika maji kwa hadi 20%.' }
      ]
    },
    {
      id: 'water',
      title: 'Umwagiliaji wa Matone na Utunzaji Maji',
      icon: Droplets,
      desc: 'Jifunze mitandao ya matone, vifaa vya kupima unyevu, na bajeti ya maji ya msimu.',
      color: 'from-blue-600/20 to-teal-600/20',
      borderColor: 'border-blue-500/30',
      badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      lessons: [
        { title: 'Matone dhidi ya Nguvu ya Juu', content: 'Mifumo ya matone inamwaga maji moja kwa moja kwenye mizizi, ikipunguza upotezaji wa maji kwa 40-50% ikilinganishwa na mifumo ya juu, na inaacha majani yakiwa makavu kuzuia fangasi.' },
        { title: 'Vipimo vya Tensiometer', content: 'Tensiometer inapima nguvu ya unyevu wa udongo. Mwagilia maji wakati kipimo kiko kati ya centibars 30-50 ili kuacha mizizi ipumue bila kukauka.' },
        { title: 'Kuweka Matandazo (Mulching)', content: 'Kuweka nyasi kavu au plastiki nyeusi juu ya udongo inazuia uvukaji wa maji, kuweka joto vizuri, na kupunguza magugu kwa 90%.' }
      ]
    },
    {
      id: 'pests',
      title: 'Usimamizi wa Wadudu Kiasili (IPM)',
      icon: Bug,
      desc: 'Zuia wadudu bila kemikali kali. Panda mimea rafiki na tumia dawa za asili za kufukuza wadudu.',
      color: 'from-red-600/20 to-amber-600/20',
      borderColor: 'border-red-500/30',
      badgeColor: 'text-red-400 bg-red-400/10 border-red-400/20',
      lessons: [
        { title: 'Kupanda Mimea Mseto', content: 'Panda alizeti, marigold, na bizari karibu na mboga. Mimea hii inavutia wadudu rafiki kama ladybugs ambao wanakula wadudu waharibifu.' },
        { title: 'Dawa ya Mafuta ya Mwarobaini', content: 'Changanya mililita 30 za mafuta ya mwarobaini na mililita 5 za sabuni ya maji kwenye lita 5 za maji. Puliza jioni ili kufukuza wadudu bila kuua nyuki.' },
        { title: 'Uzuiaji wa Kimwili', content: 'Tumia nyavu laini za wadudu (milimita 0.6) kufunika vitalu ili kuzuia nzi weupe, thrips, na mende wasishambulie miche michanga.' }
      ]
    },
    {
      id: 'tech',
      title: 'Kilimo cha Hydroponics na Teknolojia za Kijani',
      icon: Activity,
      desc: 'Gundua hydroponics ya wima, virutubisho vya maji, na mzunguko wa hewa kwenye chafu (greenhouse).',
      color: 'from-emerald-600/20 to-cyan-600/20',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      lessons: [
        { title: 'Mfumo wa NFT', content: 'NFT inapitisha mtiririko mdogo wa virutubisho vya maji kwenye mizizi. Hii inaongeza hewa na maji, ikiongeza kasi ya ukuaji wa saladi kwa 30%.' },
        { title: 'Chaguzi za Substrate', content: 'Tumia makapi ya nazi (coco coir) au mawe ya udongo wa mfinyanzi (hydroton). Inasaidia mizizi kushika na haileti athari za kemia.' },
        { title: 'Mzunguko wa Hewa', content: 'Mabanda ya chafu yanapaswa kuwekwa unyevu chini ya 70% kuzuia ukungu. Weka feni za kuvuta hewa ili kubadilisha hewa mara 60 kwa saa.' }
      ]
    },
    {
      id: 'livestock',
      title: 'Ufugaji wa Kuku na Wanyama Wadogo',
      icon: Sparkles,
      desc: 'Miliki lishe ya kuku wa mayai, taratibu za kuzuia magonjwa, na udhibiti wa joto la vifaranga.',
      color: 'from-purple-600/20 to-pink-600/20',
      borderColor: 'border-purple-500/30',
      badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      lessons: [
        { title: 'Joto la Vifaranga', content: 'Weka joto la vifaranga kuwa 35°C katika wiki ya kwanza, kisha punguza kwa 2.5°C kila wiki hadi waote manyoya yote kuzuia rundo na vifo.' },
        { title: 'Lishe ya Kuku wa Mayai', content: 'Kuku wanahitaji 16% ya protini na 3.5% ya calcium. Upungufu wa calcium unadhoofisha mifupa ya kuku na kuleta mayai yenye ganda laini.' },
        { title: 'Ulinzi dhidi ya Magonjwa', content: 'Weka beseni ya dawa ya kuua virusi mlangoni. Punguza wageni ili kuzuia ugonjwa wa kideri (Newcastle) na homa ya ndege kuingia bandani.' }
      ]
    }
  ]
}

// Local interactive quiz questions
const quizQuestions = {
  en: [
    {
      q: "What does the 'N' stand for in NPK commercial fertilizer?",
      options: ["Nickel", "Nitrogen", "Sodium", "Neon"],
      answer: 1,
      explanation: "Nitrogen (N) is vital for leafy green growth and foliage development. Without it, plant leaves turn pale yellow."
    },
    {
      q: "Which soil type holds the highest volume of water but suffers from extremely poor drainage?",
      options: ["Sandy Soil", "Silt Soil", "Clay Soil", "Loamy Soil"],
      answer: 2,
      explanation: "Clay soil is made of very fine particles that pack tightly, holding water extremely well but making it slow to drain, which can lead to root rot."
    },
    {
      q: "Which crop rotation family naturally binds and deposits nitrogen back into the soil?",
      options: ["Legumes (Beans/Peas)", "Solanaceae (Tomatoes/Potatoes)", "Poaceae (Maize/Wheat)", "Brassicas (Cabbage/Kale)"],
      answer: 0,
      explanation: "Legumes form symbiotic relationships with Rhizobium bacteria, which fix atmospheric nitrogen directly into the root nodules, nourishing the soil."
    },
    {
      q: "What is the organic dilution ratio for neem oil sprays to safely repel sucking crop pests?",
      options: ["Pour pure oil onto stems", "30ml Neem + 5ml Soap in 5L Water", "500ml Neem in 1L Water", "Mix equal parts of Neem and cooking oil"],
      answer: 1,
      explanation: "Diluting 30ml of Neem oil with 5ml of soap acts as an emulsifier in 5 liters of water, creating a highly safe and protective spray for foliage."
    },
    {
      q: "Under what soil pH value do plants generally suffer from nutrient lockout due to extreme acidity?",
      options: ["Around 6.5 pH", "Neutral 7.0 pH", "Below 5.0 pH", "Above 8.0 pH"],
      answer: 2,
      explanation: "Soils below 5.0 pH are highly acidic, which chemical bonds essential minerals (like Phosphorus), causing nutrient lockout and stunting plant growth."
    }
  ],
  sw: [
    {
      q: "Je, herufi 'N' inawakilisha nini katika mbolea ya NPK?",
      options: ["Nickel", "Nitrogen (Naitrojeni)", "Sodium (Chumvi)", "Neon"],
      answer: 1,
      explanation: "Nitrogen (N) ni muhimu kwa ukuaji wa majani ya kijani. Bila nitrogen, majani ya mmea yanakuwa ya njano na mnyonge."
    },
    {
      q: "Ni aina gani ya udongo inayoshikilia maji mengi lakini haina mtiririko mzuri wa mifereji?",
      options: ["Udongo wa mchanga", "Udongo wa mchanga mwepesi", "Udongo wa mfinyanzi", "Udongo wa mboji"],
      answer: 2,
      explanation: "Udongo wa mfinyanzi una chembechembe ndogo sana zinazoshikana karibu, na kufanya maji yasivuje kwa urahisi, jambo linaloweza kuozesha mizizi."
    },
    {
      q: "Ni jamii gani ya mazao kwenye mzunguko wa mashamba inayoongeza nitrogen asili kwenye udongo?",
      options: ["Jamii ya kunde na maharagwe", "Jamii ya nyanya na viazi", "Jamii ya mahindi na ngano", "Jamii ya kabichi na sukumawiki"],
      answer: 0,
      explanation: "Mimea ya jamii ya kunde ina bakteria rafiki kwenye mizizi yao wanaokusanya nitrogen kutoka kwenye hewa na kuiweka kwenye udongo kiasili."
    },
    {
      q: "Ni uwiano gani wa dawa ya mafuta ya mwarobaini ya asili kufukuza wadudu shambani?",
      options: ["Puliza mafuta tupu kwenye mashina", "mililita 30 za mwarobaini + mililita 5 za sabuni kwenye lita 5 za maji", "mililita 500 za mwarobaini kwenye lita 1 ya maji", "Changanya mafuta ya mwarobaini na mafuta ya kupikia nusu kwa nusu"],
      answer: 1,
      explanation: "Kupunguza mililita 30 za mwarobaini na mililita 5 za sabuni ya maji kwenye lita 5 za maji inatengeneza dawa salama sana isiyodhuru nyuki au mazao."
    },
    {
      q: "Chini ya pH gani ya udongo mmea unaanza kukosa virutubisho kwa sababu ya tindikali iliyozidi?",
      options: ["Karibu 6.5 pH", "Neutral 7.0 pH", "Chini ya 5.0 pH", "Juu ya 8.0 pH"],
      answer: 2,
      explanation: "Udongo chini ya 5.0 pH una tindikali kali sana ambayo inafunga virutubisho muhimu kama Phosphorus visifyozwe na mizizi, na kudumaza mmea."
    }
  ]
}

export default function TeachingsPage() {
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Quiz states
  const [quizActive, setQuizActive] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const recognitionRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)
    document.documentElement.classList.toggle('light', finalTheme === 'light')

    // Capture PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Initial greeting in teaching bot
    const welcome = savedLang === 'sw'
      ? "Habari! Mimi ni Mwalimu wako wa AI wa Masomo ya Kilimo. Uliza maswali yoyote kuhusu mimea, kemia ya udongo, kufuga, au umwagiliaji. Nitakujibu kwa kilimo TU! 🌱"
      : "Hello! I am your AI Agronomy Teacher. Ask me any questions about soil chemistry, composting, precision irrigation, crop spacing, or livestock rearing. I am trained to discuss farming ONLY! 🌱"
    setChatMessages([{ role: 'bot', content: welcome }])

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'sw' : 'en'
    setLang(nextLang)
    localStorage.setItem('lang', nextLang)

    // Reset greetings and questions language
    const welcome = nextLang === 'sw'
      ? "Habari! Mimi ni Mwalimu wako wa AI wa Masomo ya Kilimo. Uliza maswali yoyote kuhusu mimea, kemia ya udongo, kufuga, au umwagiliaji. Nitakujibu kwa kilimo TU! 🌱"
      : "Hello! I am your AI Agronomy Teacher. Ask me any questions about soil chemistry, composting, precision irrigation, crop spacing, or livestock rearing. I am trained to discuss farming ONLY! 🌱"
    setChatMessages([{ role: 'bot', content: welcome }])

    // If quiz is active, reset it to match language
    setQuizActive(false)
    setCurrentQ(0)
    setSelectedOpt(null)
    setAnswered(false)
    setScore(0)
    setShowExplanation(false)
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('light', nextTheme === 'light')
  }

  const t = translations[lang]

  // Submit chat message to specialized teachings API
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat/teachings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages.concat({ role: 'user', content: userMsg }).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })
      const payload = await res.json()
      setChatMessages(prev => [...prev, { role: 'bot', content: payload.content }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'bot', content: lang === 'en' ? 'Connection dropped. Please try again.' : 'Hitilafu ya mtandao. Tafadhali jaribu tena.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // Voice speech dictation inside teachings
  const startSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert(lang === 'en' ? 'Speech recognition not supported in this browser.' : 'Utambuzi wa sauti hauhimiliwi kwenye kivinjari hiki.')
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
      if (e.results && e.results.length > 0) {
        const transcript = e.results[0][0].transcript
        setChatInput(transcript)
      }
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch (err) {
        console.error("Mic stop error:", err)
      }
      setIsListening(false)
      return
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch (err) {
      setIsListening(false)
    }
  }

  // Speak bot narration out loud
  const speakLastMessage = () => {
    if (typeof window === 'undefined') return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const lastMsg = chatMessages[chatMessages.length - 1]?.content || ''
    if (!lastMsg || !window.speechSynthesis) return

    const utterance = new SpeechSynthesisUtterance(lastMsg)

    const setVoice = () => {
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

    // On mobile, voices are often loaded asynchronously
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice
    } else {
      setVoice()
    }
  }

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [chatMessages])

  // Quiz progression
  const handleOptionSelect = (optIdx: number) => {
    if (answered) return
    setSelectedOpt(optIdx)
    setAnswered(true)
    const currentList = quizQuestions[lang]
    if (optIdx === currentList[currentQ].answer) {
      setScore(prev => prev + 1)
    }
    setShowExplanation(true)
  }

  const handleNextQuestion = () => {
    const currentList = quizQuestions[lang]
    if (currentQ < currentList.length - 1) {
      setCurrentQ(prev => prev + 1)
      setSelectedOpt(null)
      setAnswered(false)
      setShowExplanation(false)
    } else {
      // Completed state is represented by showing score
    }
  }

  const restartQuiz = () => {
    setCurrentQ(0)
    setSelectedOpt(null)
    setAnswered(false)
    setScore(0)
    setShowExplanation(false)
    setQuizActive(true)
  }

  const activeCurriculum = curriculumData[lang]
  const currentQuizList = quizQuestions[lang]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans pb-24 transition-colors duration-300">

      {/* Navigation */}
      <HamburgerMenuNav
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        backHref="/dashboard"
        backLabel={t.backToDashboard}
        pageTitle={lang === 'en' ? 'FarmGuard Academy' : 'Chuo cha FarmGuard'}
        pageTitleIcon={<BookOpen className="w-4 h-4 text-emerald-400" />}
        deferredPrompt={deferredPrompt}
        onInstallApp={handleInstallApp}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">

        {/* Header Block */}
        <div className="mb-12 text-center max-w-3xl mx-auto relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 md:w-48 h-32 md:h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/5 text-emerald-300 text-xs font-semibold mb-4">
            <GraduationCap className="w-3.5 h-3.5" />
            {lang === 'en' ? 'FarmGuard Academy' : 'Chuo cha FarmGuard'}
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            {lang === 'en' ? 'Smart Agronomy Teachings' : 'Masomo ya Kilimo cha Kisasa'}
          </h1>
          <p className="text-zinc-400 text-md leading-relaxed">
            {lang === 'en'
              ? 'Become a master of crop science. Explore deep botanical curriculum modules, interact with our strict AI Agronomy Copilot, and test your knowledge in the dynamic Academy Quiz!'
              : 'Kuwa mtaalamu wa sayansi ya mazao. Chunguza masomo ya kina, wasiliana na Mwalimu wetu wa Kilimo wa AI, na pima ufahamu wako kupitia chemsha bongo ya kilimo!'}
          </p>
        </div>

        {/* Dynamic Two-Column Layout */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">

          {/* Left Column: Curriculums & Quiz */}
          <div className="space-y-12">

            {/* 📖 Curriculum Modules Grid */}
            <section className="space-y-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-emerald-400" />
                  {lang === 'en' ? 'Botanical Masterclasses' : 'Mitaala Kamili ya Kilimo'}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  {lang === 'en' ? 'Click on a module to expand step-by-step masterclasses.' : 'Bonyeza kwenye somo lolote ili kufungua maelekezo ya kina ya hatua kwa hatua.'}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {activeCurriculum.map((item) => {
                  const Icon = item.icon
                  const isOpen = activeCategory === item.id

                  return (
                    <div
                      key={item.id}
                      className={`w-full col-span-1 sm:col-span-${isOpen ? '2' : '1'} bg-zinc-900/40 border ${item.borderColor} rounded-3xl p-5 md:p-6 transition-all hover:bg-zinc-900/60 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4 gap-2">
                          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center border border-zinc-800`}>
                            <Icon className="w-6 h-6 text-emerald-400" />
                          </div>
                          <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                            {lang === 'en' ? 'Core Masterclass' : 'Somo Kuu'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-white text-lg mb-2">{item.title}</h3>
                        <p className="text-zinc-400 text-xs leading-relaxed mb-4">{item.desc}</p>

                        {/* Expanded Lessons */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden space-y-4 border-t border-zinc-800/80 pt-4 mt-4"
                            >
                              {item.lessons.map((lesson, idx) => (
                                <div key={idx} className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800/40">
                                  <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-1.5">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    {lesson.title}
                                  </h4>
                                  <p className="text-zinc-300 text-xs leading-relaxed">{lesson.content}</p>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button
                        onClick={() => setActiveCategory(isOpen ? null : item.id)}
                        className={`w-full py-3 mt-4 border border-zinc-800 hover:border-emerald-500/20 hover:bg-emerald-500/5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${isOpen ? 'text-emerald-400' : 'text-zinc-400'}`}
                      >
                        <span>{isOpen ? (lang === 'en' ? 'Close Curriculum' : 'Funga Somo') : (lang === 'en' ? 'Expand Curriculum' : 'Fungua Somo')}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90 text-emerald-400' : ''}`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 🏆 Academy Interactive Quiz */}
            <section className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-5 md:p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-800/60 pb-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6 text-emerald-400 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      {lang === 'en' ? 'Academy Agronomy Quiz' : 'Chemsha Bongo ya Chuo'}
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1">
                      {lang === 'en' ? 'Test your biochemistry knowledge to earn certification points.' : 'Jaribu ufahamu wako wa kemia ya kilimo kupata alama za sifa.'}
                    </p>
                  </div>
                </div>

                {!quizActive && (
                  <button
                    onClick={restartQuiz}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  >
                    {lang === 'en' ? 'Start Academy Quiz' : 'Anza Chemsha Bongo'}
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {quizActive ? (
                  <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Progress */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider">
                        {lang === 'en' ? `Question ${currentQ + 1} of ${currentQuizList.length}` : `Swali ${currentQ + 1} kati ya ${currentQuizList.length}`}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {lang === 'en' ? `Score: ${score}` : `Alama: ${score}`}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${((currentQ + 1) / currentQuizList.length) * 100}%` }}
                      />
                    </div>

                    {/* Question */}
                    <h3 className="text-lg font-bold text-white leading-relaxed">
                      {currentQuizList[currentQ].q}
                    </h3>

                    {/* Options Grid */}
                    <div className="grid gap-3">
                      {currentQuizList[currentQ].options.map((opt, oIdx) => {
                        const isSelected = selectedOpt === oIdx
                        const isCorrect = currentQuizList[currentQ].answer === oIdx

                        let optStyle = 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/30'
                        if (answered) {
                          if (isCorrect) {
                            optStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          } else if (isSelected) {
                            optStyle = 'border-red-500/40 bg-red-500/10 text-red-400'
                          } else {
                            optStyle = 'border-zinc-800/40 bg-zinc-950/20 opacity-50'
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleOptionSelect(oIdx)}
                            disabled={answered}
                            className={`w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all flex items-center justify-between ${optStyle}`}
                          >
                            <span>{opt}</span>
                            {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400" />}
                          </button>
                        )
                      })}
                    </div>

                    {/* Explanation */}
                    {showExplanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl"
                      >
                        <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5 mb-1.5">
                          <Lightbulb className="w-4 h-4 text-emerald-400" />
                          {lang === 'en' ? 'Biochemical Explanation' : 'Ufafanuzi wa Kisayansi'}
                        </h4>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                          {currentQuizList[currentQ].explanation}
                        </p>
                      </motion.div>
                    )}

                    {/* Next Button */}
                    {answered && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleNextQuestion}
                          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2"
                        >
                          <span>{currentQ < currentQuizList.length - 1 ? (lang === 'en' ? 'Next Question' : 'Swali Linalofuata') : (lang === 'en' ? 'View Final Score' : 'Angalia Matokeo')}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* Completion / Closed state */
                  currentQ === currentQuizList.length - 1 && answered ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-6"
                    >
                      <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {lang === 'en' ? 'Quiz Completed!' : 'Chemsha Bongo Imekamilika!'}
                      </h3>
                      <p className="text-zinc-400 text-sm mb-6">
                        {lang === 'en'
                          ? `You scored ${score} out of ${currentQuizList.length} biochemistry points.`
                          : `Umepata alama ${score} kati ya ${currentQuizList.length} za kemia ya kilimo.`}
                      </p>

                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={restartQuiz}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Retake Quiz' : 'Rudia Tena'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setQuizActive(false)
                            setAnswered(false)
                            setCurrentQ(0)
                          }}
                          className="w-full sm:w-auto px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors"
                        >
                          {lang === 'en' ? 'Close Panel' : 'Funga Panel'}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-10 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                      {lang === 'en' ? 'Click "Start Academy Quiz" to test your agricultural science skills!' : 'Bonyeza "Anza Chemsha Bongo" ili kupima ujuzi wako wa kilimo!'}
                    </div>
                  )
                )}
              </AnimatePresence>
            </section>

          </div>

          {/* Right Column: AI Academy Copilot */}
          <aside className="space-y-6">

            {/* AI Classroom Copilot Card */}
            <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-3xl p-4 md:p-6 h-[550px] max-h-[85dvh] lg:h-[650px] lg:max-h-none flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />

              <div className="flex items-center justify-between pb-2 md:pb-3 border-b border-zinc-800/60 mb-2 md:mb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
                      {lang === 'en' ? 'Agronomy Classroom Bot' : 'Mwalimu wa Kilimo wa AI'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{lang === 'en' ? 'Strict Education' : 'Masomo ya Kilimo Tu'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={speakLastMessage}
                    className={`p-1.5 rounded-lg border text-zinc-400 hover:text-white transition-all ${isSpeaking ? 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse' : 'border-zinc-800 bg-zinc-950/40'}`}
                    title={lang === 'en' ? 'Read Aloud' : 'Sikiliza Somo'}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Chat history */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent text-xs mb-3">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-3.5 rounded-2xl leading-relaxed break-words ${m.role === 'user'
                      ? 'bg-emerald-500 text-zinc-950 font-bold rounded-tr-none shadow-md shadow-emerald-950/15'
                      : 'bg-zinc-800/80 text-zinc-200 rounded-tl-none border border-zinc-700/20 whitespace-pre-line'
                      }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800/80 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 border border-zinc-700/20 max-w-[85%]">
                      <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      <span className="text-[10px] text-zinc-400 font-medium leading-tight">Formulating lesson plans...</span>
                    </div>
                  </div>
                )}
                {isListening && (
                  <div className="flex justify-start animate-fade-in mt-1 shrink-0">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 animate-pulse text-[10px] text-emerald-400 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {lang === 'en' ? 'Classroom listening...' : 'Mwalimu anasikiliza...'}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleChatSubmit} className="flex gap-1.5 shrink-0 relative">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth' }), 300)}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={lang === 'en' ? "Ask about soils, irrigation, crops..." : "Uliza kuhusu udongo, kilimo, mifugo..."}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3.5 md:py-3 pl-3.5 pr-10 text-xs focus:outline-none focus:border-emerald-500/40 appearance-none"
                  />
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-red-500/15 text-red-400 animate-pulse' : 'text-zinc-500 hover:text-emerald-400'
                      }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-600 rounded-xl font-bold transition-all shrink-0 shadow-md shadow-emerald-500/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Strict Notice banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-extrabold text-xs uppercase tracking-wide">
                  {lang === 'en' ? 'Strict Agri-Prompt Notice' : 'Ilani ya Kilimo Tu'}
                </h4>
                <p className="text-zinc-400 text-[10px] leading-relaxed mt-1">
                  {lang === 'en'
                    ? 'Our Classroom Copilot is strictly programmed to discuss agriculture. Topics outside plants, livestock, and agronomy will be politely declined to save processing power.'
                    : 'Mwalimu wetu wa AI ameratibiwa kujadili kilimo TU. Mada zisizohusu mazao, udongo, au mifugo zitakataliwa kwa adabu ili kuokoa nguvu za mfumo.'}
                </p>
              </div>
            </div>

          </aside>

        </div>

      </main>

    </div>
  )
}
