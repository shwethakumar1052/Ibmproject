# Technology Used – IBM Bob

> **Project:** GovMatch AI — Smart Government Scheme Recommendation System
> **Platform:** IBM SkillsBuild Hackathon Submission

---

## Overview

IBM Bob served as the primary AI development assistant throughout the entire lifecycle of GovMatch AI — from initial architecture design to final bug fixing and deployment. Every major component of the system was built, debugged, and refined through active collaboration with Bob in Agent mode.

---

## 1. System Architecture & Planning

The project architecture — a three-service stack with a React + Vite frontend (port 3000), Node.js Express backend (port 5001), and a Python Flask NLP service (port 5002) — was designed with Bob's guidance. Bob helped plan the monorepo structure, the `concurrently`-based dev workflow, and the Docker Compose orchestration for all three services.

Bob also helped define the full data pipeline: how 4,430 raw government scheme records flow through eligibility filtering, semantic scoring, diversity capping, and explainability layers before reaching the citizen.

---

## 2. Recommendation Engine (v5.1 Pipeline)

The core AI pipeline was built entirely with Bob. Five interconnected modules were created or upgraded:

- **`profileCompletenessEngine.js`** — computes a 0–100% profile completeness score and detects cold-start users
- **`eligibilityEngine.js`** — upgraded with disability, widow, and BPL card checks that were previously silently ignored
- **`compatibilityEngine.js`** — adaptive domain weights (e.g. 65% eligibility weight for scholarships, 85% for pensions), education cross-match matrix, semantic floor at 0.70
- **`explainabilityEngine.js`** — star ratings (★★★★★), machine reason codes (STATE_MATCH, INCOME_FIT etc.), and markdown summary paragraphs
- **`intentClassifier.js`** — 9-intent classifier with regional keyword support (gramin, rozgar, shramik) and automatic profile-based intent boosting

Bob also identified and fixed a critical diversity-capping bug that caused only 2 schemes to appear for most users, raising caps from 2→5 per department and 3→8 per category.

---

## 3. RAG Chatbot Development

The AI chatbot was built with Bob across multiple sessions. Key contributions included:

- Designing the full RAG pipeline: intent classification → semantic retrieval → LLM prompt construction → grounded response
- Writing the 17-intent classifier with mixed-language (Hinglish, Kanglish, Tanglish, Tenglish) normalization
- Building the LLM system prompt with anti-hallucination rules, follow-up context resolution, and structured scheme response format
- Integrating OpenRouter (Google Gemini Flash 1.5) with graceful fallback to rule-based responses when the LLM is unavailable
- Adding the **AI Powered / Fallback** badge in the chat header to indicate live LLM status

---

## 4. Frontend Features

Bob built and debugged the following frontend components:

| Component | What Bob Built |
|-----------|---------------|
| **EligibilityQuestionnaire** | Live match counter using `coverageFunnel`, real-time storage event listener for chat-to-form profile sync |
| **ChatBot.jsx** | Markdown renderer, inline scheme cards, per-message TTS, voice wave equalizer, profile chip auto-fill |
| **PDF Export** | Fixed `rowStyles` crash, adaptive score weights, star ratings, IBM branding, reason codes |
| **Notifications** | 3-state WebSocket indicator (connecting / live / polling) with exponential backoff reconnect |
| **Navbar & Auth** | Glassmorphism design, solid dropdown backgrounds, 3-mode AuthModal with scroll lock |

---

## 5. Bug Detection & Fixing

Bob conducted systematic bug audits across the full codebase. In the chatbot alone, 7 bugs were identified and fixed without touching any unrelated functionality:

1. AI mode badge persisting after chat clear
2. Greeting responses incorrectly triggering the "Fallback" badge
3. Stale closure bug in `sendMessage` causing dropped input on rapid typing
4. First-line bullet points not rendering in `<ul>` due to regex anchoring
5. TTS speaking raw markdown headings (`###SchemeName`) aloud
6. `reply: undefined` being stored in conversation history
7. Error path skipping history push, breaking multi-turn follow-up context

---

## 6. Testing, Docker & Deployment

- **Jest test suite** — 55 tests across 10 suites covering eligibility parsing, compatibility scoring, explainability, completeness engine, and RAG utilities. All 55 tests pass consistently.
- **Docker** — created all three `Dockerfile`s and `docker-compose.yml` for containerized deployment of all three services
- **Vite proxy** — configured seamless frontend-to-backend communication via `/api` and `/ws` proxy rules
- **ngrok** — assisted with public tunnel configuration and `allowedHosts` Vite fix for live demo access during evaluation

---

## Summary

> IBM Bob was not just a code generator — it acted as a senior full-stack engineer, architect, and QA reviewer throughout the project. Every feature was grounded in the actual codebase: Bob read files before editing, traced bugs to their root cause, and applied the minimal fix needed without breaking surrounding functionality. The result is a production-ready, fully tested, publicly accessible platform that genuinely helps Indian citizens discover the government benefits they deserve.

---

*Word count: ~680 words*
