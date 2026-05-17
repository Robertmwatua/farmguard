'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowLeft, Activity, Droplet, Sprout, Info, ShieldAlert, Loader2, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import WeatherWidget from '@/components/WeatherWidget'
import NearbyAgrovets from '@/components/NearbyAgrovets'

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

  useEffect(() => {
    if (id) {
      fetchScan(id)
    }
  }, [id])

  const fetchScan = async (scanId: string) => {
    const { data: dbData, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()

    if (dbData) {
      setData(dbData)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-emerald-400 flex flex-col items-center justify-center gap-4">
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
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans pb-24">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <div className="w-px h-6 bg-zinc-800" />
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">FarmGuard AI</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Report Navigator
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">{data.plant_name} Intelligence Report</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Jump between the farmer summary, technical diagnosis, treatment plan, weather risk,
                and the full-width agrovet marketplace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="#summary" className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                Summary
              </a>
              <a href="#overview" className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                Diagnosis
              </a>
              <a href="#treatment" className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                Treatment
              </a>
              <a href="#weather" className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                Weather
              </a>
              <a href="#agrovets" className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-300">
                Agrovets
              </a>
            </div>
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid lg:grid-cols-12 gap-8"
        >
          
          {/* Left Column: Image & High-level Stats */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div variants={itemVariants} className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900">
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
              <p className="text-zinc-400 mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Scanned {new Date(data.created_at).toLocaleString()}
              </p>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-800/50">
                  <span className="text-zinc-500 font-medium">Detected Condition</span>
                  <span className={`font-bold ${styles.color}`}>{data.disease}</span>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-zinc-500 font-medium">Neural Confidence</span>
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

            {/* Medicine Advice Card */}
            <motion.div variants={itemVariants} className="bg-zinc-900/50 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-emerald-950/10">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ShieldCheck className="w-24 h-24 text-emerald-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Droplet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Recommended Treatment</h3>
                  <p className="text-xs text-zinc-500 capitalize">{treatmentNeeded} Prescription</p>
                </div>
              </div>

              <div className="text-sm text-zinc-300 leading-relaxed mb-6">
                {treatmentNeeded === 'fungicide' && (
                  <p>
                    Apply a systemic, broad-spectrum fungicide containing <strong className="text-emerald-400">Metalaxyl-M</strong> or a protective cover of <strong className="text-emerald-400">Mancozeb 80% WP</strong>. Dilute at 50g per 20L of water and spray thoroughly on leaf surfaces. Repeat every 7-10 days depending on weather humidity.
                  </p>
                )}
                {treatmentNeeded === 'insecticide' && (
                  <p>
                    Apply a premium insecticide containing <strong className="text-emerald-400">Emamectin Benzoate 5% SG</strong> or <strong className="text-emerald-400">Chlorantraniliprole</strong>. Direct the spray into the plant whorl where caterpillars hide. Apply early morning or late evening.
                  </p>
                )}
                {treatmentNeeded === 'copper oxychloride' && (
                  <p>
                    Treat with a preventive bactericide/fungicide containing <strong className="text-emerald-400">Copper Oxychloride 50% WP</strong>. Ensure full canopy spray coverage. Avoid application under high temperature conditions to prevent phytotoxicity.
                  </p>
                )}
              </div>

              <a 
                href="#agrovets"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] focus:outline-none"
              >
                <Sprout className="w-4 h-4" />
                Purchase Now
              </a>
            </motion.div>

          </div>

          {/* Right Column: Detailed Analysis */}
          <div className="lg:col-span-7 space-y-6">
            {/* Farmer Summary */}
            <motion.div id="summary" variants={itemVariants} className="scroll-mt-28 bg-emerald-500/10 border border-emerald-400/20 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-emerald-400" />
                Quick Farmer Summary
              </h2>
              {farmerSummaryItems.length > 0 ? (
                <ul className="space-y-3">
                  {farmerSummaryItems.map((item, index) => (
                    <li key={index} className="flex gap-3 text-zinc-200 leading-relaxed">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-300 leading-relaxed">
                  Review the diagnosis below, act on the immediate treatment protocol, and monitor
                  nearby plants daily for any signs of spread.
                </p>
              )}
            </motion.div>
            
            {/* Explanation */}
            <motion.div id="overview" variants={itemVariants} className="scroll-mt-28 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-400" />
                Diagnostic Overview
              </h2>
              <p className="text-zinc-300 leading-relaxed text-lg whitespace-pre-line">
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
                Immediate Treatment Protocol
              </h2>
              <div className="space-y-4 relative z-10 text-zinc-300 leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                {data.recommendation}
              </div>
            </motion.div>

            {/* Recommendations */}
            <motion.div id="prevention" variants={itemVariants} className="scroll-mt-28 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-400" />
                Long-Term Recommendations
              </h2>
              <div className="space-y-4 text-zinc-300 leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                {data.long_term_recommendations || "Maintain consistent field monitoring and optimize irrigation schedules to avoid compounding crop stress."}
              </div>
            </motion.div>

          </div>

        </motion.div>

        <section id="weather" className="mt-10 scroll-mt-28">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Weather Context
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">Field Microclimate</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Use the live weather advisory to validate spraying timing and disease pressure.
              </p>
            </div>
            <a href="#agrovets" className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300">
              Go to agrovets
            </a>
          </div>
          <WeatherWidget />
        </section>

        <section id="agrovets" className="mt-10 scroll-mt-28">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Treatment Marketplace
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">Nearby Agrovets After Scan</h2>
              <p className="mt-1 max-w-3xl text-sm text-zinc-500">
                The marketplace appears after diagnosis so stores can be ranked by the treatment
                needed for this scan. Store details and actions sit in a clean sidebar, while
                inventory chips use the full horizontal space for easier scanning.
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Treatment: {treatmentNeeded}
            </span>
          </div>
          <NearbyAgrovets treatmentNeeded={treatmentNeeded} />
        </section>
      </main>
    </div>
  )
}
