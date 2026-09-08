import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Download, ArrowLeft, CheckCircle2, FileText, BookOpen, Bookmark, BookmarkCheck, Volume2 } from "lucide-react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import Loader from "../components/Loader";
import { downloadEligibilityReport } from "../services/pdfService";
import useRegionalSpeech from "../hooks/useRegionalSpeech";

const DOCS_DEFAULT = ["Aadhaar Card","Bank Passbook / Account Details","Income Certificate","Caste Certificate (if applicable)","Address Proof","Passport Size Photograph"];

function Section({ title, icon, children }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SchemeDetails() {
  const { t } = useTranslation();
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [scheme, setScheme]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [bookmarked, setBookmarked]   = useState(false);
  const { speaking, speakText, stopSpeaking } = useRegionalSpeech();

  function handleListen() {
    if (speaking) { stopSpeaking(); return; }
    const text = [
      scheme.name,
      scheme.brief_description,
      scheme.benefits,
      scheme.eligibility
    ].filter(Boolean).join(". ");
    speakText(text);
  }

  useEffect(() => {
    axios.get(`/api/schemes/${id}`)
      .then(r => { setScheme(r.data); const saved = JSON.parse(localStorage.getItem("bookmarks") || "[]"); setBookmarked(saved.includes(r.data.slug)); })
      .catch(() => setScheme(null))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleBookmark() {
    const saved = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    const updated = bookmarked ? saved.filter(s => s !== scheme.slug) : [...saved, scheme.slug];
    localStorage.setItem("bookmarks", JSON.stringify(updated));
    setBookmarked(!bookmarked);
  }

  function downloadPDF() {
    const profile = JSON.parse(localStorage.getItem("govmatch_profile") || "{}");
    downloadEligibilityReport(scheme, profile, {}, 0);
  }

  if (loading) return <Loader message={t("loading")} />;
  if (!scheme) return (
    <div className="glass-card p-10 text-center flex flex-col items-center gap-4">
      <p className="font-bold" style={{ color: "var(--text-primary)" }}>Scheme not found</p>
      <button onClick={() => navigate("/search")} className="btn-primary">Back to Search</button>
    </div>
  );

  const eligibilityPoints = (scheme.eligibility || "").split(";").map(s => s.trim()).filter(Boolean);
  const appSteps          = (scheme.application_process || "").split(/\.|;|\n/).map(s => s.trim()).filter(s => s.length > 8);

  return (
    <motion.div className="max-w-3xl mx-auto flex flex-col gap-5 page-enter"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs self-start"
              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
        <ArrowLeft size={13} /> {t("scheme_detail_back")}
      </button>

      {/* Header card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="badge badge-central">{scheme.level}</span>
              <span className="badge badge-education">{scheme.category}</span>
              {scheme.state !== "Central" && <span className="badge badge-state">{scheme.state}</span>}
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{scheme.name}</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{scheme.ministry}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={toggleBookmark} className="btn-ghost p-2.5"
                    style={{ color: bookmarked ? "var(--accent)" : "var(--text-muted)" }}
                    title={t("scheme_detail_bookmark")}>
              {bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
            <button onClick={handleListen}
              className="btn-ghost flex items-center gap-2 text-xs"
              style={{ color: speaking ? "var(--accent)" : undefined }}>
              <Volume2 size={14} /> {speaking ? t("scheme_detail_stop") : t("scheme_detail_listen")}
            </button>
            <button onClick={downloadPDF} className="btn-ghost flex items-center gap-2 text-xs">
              <Download size={14} /> {t("scheme_detail_download")}
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed mt-4" style={{ color: "var(--text-secondary)" }}>
          {scheme.brief_description}
        </p>
      </div>

      {/* Overview */}
      <Section title={t("scheme_detail_overview")} icon={<BookOpen size={16} />}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {scheme.detailed_description || scheme.brief_description}
        </p>
      </Section>

      {/* Benefits */}
      <Section title={t("scheme_detail_benefits")} icon={<span>💰</span>}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{scheme.benefits}</p>
      </Section>

      {/* Eligibility checklist */}
      <Section title={t("scheme_detail_eligibility")} icon={<CheckCircle2 size={16} />}>
        {eligibilityPoints.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {eligibilityPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{scheme.eligibility}</p>
        )}
      </Section>

      {/* Documents */}
      <Section title={t("scheme_detail_documents")} icon={<FileText size={16} />}>
        <ul className="grid grid-cols-2 gap-2">
          {DOCS_DEFAULT.map(d => (
            <li key={d} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)" }}>•</span>{d}
            </li>
          ))}
        </ul>
      </Section>

      {/* Application steps */}
      <Section title={t("scheme_detail_steps")} icon={<span>📋</span>}>
        <ol className="flex flex-col gap-3">
          {(appSteps.length > 0 ? appSteps : ["Visit the official portal","Fill the application form","Upload required documents","Submit and note application number"]).map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "var(--accent-grad)" }}>{i + 1}</span>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Apply CTA */}
      {scheme.application_url && (
        <a href={scheme.application_url} target="_blank" rel="noopener noreferrer"
           className="btn-primary flex items-center justify-center gap-2 py-3 text-sm rounded-xl">
          {t("scheme_detail_apply")} <ExternalLink size={14} />
        </a>
      )}
    </motion.div>
  );
}
