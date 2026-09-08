/**
 * useRegionalSpeech — hook for Web Speech API with i18n language awareness.
 * Provides startListening(), stopListening(), speakText(), stopSpeaking()
 * all bound to the currently active i18n language.
 */

import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SPEECH_LOCALES } from "../i18n/index.js";

export default function useRegionalSpeech() {
  const { i18n }     = useTranslation();
  const [listening, setListening]   = useState(false);
  const [speaking,  setSpeaking]    = useState(false);
  const recognRef = useRef(null);
  const locale    = SPEECH_LOCALES[i18n.language] || "en-IN";

  // ── Speech-to-Text ──────────────────────────────────────────
  const startListening = useCallback((onResult, onError) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError?.("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.continuous    = false;
    rec.interimResults = false;
    rec.lang          = locale;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      onResult?.(transcript);
    };
    rec.onerror = (e) => {
      setListening(false);
      onError?.(e.error);
    };
    rec.onend = () => setListening(false);

    recognRef.current = rec;
    rec.start();
    setListening(true);
  }, [locale]);

  const stopListening = useCallback(() => {
    recognRef.current?.stop();
    setListening(false);
  }, []);

  // ── Text-to-Speech ──────────────────────────────────────────
  const speakText = useCallback((text, lang) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text.slice(0, 500));
    utt.lang   = lang || locale;
    utt.rate   = 0.9;
    utt.pitch  = 1;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [locale]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { listening, speaking, locale, startListening, stopListening, speakText, stopSpeaking };
}
