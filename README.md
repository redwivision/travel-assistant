# 🌍 Travel Concierge Engine — Premium PWA

![App Landing Hero](/Users/Learning/.gemini/antigravity/brain/025207df-db16-42a7-a571-d2bff2cf14fd/travel_concierge_hero_1778860445772.png)

### *Elite Intelligence for the Modern Ethiopian Traveler.*

The **Travel Concierge Engine** is a high-performance, mobile-first Progressive Web App (PWA) designed to provide instant, real-time intelligence for international travel. From deep-dive visa requirements to live weather and safety data, this is the essential digital companion for global citizens.

---

## 💎 Premium Features

- **🛡️ Visa Intelligence**: Instant, verified visa requirements for Ethiopian passport holders across 11+ global destinations.
- **🌤️ Multi-City Live Weather**: Real-time forecasts powered by OpenWeather API, with high/low aggregation and multi-city selection.
- **🚑 Safety & Risk Audit**: Real-time risk levels and travel advice synced from global security sources.
- **⚡ Power Standards**: Automatic identification of plug types and voltages for every destination.
- **🧳 Trip Expedition Tracker**: A minimal, app-like interface to track upcoming flights and travel notes.
- **📱 Native Mobile Experience**: Sticky bottom navigation, haptic feedback, safe-area support, and 1-click PWA installation.

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS + Premium Glassmorphism.
- **Backend**: Supabase (Auth, PostgreSQL, Row-Level Security).
- **Edge Runtime**: Supabase Edge Functions (Deno).
- **API integrations**: OpenWeather API (Weather), Resend (Email Automations).
- **Icons**: Lucide React.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for edge functions)

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/redwivision/travel-assistant.git
   cd travel-assistant
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file based on `.env.example`:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   OPENWEATHER_API_KEY=your_api_key
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

---

## 🔐 Security & Production Hardening

This application is hardened for production use:
- **AbortController Timeouts**: All API calls capped at 9-seconds to ensure responsiveness.
- **Dual-Layer Caching**: In-memory `useRef` + `localStorage` for seamless offline hydration.
- **Auth Guards**: Edge functions protected by JWT verification (`requireAuth`).
- **Data Integrity**: Profiles automatically synced via database triggers.

---

## 📖 Documentation

For a technical deep-dive into the codebase and architectural patterns, refer to the [Complete Walkthrough](file:///Users/Learning/.gemini/antigravity/brain/025207df-db16-42a7-a571-d2bff2cf14fd/walkthrough.md).

---

© 2026 Travel Concierge Engine. Built with excellence for the advanced traveler.
