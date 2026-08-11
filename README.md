<div align="center">
  <img src="./assets/images/icon.png" alt="No Signal App Logo" width="120" />

  # No Signal! 🎛️
  
  **The definitive mobile application for the New Orleans AV Industry, Riggers, and Production Crews.**

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](#)
</div>

<br/>

## 📱 About

**No Signal!** is a premium, high-performance mobile application designed specifically for audio-visual technicians and event production crews. It features a sleek, OLED-optimized true dark mode aesthetic with neon accents.

Built to handle the fast-paced environment of live events, this app serves as a centralized hub for:
- 📅 **Event Calendar Visualization**: Keep track of upcoming gigs, load-ins, and showtimes.
- 📇 **Crew Directory**: Instant access to contact information for techs, riggers, and stagehands.
- 💬 **Integrated Twilio SMS**: Seamless, automated text message dispatching directly from the app via Firebase Cloud Functions.

---

## ✨ Features

- **True OLED Dark Mode**: A stunning, glassmorphism-inspired UI designed to look beautiful (and save battery) in dark backstage environments.
- **Real-Time Data**: Powered by Google Firebase Firestore for instant synchronization across all devices.
- **Cross-Platform**: Compiles natively to iOS, Android, and Web via Expo.
- **Secure Architecture**: Serverless 2nd Gen Cloud Functions handle sensitive Twilio API transactions.

---

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo Router, React Navigation
- **Backend**: Firebase Firestore, Firebase Authentication
- **Serverless Functions**: Node.js 24 (2nd Gen Cloud Functions)
- **Integrations**: Twilio SMS API

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- Expo CLI
- Firebase CLI (for deploying Cloud Functions)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory for your Expo config, and a separate `.env` inside the `no-signal-sms` folder for the Cloud Function Twilio credentials.

### 3. Start the Development Server
```bash
npx expo start
```
This will open the Expo developer menu. You can press `i` to open the iOS simulator, `a` for Android, or scan the QR code with the Expo Go app on your physical device.

### 4. Deploying Cloud Functions (SMS)
```bash
firebase deploy --only functions:no-signal-sms
```

---

<div align="center">
  <p>Built with ❤️ for the NOLA production community.</p>
</div>
