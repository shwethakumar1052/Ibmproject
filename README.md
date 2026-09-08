# 🏛️ GovMatch AI — Smart Government Scheme Recommendation System

> **Powered by IBM watsonx.ai · IBM SkillsBuild**
> An end-to-end AI-driven platform that helps Indian citizens discover, check eligibility for, and apply to central and state government welfare schemes — in their own language.

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Live Demo](#-live-demo)
3. [Architecture](#-architecture)
4. [Features](#-features)
5. [Tech Stack](#-tech-stack)
6. [Dataset](#-dataset)
7. [Quick Start](#-quick-start)
8. [Environment Variables](#-environment-variables)
9. [API Reference](#-api-reference)
10. [Multilingual Support](#-multilingual-support)
11. [AI Pipeline](#-ai-pipeline)
12. [Screenshots](#-screenshots)
13. [Team](#-team)

---

## 🎯 Project Overview

**GovMatch AI** solves a critical problem: India has **4,000+ government welfare schemes** but most eligible citizens — farmers, students, women, senior citizens, BPL families — never claim their benefits due to:

- 🔴 Language barriers (most portals are English-only)
- 🔴 Complex bureaucratic eligibility language
- 🔴 Lack of awareness about scheme existence
- 🔴 Confusing, multi-step application processes

GovMatch AI addresses all of these with:

- ✅ **AI-powered eligibility matching** across 4,430 real schemes
- ✅ **RAG chatbot** that answers in plain language
- ✅ **6 regional languages** with voice input/output
- ✅ **Step-by-step application guidance** with document checklists
- ✅ **PDF eligibility reports** citizens can carry to CSC centres

---

## 🚀 Live Demo

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5001 |
| Python NLP | http://localhost:5002 |
| Admin Portal | http://localhost:3000/admin |

**Admin credentials:** `admin / govmatch2024`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CITIZEN BROWSER                         │
│   React 18 + Vite (port 3000)                              │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│   │  Home    │ │Eligibility│ │ Results  │ │  ChatBot    │  │
│   │  Search  │ │ Wizard   │ │ + PDF    │ │  (RAG+LLM)  │  │
│   └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST + WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               EXPRESS BACKEND (port 5001)                   │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ Recommendation  │    │      RAG Chat Engine          │   │
│  │    Pipeline     │    │  Intent → Retrieval → LLM    │   │
│  │ ┌─────────────┐ │    │  (OpenRouter / Fallback)     │   │
│  │ │Eligibility  │ │    └──────────────────────────────┘   │
│  │ │Compatibility│ │                                        │
│  │ │Intent       │ │    ┌──────────────────────────────┐   │
│  │ │Explainability│ │    │   Notification Service       │   │
│  │ │Diversity    │ │    │   WebSocket + JSON Store     │   │
│  │ └─────────────┘ │    └──────────────────────────────┘   │
│  └─────────────────┘                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (semantic search)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           PYTHON NLP SERVICE (port 5002)                    │
│   Flask + SentenceTransformer (all-MiniLM-L6-v2)           │
│   spaCy en_core_web_sm + cosine similarity                  │
│   embeddings_cache.npy (384-dim vectors, 4430 schemes)      │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│   schemes_enhanced.json  (4,430 schemes, 24 fields)        │
│   schemes.json           (4,430 schemes, 12 fields)        │
│   notifications.json     (persistent notification store)    │
│   admin_overrides.json   (boost/hide slugs)                │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔍 Scheme Discovery
- Instant keyword search across 4,430 government schemes
- Sidebar filters: Category, State, Level (Central/State)
- Grid / List view toggle
- Pagination with scheme count

### 🎯 AI Eligibility Assessment
- **8-step wizard**: Age → State → Income → Education → Occupation → Caste → Gender → Special Status
- Live match counter sidebar (debounced API call per step)
- Multi-engine scoring:
  - **Demographic Engine** (40%) — age, income, gender, caste
  - **Semantic Engine** (35%) — NLP similarity via Python microservice
  - **Intent Engine** (15%) — occupation/context alignment
  - **Govt Priority** (10%) — flagship/boost overrides

### 🤖 RAG AI Chatbot (Bob)
- **Powered by IBM watsonx.ai**
- 17-intent classifier with mixed-language detection
- Retrieval-Augmented Generation from 4,430 scheme corpus
- Profile extraction from natural conversation
- Conversational bypass for greetings (no LLM cost)
- Voice input (STT) + per-message TTS
- Inline scheme cards with expand/apply buttons

### 📊 XAI Explainability
- "Why Recommended" reasons per scheme
- Confidence labels: High Match / Good Match / Partial Match
- Missing eligibility criteria shown clearly
- Side-by-side scheme comparison (up to 3)

### 📄 PDF Report Generation
- **Eligibility Report**: 6-section A4 PDF per scheme
- **Bulk Report**: All recommendations in one document
- Sections: Overview → Profile → Compatibility → Checklist → Benefits → Apply Guide
- Automatic currency formatting (Rs. X,XX,XXX)

### 🌐 Multilingual + Voice
- UI translated in 6 languages: English, Hindi, Kannada, Tamil, Telugu, Marathi
- Language-aware Speech-to-Text (Web Speech API)
- Text-to-Speech on SchemeDetails "Listen" button
- Mixed-language input detection (Hinglish, Kanglish, Tanglish, Tenglish)

### 🔔 Live Notifications
- WebSocket server on `/ws/notifications`
- Persistent JSON store (100 notifications)
- Types: NEW_SCHEME, ELIGIBILITY_UPDATED, APPLICATION_DEADLINE, SCHEME_UPDATED
- Filter tabs: All / New Schemes / Updates / Deadlines
- 6-second countdown toast with "View Scheme" action

### 🛡️ Admin Portal (`/admin`)
- Scheme CRUD editor
- Boost / Hide overrides per slug
- Drag-and-drop CSV upload
- Analytics dashboard (category breakdown, state heatmap)
- Audit log viewer
- Hot-reload dataset without restart

### 📈 Impact Dashboard (`/impact`)
- Live scheme count with animated counters
- Category donut chart
- Top states bar chart
- Clickable category cards → filtered search

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Animations** | Framer Motion |
| **i18n** | react-i18next |
| **Charts** | Custom SVG + CSS |
| **PDF** | jsPDF + jspdf-autotable |
| **Icons** | Lucide React |
| **Backend** | Node.js, Express.js |
| **Real-time** | WebSocket (ws library) |
| **Scheduler** | node-cron |
| **Translation** | Google Translate API X |
| **NLP Service** | Python, Flask, spaCy, SentenceTransformers |
| **LLM** | OpenRouter API (IBM watsonx.ai compatible) |
| **Embeddings** | all-MiniLM-L6-v2 (384-dim, cached) |
| **Storage** | JSON files (schemes, notifications, overrides) |

---

## 📂 Project Structure

```
govmatch-ai/
├── package.json                    ← monorepo root (concurrently: 3 services)
├── government_schemes_dataset_4430.csv
│
├── backend/
│   ├── server.js                   ← Express API (port 5001)
│   ├── semantic_search.py          ← Flask NLP service (port 5002)
│   ├── import_dataset.py           ← CSV → JSON ingestion pipeline
│   ├── convert_dataset.py          ← External dataset converter
│   ├── schemes_enhanced.json       ← 4,430 schemes (24 fields each)
│   ├── schemes.json                ← 4,430 schemes (12 fields each)
│   ├── embeddings_cache.npy        ← Pre-computed 384-dim vectors
│   ├── admin_overrides.json        ← Boost/hide slugs
│   ├── .env.example                ← Environment variable template
│   ├── chat/
│   │   ├── chatIntentEngine.js     ← 17-intent classifier
│   │   ├── chatRecommendationEngine.js ← RAG retrieval
│   │   ├── chatProfileManager.js   ← Demographic signal extraction
│   │   └── chatResponseComposer.js ← LLM prompt builder + fallback
│   ├── notifications/
│   │   ├── notificationService.js  ← WebSocket server + store
│   │   ├── notificationRoutes.js   ← REST routes
│   │   └── notifications.json      ← Persistent store
│   └── recommendation/
│       ├── recommendationPipeline.js
│       ├── eligibilityEngine.js
│       ├── compatibilityEngine.js
│       ├── intentClassifier.js
│       ├── explainabilityEngine.js
│       └── diversityEngine.js
│
└── mp-frontend--main/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                 ← Router + auth state
        ├── main.jsx
        ├── index.css               ← Design tokens, glassmorphism
        ├── i18n/
        │   ├── index.js
        │   └── locales/            ← en, hi, kn, ta, te, mr
        ├── hooks/
        │   ├── useNotifications.js
        │   └── useRegionalSpeech.js
        ├── services/
        │   └── pdfService.js
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ChatBot.jsx
        │   ├── SchemeCard.jsx
        │   ├── NotificationBell.jsx
        │   └── NotificationToast.jsx
        └── pages/
            ├── Home.jsx
            ├── EligibilityQuestionnaire.jsx
            ├── Results.jsx
            ├── SchemeSearch.jsx
            ├── SchemeDetails.jsx
            ├── CompareSchemes.jsx
            ├── ImpactDashboard.jsx
            ├── Profile.jsx
            ├── SavedSchemes.jsx
            ├── RecommendationHistory.jsx
            └── Admin/
                ├── AdminLayout.jsx
                ├── Dashboard.jsx
                ├── ManageSchemes.jsx
                ├── UploadSchemes.jsx
                └── Analytics.jsx
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js v18+
- Python 3.8+
- npm v9+

### 1. Clone & Install

```bash
# Install all Node.js dependencies (root + backend + frontend)
npm install
cd backend && npm install && cd ..
cd mp-frontend--main && npm install && cd ..
```

### 2. Python NLP Setup

```bash
cd backend
pip install -r requirements.txt
python import_dataset.py        # Generates schemes_enhanced.json + schemes.json
```

### 3. Environment Variables

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your OPENROUTER_API_KEY
```

### 4. Run All Services

```bash
npm run dev
```

This starts all 3 services concurrently:
- 🌐 **Frontend** → http://localhost:3000
- ⚙️ **Backend API** → http://localhost:5001
- 🧠 **Python NLP** → http://localhost:5002

---

## 🐳 Docker Setup (One Command)

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Copy environment file
```bash
cp backend/.env.example backend/.env
# Add your OPENROUTER_API_KEY to backend/.env
```

### 2. Build and start all containers
```bash
docker compose up --build
```

This builds and starts 3 containers:

| Container | Image | Exposed Port |
|-----------|-------|-------------|
| `govmatch-frontend` | nginx + React build | **3000** |
| `govmatch-backend` | node:20-alpine | **5001** |
| `govmatch-nlp` | python:3.11-slim | **5002** |

Open **http://localhost:3000** — the full app is live. ✅

### Useful Docker commands

```bash
# Stop all containers
docker compose down

# Follow logs of a specific service
docker compose logs -f backend
docker compose logs -f nlp

# Rebuild only one service after a code change
docker compose up --build backend

# Open a shell inside the backend container
docker compose exec backend sh

# Hot-reload schemes without rebuild
docker compose exec backend wget -qO- http://localhost:5001/api/admin/reload
```

### Container startup order

```
nlp        ← starts first (60s warm-up for SentenceTransformers model load)
  └─ backend  ← waits for nlp to be healthy
       └─ frontend  ← waits for backend to be healthy
```

---

## 🔐 Environment Variables

Create `backend/.env` from the template:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5001` | Express server port |
| `OPENROUTER_API_KEY` | Yes (for LLM) | — | OpenRouter API key for watsonx.ai LLM calls |
| `PYTHON_NLP_URL` | No | `http://localhost:5002` | Python semantic search service URL |

> **Without `OPENROUTER_API_KEY`**: The chatbot falls back to the built-in response composer. All other features work fully.

---

## 📡 API Reference

### Schemes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schemes` | List schemes (supports `?search=`, `?category=`, `?state=`, `?page=`, `?limit=`) |
| `GET` | `/api/schemes/categories` | All unique categories |
| `GET` | `/api/schemes/states` | All unique states |
| `GET` | `/api/schemes/:id` | Single scheme by slug or ID |

### AI / Recommendations

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/recommend` | `{ profile, query, topN }` | Run full recommendation pipeline |
| `POST` | `/api/chat` | `{ message, profile, language, history }` | RAG chat with LLM |
| `POST` | `/api/translate` | `{ text, targetLang }` | Translate text via Google Translate |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | All notifications |
| `POST` | `/api/notifications/mark-read` | `{ id }` or `{ id: "all" }` |
| `POST` | `/api/notifications/clear` | Clear all |
| `POST` | `/api/notifications/test` | Trigger test notification |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/analytics` | Dashboard stats |
| `GET` | `/api/admin/audit` | Recommendation audit log |
| `POST` | `/api/admin/reload` | Hot-reload schemes from JSON |
| `GET/POST` | `/api/admin/overrides` | Boost/hide scheme slugs |

### WebSocket

Connect to `ws://localhost:3000/ws/notifications` (proxied via Vite in dev).

| Event (Server → Client) | Description |
|--------------------------|-------------|
| `INIT_NOTIFICATIONS` | Full history on connect |
| `NOTIFICATION` | New real-time notification |
| `NOTIFICATIONS_UPDATED` | After mark-read confirmation |

| Event (Client → Server) | Description |
|--------------------------|-------------|
| `MARK_READ` | `{ id }` or `{ id: "all" }` |

---

## 🌐 Multilingual Support

| Language | Code | Voice STT | Voice TTS | UI |
|----------|------|-----------|-----------|-----|
| English | `en` | ✅ en-IN | ✅ | ✅ |
| Hindi | `hi` | ✅ hi-IN | ✅ | ✅ |
| Kannada | `kn` | ✅ kn-IN | ✅ | ✅ |
| Tamil | `ta` | ✅ ta-IN | ✅ | ✅ |
| Telugu | `te` | ✅ te-IN | ✅ | ✅ |
| Marathi | `mr` | ✅ mr-IN | ⚠️ Browser dependent | ✅ |

> Voice features use the Web Speech API (Chrome recommended for best regional language support).

---

## 🤖 AI Pipeline

```
User Input (natural language / form)
        │
        ▼
┌─────────────────────────┐
│  Intent Classifier       │  17 intents, mixed-lang (Hinglish/Kanglish/etc.)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Profile Extractor       │  Age, gender, state, income, caste, occupation
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Semantic Search (RAG)   │  Python NLP → cosine similarity → top-K schemes
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Eligibility Engine      │  Hard demographic filter (age/income/gender/caste)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Compatibility Engine    │  40% Demo + 35% Semantic + 15% Intent + 10% Priority
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Diversity Engine        │  Max 2/dept, max 3/category caps
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Explainability Engine   │  Why recommended + missing criteria + confidence
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  LLM Response (IBM       │  OpenRouter → natural language answer
│  watsonx.ai compatible)  │  Fallback: built-in response composer
└─────────────────────────┘
```

---

## 📸 Screenshots

> The following pages are available in the running application:

| Page | URL |
|------|-----|
| Home | `/` |
| Eligibility Assessment | `/assess` |
| Results + XAI | `/results` |
| Scheme Search | `/search` |
| Scheme Details | `/scheme/:id` |
| Compare Schemes | `/compare` |
| Impact Dashboard | `/impact` |
| Admin Dashboard | `/admin` |

---

## 👥 Team

**Project**: NLP-Based Public Welfare Scheme Eligibility and Recommendation System

| Role | Name |
|------|------|
| Developer | Shwetha Kumar |

**Institution**: Powered by IBM SkillsBuild · IBM watsonx.ai

---

## 📜 License

This project was developed as part of the IBM SkillsBuild AI programme.
Dataset sourced from public government portals and MyScheme.gov.in.

---

*Made with ❤️ for Indian citizens — helping them access benefits they deserve.*
