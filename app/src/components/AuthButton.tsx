/**
 * Navbar burchagidagi auth tugmasi — kirish / ro'yxat / chiqish.
 * Bosilganda kichik dropdown ochiladi.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, User, Cloud, CloudDownload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uz } from "@/lib/uz";
import {
  fetchCurrentUser,
  getAuthUser,
  login,
  logout,
  register,
  syncCloudProfile,
  updateStoredUser,
  type AuthUser,
} from "@/lib/auth";
import { getFullProfile, mergeProfile, type GameRecord } from "@/lib/profile";

export default function AuthButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser().then((u) => setUser(u));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const validate = (): string | null => {
    if (!email.trim()) return uz.auth.emailRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return uz.auth.invalidEmail;
    if (!password) return uz.auth.passwordRequired;
    if (password.length < 6) return uz.auth.passwordMin;
    if (mode === "register" && name.trim().length < 2) return uz.auth.nameRequired;
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const v = validate();
    if (v) return setError(v);
    setLoading(true);
    const res = mode === "login" ? await login(email, password) : await register(email, password, name);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || (mode === "login" ? uz.auth.loginError : uz.auth.registerError));
      return;
    }
    if (res.user) {
      setUser(res.user);
      setMessage(mode === "login" ? uz.auth.loggedInAs(res.user.name) : "Ro'yxatdan o'tdingiz");
      mergeProfile(res.user.profile as { games: GameRecord[]; lessons: string[] });
      setEmail("");
      setPassword("");
      setName("");
    }
  };

  const onLogout = () => {
    logout();
    setUser(null);
    setOpen(false);
  };

  const onSync = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    const ok = await syncCloudProfile(getFullProfile());
    setLoading(false);
    if (ok) setMessage(uz.auth.syncSuccess);
    else setError(uz.auth.syncError);
  };

  const onPull = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    const u = await fetchCurrentUser();
    setLoading(false);
    if (u) {
      mergeProfile(u.profile as { games: GameRecord[]; lessons: string[] });
      updateStoredUser(u);
      setUser(u);
      setMessage(uz.auth.mergeSuccess);
    } else {
      setError(uz.auth.syncError);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
          user
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : "bg-sand-100 text-ink-700 hover:bg-sand-200"
        )}
        aria-label={user ? user.name : uz.auth.loginTab}
      >
        <User className="h-4 w-4" />
        <span className="hidden max-w-[120px] truncate sm:inline">{user ? user.name : uz.auth.loginTab}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-sand-200 bg-white p-5 shadow-lift"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-ink-400 hover:bg-sand-100"
              aria-label={uz.nav.close}
            >
              <X className="h-4 w-4" />
            </button>

            {user ? (
              <div>
                <p className="font-display font-bold text-ink-900">{user.name}</p>
                <p className="text-body-sm text-ink-500">{user.email}</p>
                <div className="mt-4 grid gap-2">
                  <button onClick={onSync} disabled={loading} className="btn-primary flex w-full items-center gap-2">
                    <Cloud className="h-4 w-4" /> {uz.auth.syncButton}
                  </button>
                  <button onClick={onPull} disabled={loading} className="btn-secondary flex w-full items-center gap-2">
                    <CloudDownload className="h-4 w-4" /> {uz.auth.mergeButton}
                  </button>
                  <Link to="/profil" onClick={() => setOpen(false)} className="btn-secondary flex w-full items-center justify-center gap-2">
                    <User className="h-4 w-4" /> {uz.nav.profile}
                  </Link>
                  <button onClick={onLogout} className="btn-ghost flex w-full items-center gap-2 text-clay-500">
                    <LogOut className="h-4 w-4" /> {uz.auth.logoutButton}
                  </button>
                </div>
                {message && <p className="mt-3 text-body-sm text-emerald-700">{message}</p>}
                {error && <p className="mt-3 text-body-sm text-clay-600">{error}</p>}
              </div>
            ) : (
              <div>
                <div className="mb-4 inline-flex rounded-xl bg-sand-100 p-1">
                  <button
                    onClick={() => setMode("login")}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                      mode === "login" ? "bg-emerald-700 text-white" : "text-ink-600 hover:bg-sand-200"
                    )}
                  >
                    {uz.auth.loginTab}
                  </button>
                  <button
                    onClick={() => setMode("register")}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                      mode === "register" ? "bg-emerald-700 text-white" : "text-ink-600 hover:bg-sand-200"
                    )}
                  >
                    {uz.auth.registerTab}
                  </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-3">
                  <label className="block">
                    <span className="text-caption text-ink-600">{uz.auth.email}</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-emerald-600"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-caption text-ink-600">{uz.auth.password}</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-emerald-600"
                      required
                      minLength={6}
                    />
                  </label>
                  {mode === "register" && (
                    <label className="block">
                      <span className="text-caption text-ink-600">{uz.auth.name}</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-emerald-600"
                        required
                        minLength={2}
                      />
                    </label>
                  )}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    <LogIn className="mr-1 inline h-4 w-4" />
                    {loading ? "..." : mode === "login" ? uz.auth.loginButton : uz.auth.registerButton}
                  </button>
                </form>
                {error && <p className="mt-3 text-body-sm text-clay-600">{error}</p>}
                {message && <p className="mt-3 text-body-sm text-emerald-700">{message}</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
