import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Lock, Mail, Eye, EyeOff, LogIn, UserPlus, KeyRound, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "govmatch_user";

// mode: "login" | "register" | "forgot"
export default function AuthModal({ open, onClose, onAuthChange }) {
  const [mode, setMode]           = useState("login");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [loading, setLoading]     = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function reset() {
    setName(""); setEmail(""); setPassword("");
    setError(""); setSuccess(""); setShowPw(false);
  }

  function switchMode(m) { setMode(m); reset(); }

  function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (mode === "forgot") {
      if (!email) { setError("Please enter your email address."); return; }
      setLoading(true);
      setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!stored || stored.email !== email) {
          setError("No account found with this email.");
        } else {
          setSuccess(`Password reset link sent to ${email}. (Demo: your password is stored locally)`);
        }
        setLoading(false);
      }, 800);
      return;
    }

    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "register" && !name) { setError("Name is required."); return; }
    if (mode === "register" && password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    setTimeout(() => {
      if (mode === "login") {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!stored || stored.email !== email || stored.password !== password) {
          setError("Invalid email or password.");
          setLoading(false);
          return;
        }
        onAuthChange(stored);
      } else {
        const user = { name, email, password, createdAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        onAuthChange(user);
      }
      setLoading(false);
      reset();
      onClose();
    }, 600);
  }

  const titles = {
    login:    { heading: "Welcome Back",     sub: "Sign in to your GovMatch AI account",   icon: <LogIn size={18} color="#fff" /> },
    register: { heading: "Create Account",   sub: "Start finding schemes tailored for you", icon: <UserPlus size={18} color="#fff" /> },
    forgot:   { heading: "Forgot Password",  sub: "We'll help you reset your password",     icon: <KeyRound size={18} color="#fff" /> },
  };

  return (
    <AnimatePresence>
      {open && (
        /* Full-screen flex container — centres the modal */
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Modal card — stop click bubbling to backdrop */}
          <motion.div
            className="glass-card w-full max-w-sm p-7 relative"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            {/* Close button */}
            <button onClick={onClose}
              className="absolute top-4 right-4 btn-ghost p-1.5 rounded-lg"
              aria-label="Close">
              <X size={16} />
            </button>

            {/* Back button (forgot mode) */}
            {mode === "forgot" && (
              <button onClick={() => switchMode("login")}
                className="absolute top-4 left-4 btn-ghost p-1.5 rounded-lg flex items-center gap-1 text-xs"
                style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                   style={{ background: "var(--accent-grad)" }}>
                {titles[mode].icon}
              </div>
              <h2 className="text-lg font-bold gradient-text">{titles[mode].heading}</h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{titles[mode].sub}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">

              {/* Name — register only */}
              {mode === "register" && (
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }} />
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Full name" type="text" autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e  => e.target.style.borderColor = "var(--border)"} />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }} />
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address" type="email" autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e  => e.target.style.borderColor = "var(--border)"} />
              </div>

              {/* Password — login & register only */}
              {mode !== "forgot" && (
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }} />
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" type={showPw ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg outline-none transition-all"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e  => e.target.style.borderColor = "var(--border)"} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}

              {/* Forgot password link — login mode only */}
              {mode === "login" && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={() => switchMode("forgot")}
                    className="text-xs"
                    style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs rounded-lg px-3 py-2"
                   style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                  {error}
                </p>
              )}

              {/* Success */}
              {success && (
                <p className="text-xs rounded-lg px-3 py-2"
                   style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                  {success}
                </p>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="btn-primary w-full py-2.5 mt-1 flex items-center justify-center gap-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : mode === "login" ? "Sign In"
                  : mode === "register" ? "Create Account"
                  : "Send Reset Link"}
              </button>
            </form>

            {/* Footer links */}
            {mode !== "forgot" && (
              <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  style={{ color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                  {mode === "login" ? "Register" : "Sign In"}
                </button>
              </p>
            )}

            {mode === "forgot" && !success && (
              <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
                Remembered it?{" "}
                <button onClick={() => switchMode("login")}
                  style={{ color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                  Sign In
                </button>
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
