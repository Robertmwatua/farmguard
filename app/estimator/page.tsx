'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Globe, 
  Sun, 
  Moon, 
  Calculator, 
  Scale, 
  Coins, 
  MapPin, 
  Percent, 
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react'
import { translations } from '@/lib/translations'

interface CropPreset {
  name: string
  nameSw: string
  rowSpacing: number // in meters
  plantSpacing: number // in meters
  seedPerHole: number
  fertilizerPlantingPerAcre: number // in kg (DAP)
  fertilizerTopdressingPerAcre: number // in kg (CAN)
  seedWeightPerThousand: number // in grams
}

const cropPresets: Record<string, CropPreset> = {
  maize: {
    name: 'Maize / Corn',
    nameSw: 'Mahindi',
    rowSpacing: 0.75,
    plantSpacing: 0.25,
    seedPerHole: 1,
    fertilizerPlantingPerAcre: 50, // 50kg DAP
    fertilizerTopdressingPerAcre: 50, // 50kg CAN
    seedWeightPerThousand: 350
  },
  tomatoes: {
    name: 'Tomatoes',
    nameSw: 'Nyanya',
    rowSpacing: 0.60,
    plantSpacing: 0.45,
    seedPerHole: 1,
    fertilizerPlantingPerAcre: 40,
    fertilizerTopdressingPerAcre: 60,
    seedWeightPerThousand: 3.5
  },
  cabbage: {
    name: 'Cabbage',
    nameSw: 'Kabeji',
    rowSpacing: 0.60,
    plantSpacing: 0.60,
    seedPerHole: 1,
    fertilizerPlantingPerAcre: 40,
    fertilizerTopdressingPerAcre: 50,
    seedWeightPerThousand: 4.2
  },
  potatoes: {
    name: 'Irish Potatoes',
    nameSw: 'Viazi Mviringo',
    rowSpacing: 0.75,
    plantSpacing: 0.30,
    seedPerHole: 1,
    fertilizerPlantingPerAcre: 80, // Seed tubers
    fertilizerTopdressingPerAcre: 40,
    seedWeightPerThousand: 45000 // Tuber weight
  },
  coffee: {
    name: 'Coffee (Arabica)',
    nameSw: 'Kahawa',
    rowSpacing: 2.70,
    plantSpacing: 2.70,
    seedPerHole: 1,
    fertilizerPlantingPerAcre: 100, // Organic compost focus
    fertilizerTopdressingPerAcre: 80,
    seedWeightPerThousand: 180
  }
}

export default function EstimatorPage() {
  const [lang, setLang] = useState<'en' | 'sw'>('en')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Calculator states
  const [landSize, setLandSize] = useState<number>(1) // default 1 unit
  const [landUnit, setLandUnit] = useState<'acre' | 'hectare' | 'sqm'>('acre')
  const [selectedCrop, setSelectedCrop] = useState<string>('maize')

  // Custom adjustments states
  const [customRowSpacing, setCustomRowSpacing] = useState<number>(0.75)
  const [customPlantSpacing, setCustomPlantSpacing] = useState<number>(0.25)
  const [isCustomSpacing, setIsCustomSpacing] = useState<boolean>(false)

  // Initialize theme, lang
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'sw'
    if (savedLang) setLang(savedLang)

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light'
    const finalTheme = savedTheme || 'dark'
    setTheme(finalTheme)
    document.documentElement.classList.toggle('light', finalTheme === 'light')
  }, [])

  // Sync custom spacing when preset crop changes
  useEffect(() => {
    if (!isCustomSpacing) {
      const preset = cropPresets[selectedCrop]
      if (preset) {
        setCustomRowSpacing(preset.rowSpacing)
        setCustomPlantSpacing(preset.plantSpacing)
      }
    }
  }, [selectedCrop, isCustomSpacing])

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

  // Math Conversion Constants
  // 1 Acre = 4046.86 sqm
  // 1 Hectare = 10000 sqm
  const getAreaInSqm = () => {
    if (landUnit === 'acre') return landSize * 4046.86
    if (landUnit === 'hectare') return landSize * 10000
    return landSize
  }

  const getAreaInAcres = () => {
    if (landUnit === 'acre') return landSize
    if (landUnit === 'hectare') return landSize * 2.47105
    return landSize / 4046.86
  }

  // Calculations
  const areaSqm = getAreaInSqm()
  const areaAcres = getAreaInAcres()
  const activeCrop = cropPresets[selectedCrop]

  const rowSp = isCustomSpacing ? customRowSpacing : activeCrop.rowSpacing
  const plantSp = isCustomSpacing ? customPlantSpacing : activeCrop.plantSpacing

  // Plant population = Area / (row * plant spacing)
  const plantPopulation = Math.round(areaSqm / (rowSp * plantSp))

  // Seed volume calculations
  const totalSeedsNeeded = plantPopulation * activeCrop.seedPerHole
  const seedWeightKg = Number(((totalSeedsNeeded * activeCrop.seedWeightPerThousand) / 1000000).toFixed(2))

  // Fertilizer volume
  const dapFertilizerNeeded = Math.round(areaAcres * activeCrop.fertilizerPlantingPerAcre)
  const canFertilizerNeeded = Math.round(areaAcres * activeCrop.fertilizerTopdressingPerAcre)

  // Agrovet Price Comparison Data Presets
  const getAgrovetPrices = () => {
    switch (selectedCrop) {
      case 'tomatoes':
        return [
          { name: 'Nakuru Town Central Agrovet', seedPrice: 4200, fertilizerPrice: 6200, location: 'Nakuru Town' },
          { name: 'Lanet Farmers Partner Store', seedPrice: 4100, fertilizerPrice: 6050, location: 'Lanet Market' },
          { name: 'Naivasha Agricultural Hub', seedPrice: 4300, fertilizerPrice: 6300, location: 'Naivasha City' },
          { name: 'FarmGuard Direct Depot (cheapest)', seedPrice: 3850, fertilizerPrice: 5700, location: 'Barut / Online', best: true }
        ]
      case 'cabbage':
        return [
          { name: 'Nakuru Town Central Agrovet', seedPrice: 2800, fertilizerPrice: 6200, location: 'Nakuru Town' },
          { name: 'Lanet Farmers Partner Store', seedPrice: 2750, fertilizerPrice: 6050, location: 'Lanet Market' },
          { name: 'Naivasha Agricultural Hub', seedPrice: 2900, fertilizerPrice: 6300, location: 'Naivasha City' },
          { name: 'FarmGuard Direct Depot (cheapest)', seedPrice: 2500, fertilizerPrice: 5700, location: 'Barut / Online', best: true }
        ]
      default: // maize / general
        return [
          { name: 'Nakuru Town Central Agrovet', seedPrice: 1100, fertilizerPrice: 6200, location: 'Nakuru Town' },
          { name: 'Lanet Farmers Partner Store', seedPrice: 1050, fertilizerPrice: 6050, location: 'Lanet Market' },
          { name: 'Naivasha Agricultural Hub', seedPrice: 1150, fertilizerPrice: 6300, location: 'Naivasha City' },
          { name: 'FarmGuard Direct Depot (cheapest)', seedPrice: 950, fertilizerPrice: 5700, location: 'Barut / Online', best: true }
        ]
    }
  }

  const agrovetList = getAgrovetPrices()

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
                <Calculator className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">
                {lang === 'en' ? 'Spacing Estimator & Agrovet Prices' : 'Kikokotoo cha Nafasi na Bei za Pembejeo'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch overflow-hidden">
        
        {/* Left Side: Estimator Input Controls & Math Outputs */}
        <section className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-6 space-y-6 flex flex-col justify-between shadow-2xl relative">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
          
          <div>
            <h2 className="text-xl font-black text-white border-b border-zinc-850 pb-3 mb-6">
              {lang === 'en' ? 'Field Spacing & Population Planner' : 'Kipanga-Nafasi na Idadi ya Mimea'}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Land size details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2">
                    {lang === 'en' ? 'Select Target Crop' : 'Chagua Aina ya Zao'}
                  </label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3 text-xs focus:outline-none focus:border-emerald-500/40"
                  >
                    {Object.keys(cropPresets).map((key) => (
                      <option key={key} value={key}>
                        {lang === 'en' ? cropPresets[key].name : cropPresets[key].nameSw}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      {lang === 'en' ? 'Land Area' : 'Ukubwa wa Shamba'}
                    </label>
                    <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 text-[10px] font-bold">
                      {['acre', 'hectare', 'sqm'].map((u) => (
                        <button
                          key={u}
                          onClick={() => setLandUnit(u as any)}
                          className={`px-2 py-1 rounded-md transition-all ${
                            landUnit === u ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'text-zinc-500'
                          }`}
                        >
                          {u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={landSize}
                      onChange={(e) => setLandSize(Math.max(0.1, Number(e.target.value)))}
                      className="w-20 bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 px-3 text-xs text-center focus:outline-none focus:border-emerald-500/40 font-bold"
                    />
                    <input 
                      type="range"
                      min={0.1}
                      max={landUnit === 'sqm' ? 10000 : 50}
                      step={landUnit === 'sqm' ? 100 : 0.5}
                      value={landSize}
                      onChange={(e) => setLandSize(Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom spacing configurations */}
              <div className="space-y-4 bg-zinc-950/30 border border-zinc-850 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-550">
                    {lang === 'en' ? 'Customize Plant Spacing' : 'Badilisha Vipimo vya Spacing'}
                  </label>
                  <input 
                    type="checkbox"
                    checked={isCustomSpacing}
                    onChange={(e) => setIsCustomSpacing(e.target.checked)}
                    className="accent-emerald-500 h-4 w-4"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase font-semibold text-zinc-500 mb-1">
                      {lang === 'en' ? 'Row spacing (meters)' : 'Mstari hadi Mstari (m)'}
                    </label>
                    <input 
                      type="number"
                      step={0.05}
                      min={0.1}
                      disabled={!isCustomSpacing}
                      value={rowSp}
                      onChange={(e) => setCustomRowSpacing(Number(e.target.value))}
                      className="w-full bg-zinc-950 disabled:opacity-50 border border-zinc-800 text-white rounded-xl py-2 px-3 text-center focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-semibold text-zinc-500 mb-1">
                      {lang === 'en' ? 'Plant spacing (meters)' : 'Mmea hadi Mmea (m)'}
                    </label>
                    <input 
                      type="number"
                      step={0.05}
                      min={0.05}
                      disabled={!isCustomSpacing}
                      value={plantSp}
                      onChange={(e) => setCustomPlantSpacing(Number(e.target.value))}
                      className="w-full bg-zinc-950 disabled:opacity-50 border border-zinc-800 text-white rounded-xl py-2 px-3 text-center focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 flex items-start gap-1.5 mt-2">
                  <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {lang === 'en' 
                      ? `Calculations are automatically modeled based on ${rowSp * 100}cm x ${plantSp * 100}cm blueprint configurations.`
                      : `Vipimo vya kikokotoo vinaratibiwa kwa nafasi ya sentimita ${rowSp * 100} kwa sentimita ${plantSp * 100}.`}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Precision outputs widgets grid */}
          <div className="grid sm:grid-cols-3 gap-5">
            
            <div className="bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl relative overflow-hidden">
              <Scale className="absolute -bottom-4 -right-4 w-16 h-16 text-emerald-500/5" />
              <span className="block text-[9px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                {lang === 'en' ? 'Total Population' : 'Idadi ya Mimea'}
              </span>
              <span className="block font-black text-2xl text-emerald-400 leading-tight">
                {plantPopulation.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-550 block mt-1">
                {lang === 'en' ? 'Individual plant stands' : 'Jumla ya miche shambani'}
              </span>
            </div>

            <div className="bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl relative overflow-hidden">
              <Scale className="absolute -bottom-4 -right-4 w-16 h-16 text-blue-500/5" />
              <span className="block text-[9px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                {lang === 'en' ? 'Estimated Seed Volume' : 'Kiasi cha Mbegu'}
              </span>
              <span className="block font-black text-2xl text-blue-400 leading-tight">
                {selectedCrop === 'potatoes' ? `${(plantPopulation).toLocaleString()} tubers` : `${seedWeightKg} kg`}
              </span>
              <span className="text-[10px] text-zinc-550 block mt-1">
                {lang === 'en' ? 'Total planting seeds required' : 'Kiasi kamili cha mbegu'}
              </span>
            </div>

            <div className="bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl relative overflow-hidden">
              <Scale className="absolute -bottom-4 -right-4 w-16 h-16 text-amber-500/5" />
              <span className="block text-[9px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                {lang === 'en' ? 'Recommended Fertilizer' : 'Kiasi cha Mbolea'}
              </span>
              <div className="space-y-0.5 leading-tight">
                <span className="block font-black text-[13px] text-amber-400">
                  DAP (Planting): {dapFertilizerNeeded} kg
                </span>
                <span className="block font-black text-[13px] text-zinc-400">
                  CAN (Dressing): {canFertilizerNeeded} kg
                </span>
              </div>
              <span className="text-[10px] text-zinc-550 block mt-1">
                {lang === 'en' ? 'Based on optimal mineral replenishment' : 'Mbolea inayofaa kwa kirutubisho'}
              </span>
            </div>

          </div>

        </section>

        {/* Right Side: Agrovet Local Outlets Price Comparison (Feature 9) */}
        <aside className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-850 pb-3 mb-5">
              <Coins className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  {lang === 'en' ? 'Outlets Price Compare' : 'Ulinganisho wa Bei za Maduka'}
                </h3>
                <p className="text-[8px] text-zinc-550 uppercase tracking-widest font-black mt-0.5">Nakuru County Physical Outlets</p>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* Product title header */}
              <div className="bg-zinc-950/50 p-3.5 rounded-2xl text-xs space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-550 block">
                  {lang === 'en' ? 'Comparing Supplies for:' : 'Kulinganisha pembejeo za:'}
                </span>
                <span className="font-bold text-white">
                  {lang === 'en' ? activeCrop.name : activeCrop.nameSw} Presets
                </span>
              </div>

              {/* Outlet pricing list */}
              <div className="space-y-3">
                {agrovetList.map((shop, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border text-xs relative overflow-hidden transition-all ${
                      shop.best 
                        ? 'border-emerald-500/30 bg-emerald-500/5 shadow-md shadow-emerald-950/10' 
                        : 'border-zinc-850/60 bg-zinc-950/20'
                    }`}
                  >
                    {shop.best && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[7px] uppercase font-black bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">
                        <TrendingDown className="w-2.5 h-2.5 shrink-0" />
                        {lang === 'en' ? 'Cheapest Deal' : 'Bei Rahisi Zaidi'}
                      </span>
                    )}

                    <h4 className="font-extrabold text-white leading-snug pr-16">{shop.name}</h4>
                    
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{shop.location}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-zinc-850/60 text-xs">
                      <div>
                        <span className="text-[9px] text-zinc-550 block uppercase">
                          {selectedCrop === 'tomatoes' ? (lang === 'en' ? 'Seed (100g)' : 'Mbegu (100g)') : (lang === 'en' ? 'Maize Seed (2kg)' : 'Mbegu ya Mahindi (2kg)')}
                        </span>
                        <span className="font-black text-white text-sm">KES {shop.seedPrice.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-550 block uppercase">
                          {lang === 'en' ? 'DAP Fertilizer (50kg)' : 'Mbolea ya DAP (50kg)'}
                        </span>
                        <span className="font-black text-white text-sm">KES {shop.fertilizerPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Call to action */}
          <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850/50 mt-5 flex items-center justify-between text-xs gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-white block">{lang === 'en' ? 'FarmGuard Direct Depot' : 'Duka Kuu la FarmGuard'}</span>
              <span className="text-[9.5px] text-zinc-500">{lang === 'en' ? 'Premium wholesale agricultural inputs.' : 'Pembejeo bora kabisa za kilimo.'}</span>
            </div>
            <Link href="/marketplace" className="p-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition-all font-bold">
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </aside>

      </main>

    </div>
  )
}
