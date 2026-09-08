/**
 * GovMatch AI — Advanced RAG Citizen Assistant (Phase 10)
 * Features:
 *  • Markdown rendering (bold, bullets, inline links)
 *  • Embedded interactive Scheme Cards in the chat stream
 *  • "Update Profile" action chip when demographic signals are detected
 *  • Animated voice-wave equaliser on mic button while listening
 *  • Per-message TTS speaker button
 *  • Regional speech via useRegionalSpeech hook
 *  • Framer Motion entry animations
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Mic, MicOff, Volume2, VolumeX,
  Bot, User, Loader2, RefreshCw, ExternalLink, ChevronRight,
  Sparkles, UserCheck
} from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import useRegionalSpeech from "../hooks/useRegionalSpeech";

// ── Markdown renderer (no external deps) ─────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const elements = [];

  lines.forEach((line, idx) => {
    // Bullet line: starts with "- ", "– ", "* ", "• "
    const bulletMatch = line.match(/^[\-–*•]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <li key={idx} className="flex gap-2 items-start ml-1">
          <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>•</span>
          <span>{inlineMarkdown(bulletMatch[1])}</span>
        </li>
      );
      return;
    }
    // Numbered line: "1. text"
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(
        <li key={idx} className="flex gap-2 items-start ml-1">
          <span className="font-bold shrink-0" style={{ color: "var(--accent)", minWidth: 16 }}>{numMatch[1]}.</span>
          <span>{inlineMarkdown(numMatch[2])}</span>
        </li>
      );
      return;
    }
    // Empty line = spacer
    if (!line.trim()) {
      elements.push(<div key={idx} className="h-1" />);
      return;
    }
    // Normal paragraph
    elements.push(<p key={idx} className="leading-relaxed">{inlineMarkdown(line)}</p>);
  });

  return elements;
}

// Handle inline **bold**, *italic*, [link](url)
function inlineMarkdown(text) {
  const parts = [];
  // Split on **bold**, *italic*, [text](url)
  const rx = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let m;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) {
      parts.push(<strong key={m.index} className="font-semibold" style={{ color: "var(--text-primary)" }}>{m[2]}</strong>);
    } else if (m[3]) {
      parts.push(<em key={m.index}>{m[3]}</em>);
    } else if (m[4] && m[5]) {
      parts.push(
        <a key={m.index} href={m[5]} target="_blank" rel="noopener noreferrer"
           className="underline" style={{ color: "var(--accent)" }}>
          {m[4]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

// ── Inline Scheme Card ───────────────────────────────────────────────────────
function InlineSchemeCard({ scheme }) {
  const [expanded, setExpanded] = useState(false);
  const matchColor = "var(--accent)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl mt-1.5 overflow-hidden text-xs"
      style={{ background: "var(--bg-primary)", border: "1px solid rgba(99,102,241,0.25)" }}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{scheme.name}</p>
          <p className="mt-0.5 text-xs leading-snug line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {scheme.brief_description}
          </p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(99,102,241,0.1)", color: matchColor }}>
          {scheme.category?.split(" ")[0]}
        </span>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-2 flex flex-col gap-1.5 border-t" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              {scheme.benefits && (
                <p className="mt-1.5" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-semibold">Benefits: </span>{scheme.benefits}
                </p>
              )}
              {scheme.eligibility && (
                <p style={{ color: "var(--text-secondary)" }}>
                  <span className="font-semibold">Eligibility: </span>
                  {scheme.eligibility.length > 120 ? scheme.eligibility.slice(0, 120) + "…" : scheme.eligibility}
                </p>
              )}
              <p style={{ color: "var(--text-muted)" }}>
                {scheme.level} · {scheme.state} · {scheme.ministry}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-0 border-t" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
        <button onClick={() => setExpanded(v => !v)}
          className="flex-1 py-1.5 text-xs text-center transition-colors"
          style={{ color: "var(--text-muted)" }}>
          {expanded ? "Hide details" : "Show details"}
        </button>
        <div style={{ width: 1, height: 20, background: "rgba(99,102,241,0.15)" }} />
        <a href={`/scheme/${scheme.slug}`}
           className="flex-1 py-1.5 text-xs text-center flex items-center justify-center gap-1 transition-colors"
           style={{ color: "var(--accent)" }}>
          View <ExternalLink size={10} />
        </a>
        {scheme.application_url && (
          <>
            <div style={{ width: 1, height: 20, background: "rgba(99,102,241,0.15)" }} />
            <a href={scheme.application_url} target="_blank" rel="noopener noreferrer"
               className="flex-1 py-1.5 text-xs text-center flex items-center justify-center gap-1 transition-colors"
               style={{ color: "var(--success)" }}>
              Apply <ChevronRight size={10} />
            </a>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Profile Update Action Chip ───────────────────────────────────────────────
function ProfileChip({ summary, extractedProfile, onApply }) {
  const [applied, setApplied] = useState(false);

  function handleClick() {
    onApply(extractedProfile);
    setApplied(true);
  }

  if (applied) {
    return (
      <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl mt-1.5"
           style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <UserCheck size={13} /> Profile updated!
      </div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="flex items-start gap-2 text-xs px-3 py-2 rounded-xl mt-1.5 text-left w-full transition-all"
      style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--text-secondary)" }}
      whileHover={{ scale: 1.01 }}>
      <Sparkles size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
      <span>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>💡 We noticed: </span>
        {summary}. <span className="underline" style={{ color: "var(--accent)" }}>Click to auto-fill your eligibility profile.</span>
      </span>
    </motion.button>
  );
}

// ── Per-message TTS button ────────────────────────────────────────────────────
function TTSButton({ text, speakText, stopSpeaking, speaking, locale }) {
  const [active, setActive] = useState(false);

  function toggle() {
    if (active) {
      stopSpeaking();
      setActive(false);
    } else {
      // Bug B5 fix: strip all markdown including headings (with or without space),
      // emoji at line start, and inline link syntax before speaking
      const clean = text
        .replace(/#{1,6}\s*/g, "")          // ### headings (with or without trailing space)
        .replace(/\*\*/g, "")               // bold
        .replace(/\*/g, "")                 // italic
        .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [text](url) → text
        .replace(/^[\p{Emoji}]+\s*/gmu, "") // leading emoji on a line
        .replace(/\n{3,}/g, "\n\n")         // collapse triple+ newlines
        .trim();
      speakText(clean.slice(0, 600), locale);
      setActive(true);
    }
  }

  // Sync with global speaking state
  useEffect(() => {
    if (!speaking) setActive(false);
  }, [speaking]);

  return (
    <button onClick={toggle} title={active ? "Stop" : "Read aloud"}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
      style={{ color: active ? "var(--accent)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
      {active ? <VolumeX size={12} /> : <Volume2 size={12} />}
    </button>
  );
}

// ── Voice wave equalizer (animated bars) ─────────────────────────────────────
function VoiceWave() {
  return (
    <span className="flex items-center gap-0.5 px-1">
      {[0, 0.1, 0.2, 0.15, 0.05].map((delay, i) => (
        <motion.span key={i}
          className="inline-block rounded-full"
          style={{ width: 3, background: "var(--danger)" }}
          animate={{ height: [4, 12, 4, 14, 4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay, ease: "easeInOut" }} />
      ))}
    </span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, speakText, stopSpeaking, speaking, locale, onUpdateProfile }) {
  const isBot = msg.role === "assistant";
  const rendered = isBot ? renderMarkdown(msg.content) : [msg.content];
  // Bug B4 fix: check both leading (first line) and mid-content bullets/numbers
  // so messages that start with "- " or "1. " are also wrapped in <ul>
  const hasBullets = isBot && (
    /(?:^|\n)[\-–*•]\s/.test(msg.content) ||
    /(?:^|\n)\d+\.\s/.test(msg.content)
  );

  return (
    <motion.div className={`flex gap-2 group ${isBot ? "" : "flex-row-reverse"}`}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>

      {/* Avatar */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
           style={{ background: isBot ? "var(--accent-grad)" : "var(--bg-secondary)" }}>
        {isBot ? <Bot size={14} color="#fff" /> : <User size={14} style={{ color: "var(--text-muted)" }} />}
      </div>

      <div className="flex flex-col gap-1 max-w-[82%]">
        {/* Text bubble */}
        <div className="relative px-3 py-2 rounded-2xl text-xs"
             style={{
               background: isBot ? "var(--bg-secondary)" : "var(--accent-grad)",
               color: isBot ? "var(--text-primary)" : "#fff",
               borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
             }}>
          {hasBullets
            ? <ul className="flex flex-col gap-0.5">{rendered}</ul>
            : <div className="flex flex-col gap-1">{rendered}</div>
          }

          {/* Per-message TTS (bot only) */}
          {isBot && (
            <div className="absolute -bottom-4 right-1">
              <TTSButton text={msg.content} speakText={speakText}
                stopSpeaking={stopSpeaking} speaking={speaking} locale={locale} />
            </div>
          )}
        </div>

        {/* Inline scheme cards */}
        {isBot && msg.schemes?.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            {msg.schemes.slice(0, 3).map(s => (
              <InlineSchemeCard key={s.slug || s.id} scheme={s} />
            ))}
          </div>
        )}

        {/* Profile update chip */}
        {isBot && msg.detectionSummary && msg.extractedProfile && onUpdateProfile && (
          <ProfileChip
            summary={msg.detectionSummary}
            extractedProfile={msg.extractedProfile}
            onApply={onUpdateProfile}
          />
        )}
      </div>
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
           style={{ background: "var(--accent-grad)" }}>
        <Bot size={14} color="#fff" />
      </div>
      <div className="px-3 py-2.5 rounded-2xl flex gap-1 items-center"
           style={{ background: "var(--bg-secondary)", borderRadius: "4px 16px 16px 16px" }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--text-muted)" }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: d }} />
        ))}
      </div>
    </div>
  );
}

// ── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Schemes for farmers in Karnataka",
  "Scholarship for college girl",
  "Business loan for startup",
  "Health insurance for BPL family",
];

const WELCOME = "👋 Hi! I'm GovMatch AI. Tell me about yourself — your age, state, occupation, and what you're looking for — and I'll find the best government schemes for you.";

// ── Main ChatBot ──────────────────────────────────────────────────────────────
export default function ChatBot() {
  const { i18n } = useTranslation();
  const [open, setOpen]             = useState(false);
  const [messages, setMessages]     = useState([{ role: "assistant", content: WELCOME, id: 0 }]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState([]);
  // "openrouter" | "fallback" | "error_fallback" | null (null = no message sent yet)
  const [aiMode, setAiMode]         = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const msgId      = useRef(1);
  // Bug B3 fix: keep a ref mirror of input so sendMessage always reads the
  // latest value regardless of useCallback's dep-array closure timing.
  const inputRef2  = useRef("");

  const {
    listening, speaking, locale,
    startListening, stopListening,
    speakText, stopSpeaking,
  } = useRegionalSpeech();

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus input when opened ────────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ── Handle profile update from chip ───────────────────────────────────────
  function handleUpdateProfile(signals) {
    const cur = JSON.parse(localStorage.getItem("govmatch_profile") || "{}");
    const updated = { ...cur, ...signals };
    localStorage.setItem("govmatch_profile", JSON.stringify(updated));
    // Dispatch a storage event so other open tabs / the questionnaire page
    // can react immediately without requiring a full reload.
    window.dispatchEvent(new StorageEvent("storage", {
      key:      "govmatch_profile",
      newValue: JSON.stringify(updated),
      storageArea: localStorage,
    }));
  }

  // ── Mic button ─────────────────────────────────────────────────────────────
  function handleMicClick() {
    if (listening) { stopListening(); return; }
    startListening(
      (transcript) => {
        // Keep ref in sync so sendMessage picks up voice-entered text correctly
        const next = (inputRef2.current ? inputRef2.current + " " : "") + transcript;
        inputRef2.current = next;
        setInput(next);
      },
      (err) => console.warn("STT error:", err)
    );
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    // Bug B3 fix: read from ref so we always get the latest input value even if
    // the useCallback closure captured a stale copy during rapid typing + submit.
    const userText = (text || inputRef2.current).trim();
    if (!userText || loading) return;
    setInput("");
    inputRef2.current = "";

    const userMsg = { role: "user", content: userText, id: msgId.current++ };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const apiHistory = history.slice(-8).map(m => ({ role: m.role, content: m.content }));
    const profile    = JSON.parse(localStorage.getItem("govmatch_profile") || "{}");

    try {
      const res = await axios.post("/api/chat", {
        message:  userText,
        profile,
        language: i18n.language || "en",
        history:  apiHistory,
      });

      const { reply, schemes = [], extractedProfile, detectionSummary, source } = res.data;
      // Only update aiMode for non-conversational sources so greeting/thanks
      // don't incorrectly illuminate the AI Powered / Fallback badge.
      if (source && source !== "conversational") setAiMode(source);

      const replyText = reply || "I couldn't find a good answer. Please try rephrasing.";
      const botMsg = {
        role:            "assistant",
        content:         replyText,
        schemes,
        extractedProfile,
        detectionSummary,
        id:              msgId.current++,
      };

      setMessages(prev => [...prev, botMsg]);
      setHistory(prev => [...prev, userMsg, { role: "assistant", content: replyText }]);

    } catch {
      const errText = "Sorry, I couldn't connect to the server. Please check that the backend is running.";
      setMessages(prev => [...prev, {
        role:    "assistant",
        content: errText,
        id:      msgId.current++,
      }]);
      // Keep history in sync so follow-up context isn't lost
      setHistory(prev => [...prev, userMsg, { role: "assistant", content: errText }]);
    } finally {
      setLoading(false);
    }
  // Bug B3 fix: removed `input` from deps — value is now read via inputRef2.current
  }, [loading, history, i18n.language]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function clearChat() {
    setMessages([{ role: "assistant", content: WELCOME, id: 0 }]);
    setHistory([]);
    setAiMode(null);   // Bug B1/B2 fix: reset badge so it doesn't persist after clear
    stopSpeaking();
  }

  const unreadCount = open ? 0 : messages.filter(m => m.role === "assistant").length - 1;

  return (
    <>
      {/* ── Floating trigger button ────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: "var(--accent-grad)" }}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
        aria-label="Open AI Chat">
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x"  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} color="#fff" /></motion.span>
            : <motion.span key="mc" initial={{ rotate: 90, opacity: 0 }}  animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageCircle size={22} color="#fff" /></motion.span>
          }
        </AnimatePresence>
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ background: "var(--danger)", fontSize: "0.65rem", fontWeight: 700 }}>
            {unreadCount}
          </span>
        )}
      </motion.button>

      {/* ── Chat panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="glass fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden"
            style={{ width: 370, height: 560, maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100vh - 8rem)" }}
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.88, y: 24  }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                 style={{ borderColor: "var(--border)", background: "var(--accent-grad)" }}>
              <div className="flex items-center gap-2">
                <Bot size={18} color="#fff" />
                <div>
                  <p className="text-sm font-semibold text-white">GovMatch AI</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {loading ? "Thinking…" : "Online · RAG verified"}
                  </p>
                </div>
              </div>
              {/* AI mode badge — visible after first response */}
              {aiMode && (
                <span style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: aiMode === "openrouter" ? "rgba(34,197,94,0.22)" : "rgba(251,191,36,0.22)",
                  color:      aiMode === "openrouter" ? "#86efac" : "#fde68a",
                  border:     `1px solid ${aiMode === "openrouter" ? "rgba(134,239,172,0.45)" : "rgba(253,230,138,0.45)"}`,
                  whiteSpace: "nowrap",
                }}>
                  {aiMode === "openrouter" ? "✦ AI Powered" : "◌ Fallback"}
                </span>
              )}
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="p-1.5 rounded-lg" title="Clear chat"
                        style={{ color: "rgba(255,255,255,0.8)", background: "none", border: "none", cursor: "pointer" }}>
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => { setOpen(false); stopSpeaking(); }}
                        className="p-1.5 rounded-lg"
                        style={{ color: "rgba(255,255,255,0.8)", background: "none", border: "none", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map(msg => (
                <Bubble key={msg.id} msg={msg}
                  speakText={speakText} stopSpeaking={stopSpeaking}
                  speaking={speaking} locale={locale}
                  onUpdateProfile={handleUpdateProfile} />
              ))}
              {loading && <TypingDots />}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts (welcome state only) */}
            {messages.length === 1 && !loading && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => sendMessage(p)}
                    className="text-xs px-2.5 py-1.5 rounded-full border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-secondary)", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.color = "var(--text-secondary)"; }}>
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="px-3 pb-3 pt-2 border-t shrink-0 flex gap-2 items-end"
                 style={{ borderColor: "var(--border)" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); inputRef2.current = e.target.value; }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about schemes, eligibility…"
                rows={1}
                className="flex-1 resize-none px-3 py-2 rounded-xl text-xs outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  maxHeight: 80,
                  lineHeight: 1.5,
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e  => e.target.style.borderColor = "var(--border)"}
              />

              {/* Mic with voice-wave */}
              <button onClick={handleMicClick}
                className="p-2 rounded-xl shrink-0 flex items-center gap-0 transition-all"
                style={{
                  background: listening ? "rgba(239,68,68,0.12)" : "var(--bg-secondary)",
                  border: `1px solid ${listening ? "var(--danger)" : "var(--border)"}`,
                  color: listening ? "var(--danger)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
                title={listening ? "Stop listening" : "Voice input"}>
                {listening ? (
                  <><MicOff size={15} /><VoiceWave /></>
                ) : (
                  <Mic size={15} />
                )}
              </button>

              {/* Send */}
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className="p-2 rounded-xl shrink-0 transition-all"
                style={{
                  background: input.trim() ? "var(--accent-grad)" : "var(--bg-secondary)",
                  color:      input.trim() ? "#fff" : "var(--text-muted)",
                  border:     "none",
                  cursor:     input.trim() ? "pointer" : "default",
                  opacity:    loading ? 0.6 : 1,
                }}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
