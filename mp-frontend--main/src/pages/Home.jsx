import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight, Users, TrendingUp, IndianRupee, Sprout, GraduationCap, Heart, Briefcase, Zap, Baby } from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Animated counter ────────────────────────────────────────────
function Counter({ target, suffix = "", duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const steps = 60;
    const inc = target / steps;
    let cur = 0;
    const id = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(id);
  }, [target, duration]);
  return <span>{val.toLocaleString("en-IN")}{suffix}</span>;
}

const CATEGORIES = [
  { icon: <Sprout size={22} />,        label: "Agriculture",  color: "#16a34a", bg: "#dcfce7", path: "/search?category=Agriculture%2C+Rural+%26+Environment" },
  { icon: <GraduationCap size={22} />, label: "Education",    color: "#1d4ed8", bg: "#dbeafe", path: "/search?category=Education+%26+Learning" },
  { icon: <Baby size={22} />,          label: "Women",        color: "#be185d", bg: "#fce7f3", path: "/search?category=Women+Empowerment" },
  { icon: <Heart size={22} />,         label: "Health",       color: "#dc2626", bg: "#fee2e2", path: "/search?category=Health+%26+Wellness" },
  { icon: <Briefcase size={22} />,     label: "Business",     color: "#92400e", bg: "#fef3c7", path: "/search?category=Business+%26+Entrepreneurship" },
  { icon: <Zap size={22} />,           label: "Employment",   color: "#6b21a8", bg: "#f3e8ff", path: "/search?category=Skills+%26+Employment" },
];

const HOW_STEP_KEYS = [
  { n: "01", titleKey: "step1_title", descKey: "step1_desc" },
  { n: "02", titleKey: "step2_title", descKey: "step2_desc" },
  { n: "03", titleKey: "step3_title", descKey: "step3_desc" },
  { n: "04", titleKey: "step4_title", descKey: "step4_desc" },
];

const TESTIMONIALS = [
  { name: "Ramesh K.", state: "Karnataka", quote: "Found PM-KISAN and PMFBY in under 2 minutes. Got ₹6,000 credited to my account!", role: "Farmer" },
  { name: "Priya S.",  state: "Tamil Nadu", quote: "The eligibility checker told me exactly which documents I needed. Applied for Sukanya Samriddhi immediately.", role: "Teacher & Mother" },
  { name: "Arjun M.", state: "Maharashtra", quote: "Got a MUDRA loan via the app's direct link. My business is now running!", role: "Small Business Owner" },
];

export default function Home() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="flex flex-col gap-16 page-enter">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative rounded-3xl overflow-hidden px-6 py-16 md:py-24 text-center"
               style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a21caf 100%)" }}>
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

        <motion.div className="relative z-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
                style={{ background: "rgba(255,255,255,0.15)", color: "#e0e7ff" }}>
            🇮🇳 Smart Government Scheme Finder
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            {t("hero_title")}
          </h1>
          <p className="text-base md:text-lg mb-8" style={{ color: "rgba(255,255,255,0.8)" }}>
            {t("hero_sub")}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto mb-6">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6366f1" }} />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder={t("hero_search_placeholder")}
                className="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#fff", color: "#0f172a", border: "none" }} />
            </div>
            <button type="submit" className="btn-primary px-5 py-3 rounded-xl whitespace-nowrap">
              Search
            </button>
          </form>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => navigate("/assess")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "#fff", color: "#4f46e5" }}
              onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              {t("hero_cta1")} <ArrowRight size={15} />
            </button>
            <button onClick={() => navigate("/search")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border"
              style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {t("hero_cta2")}
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { icon: <TrendingUp size={24} />, label: t("stats_total_schemes"),     value: 4430,      suffix: "+" },
          { icon: <Users size={24} />,      label: t("stats_beneficiaries"),     value: 120000000, suffix: "+" },
          { icon: <IndianRupee size={24}/>, label: t("stats_disbursed"),         value: 2500000,   suffix: "+ Cr" },
        ].map(stat => (
          <motion.div key={stat.label} className="glass-card p-6 flex items-center gap-4"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                <Counter target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <motion.button key={cat.label} onClick={() => navigate(cat.path)}
              className="glass-card flex flex-col items-center gap-3 p-5 cursor-pointer"
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ background: cat.bg, color: cat.color }}>
                {cat.icon}
              </div>
              <span className="text-xs font-semibold text-center" style={{ color: "var(--text-primary)" }}>
                {cat.label}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
          {t("how_works")}
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
          {t("how_works_sub")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_STEP_KEYS.map((step, i) => (
            <motion.div key={step.n} className="glass-card p-6 flex flex-col gap-3"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <span className="text-3xl font-extrabold gradient-text">{step.n}</span>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t(step.titleKey)}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{t(step.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "var(--text-primary)" }}>
          {t("impact_title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map(t => (
            <motion.div key={t.name} className="glass-card p-6 flex flex-col gap-3"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                "{t.quote}"
              </p>
              <div className="flex items-center gap-2 mt-auto pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                     style={{ background: "var(--accent-grad)" }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.role} · {t.state}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section className="glass-card p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6"
               style={{ background: "linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.06))", border: "1px solid rgba(99,102,241,0.2)" }}>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("cta_ready")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("cta_sub")}
          </p>
        </div>
        <button onClick={() => navigate("/assess")} className="btn-primary flex items-center gap-2 px-6 py-3 text-sm whitespace-nowrap">
          {t("cta_start")} <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}
