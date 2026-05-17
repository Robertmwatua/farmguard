# 📱 FarmGuard AI — Android App & PWA Packaging Guide

Welcome, **r0b3rt0**! This guide will walk you through launching **FarmGuard AI** as both a **Progressive Web App (PWA)** and a native **Android App** inside Android Studio!

We have already configured your entire project to support both out-of-the-box!

---

## ⚡ Part 1: Your Brand-New Progressive Web App (PWA)
We have fully integrated PWA capability directly into your Next.js application! 

### What is active now:
* 🎨 **Spectacular Mobile Icon:** Created a state-of-the-art leaf-shield logo asset inside `/public/icon-192.png`, `/public/icon-512.png`, and `/public/apple-icon.png` to represent FarmGuard on your phone's home screen!
* 📄 **Native Manifest:** Built `/app/manifest.ts` configuring standalone launch views and modern green theme colors.
* ⚙️ **Service Worker:** Programmed `/public/sw.js` and `/components/PWARegister.tsx` to boot cache caches, boosting load times and enabling offline access for farmers!

### How to test your PWA:
1. Open your Kali Linux terminal and start the server: `npm run dev`.
2. Open **Google Chrome** on your phone (or a laptop) and navigate to your deployed website URL (or your network dev address `http://192.168.1.178:3000`).
3. Click the **three dots menu** in Chrome, and tap **"Install App"** (or **"Add to Home Screen"**)!
4. **Boom!** FarmGuard AI is now an independent application in your phone's app drawer!

---

## 🛠️ Part 2: Compiling your Native Android App (Android Studio)
When you are ready to reinstall Android Studio on your **Windows laptop**, here is your quick packaging checklist:

### 1️⃣ Step 1: Clone and Install
Open the terminal inside your Windows laptop project folder:
```bash
# 1. Pull the latest PWA and Capacitor configurations from GitHub
git pull origin main

# 2. Install all dependencies on Windows
npm install --legacy-peer-deps

# 3. Install Capacitor Android Platform wrapper
npm install @capacitor/android --legacy-peer-deps
```

### 2️⃣ Step 2: Initialize your Android Studio Project
Generate the official native `android/` Gradle project:
```bash
# Create a dummy folder so Capacitor is happy during initial sync
mkdir out

# Add the native Android platform folder
npx cap add android
```

---

### 3️⃣ Step 3: Enable "Live Server" for Real-Time Mobile Testing
To test and edit your code in real-time, open **`capacitor.config.json`** on your Windows laptop and add the `"server"` local IP property pointing to your Kali Linux IP address:

```json
{
  "appId": "com.farmguard.app",
  "appName": "FarmGuard AI",
  "webDir": "out",
  "server": {
    "url": "http://192.168.1.178:3000",
    "cleartext": true
  }
}
```
Synchronize the new configurations:
```bash
npx cap sync
```

---

### 4️⃣ Step 4: Open and Compile in Android Studio
1. Launch **Android Studio** on your Windows laptop.
2. Select **"Open"** and choose the **`android/`** folder.
3. Wait for the initial Gradle sync to complete.
4. Plug your phone into Windows, select your **phone name** from the toolbar dropdown, and click the green **Run `▶`** button!

Your physical phone will now run **FarmGuard AI** as a fully functional native mobile app, loading real-time edits instantly from your Kali dev server!
