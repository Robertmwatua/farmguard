'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, ShieldCheck, Loader2, Sparkles } from 'lucide-react';

export default function PWANotificationManager({ lang }: { lang: 'en' | 'sw' }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [testActive, setTestActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        // Trigger a gorgeous welcome notification
        new Notification('FarmGuard AI', {
          body: lang === 'en' 
            ? 'Notification Shield Active! We will alert you of upcoming scouting times, watering schedules, and weather threats.' 
            : 'Arifa Zimeanzishwa! Tutakujulisha kuhusu muda wa kuchunguza mimea, kumwagilia maji, na hatari za hewa.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200]
        } as any);
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
    }
  };

  const triggerTestNotification = () => {
    if (permission !== 'granted') return;
    setTestActive(true);
    
    // Schedule a test alert in 5 seconds
    setTimeout(() => {
      new Notification(lang === 'en' ? '🌱 Crop Scouting Checkpoint' : '🌱 Ukaguzi wa Mazao Shambani', {
        body: lang === 'en'
          ? 'Nakuru Intelligence Alert: It is time to scout your Maize field for Maize Streak virus symptoms!'
          : 'Taarifa ya Nakuru: Ni wakati wa kukagua shamba lako la Mahindi dhidi ya ugonjwa wa milia ya mahindi!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        tag: 'scouting-alert'
      } as any);
      setTestActive(false);
    }, 5000);
  };

  if (!supported) return null;

  return (
    <div className="bg-zinc-900/50 border border-zinc-850 rounded-3xl p-6 relative overflow-hidden shadow-xl">
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-start gap-3.5">
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
            permission === 'granted'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
          }`}>
            {permission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <span>{lang === 'en' ? 'Crop Care Alerts' : 'Arifa za Ukulima'}</span>
              {permission === 'granted' && (
                <span className="flex items-center gap-0.5 text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Active
                </span>
              )}
            </h3>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
              {permission === 'granted'
                ? (lang === 'en' 
                    ? 'Receive push reminders for watering, fertilization, and sudden weather warnings.'
                    : 'Pokea vikumbusho vya kumwagilia maji, kuweka mbolea, na tahadhari za hali ya hewa.')
                : (lang === 'en'
                    ? 'Enable browser push notifications to get live crop scouting and weather alerts.'
                    : 'Wezesha arifa za kivinjari ili kupata ujumbe wa kuchunguza mazao na hali ya hewa shambani.')}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex gap-2 sm:self-center">
          {permission !== 'granted' ? (
            <button
              onClick={requestPermission}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Enable Notifications' : 'Wezesha Arifa'}
            </button>
          ) : (
            <button
              onClick={triggerTestNotification}
              disabled={testActive}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-755 disabled:bg-zinc-900 border border-zinc-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2"
            >
              {testActive ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{lang === 'en' ? 'Triggering in 5s...' : 'Inapiga baada ya sekunde 5...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'en' ? 'Test 5s Alert' : 'Piga Arifa ya Jaribio'}</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
