import { ExternalLink, Phone, Mail, Globe, Github } from "lucide-react";

const PORTAL_LINKS = [
  { label: "MyScheme Portal",           href: "https://myscheme.gov.in" },
  { label: "National Scholarship Portal", href: "https://scholarships.gov.in" },
  { label: "PM India Schemes",          href: "https://www.pmindia.gov.in" },
  { label: "India.gov.in",              href: "https://www.india.gov.in" },
];

const QUICK_LINKS = [
  { label: "Home",                 href: "/" },
  { label: "Search Schemes",       href: "/search" },
  { label: "Eligibility Check",    href: "/assess" },
  { label: "Compare Schemes",      href: "/compare" },
  { label: "Impact Dashboard",     href: "/impact" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                   style={{ background: "var(--accent-grad)" }}>G</div>
              <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                Gov<span className="gradient-text">Match</span> AI
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              AI-powered platform connecting Indian citizens with government welfare schemes.
              Powered by semantic search and eligibility intelligence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--text-secondary)" }}>Quick Links</h4>
            <ul className="flex flex-col gap-1.5">
              {QUICK_LINKS.map(l => (
                <li key={l.href}>
                  <a href={l.href} className="text-xs transition-colors"
                     style={{ color: "var(--text-muted)" }}
                     onMouseEnter={e => e.target.style.color = "var(--accent)"}
                     onMouseLeave={e => e.target.style.color = "var(--text-muted)"}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Government Portals */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--text-secondary)" }}>Official Portals</h4>
            <ul className="flex flex-col gap-1.5">
              {PORTAL_LINKS.map(l => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer"
                     className="text-xs flex items-center gap-1 transition-colors"
                     style={{ color: "var(--text-muted)" }}
                     onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                     onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                    {l.label} <ExternalLink size={10} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Helpdesk */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--text-secondary)" }}>Helpdesk</h4>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Phone size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span>1800-11-1555 (Toll Free)</span>
              </li>
              <li className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Mail size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span>support@govmatch.ai</span>
              </li>
              <li className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Globe size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span>Mon–Sat, 9AM–6PM IST</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer + Copyright */}
        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
             style={{ borderColor: "var(--border)" }}>
          <p className="text-xs text-center sm:text-left" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} GovMatch AI. For informational purposes only.
            Always verify scheme details on official government portals.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Not affiliated with any government body. Data sourced from public records.
          </p>
        </div>
      </div>
    </footer>
  );
}
