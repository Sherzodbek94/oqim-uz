/**
 * AuthGuard — o'yin sahifalariga kirishni faqat tizimga kirgan foydalanuvchilarga cheklaydi.
 * Login/Register formasi ko'rsatiladi, keyin bolalar (children) render qilinadi.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { LogIn, Shield } from "lucide-react";
import { cn, sanitizeInput } from "@/lib/utils";
import { uz } from "@/lib/uz";
import {
  fetchCurrentUser,
  login,
  register,
  type AuthUser,
} from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function AuthGuard({ children }: AuthGuardProps) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      setReady(true);
    });
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
    const v = validate();
    if (v) return setError(v);
    setLoading(true);
    const cleanName = sanitizeInput(name, 32);
    const cleanEmail = email.trim().toLowerCase();
    const res = mode === "login" ? await login(cleanEmail, password) : await register(cleanEmail, password, cleanName);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || (mode === "login" ? uz.auth.loginError : uz.auth.registerError));
      return;
    }
    if (res.user) setUser(res.user);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-md rounded-3xl border border-sand-200 bg-white p-8 shadow-lift"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-h2 font-bold text-ink-900">{uz.auth.title}</h1>
          <p className="mt-1 text-body-sm text-ink-600">
            O'yinni boshlash uchun tizimga kiring yoki ro'yxatdan o'ting.
          </p>
        </div>

        <div className="mb-6 inline-flex w-full justify-center rounded-xl bg-sand-100 p-1">
          <button
            onClick={() => setMode("login")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              mode === "login" ? "bg-emerald-700 text-white" : "text-ink-600 hover:bg-sand-200"
            )}
          >
            {uz.auth.loginTab}
          </button>
          <button
            onClick={() => setMode("register")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              mode === "register" ? "bg-emerald-700 text-white" : "text-ink-600 hover:bg-sand-200"
            )}
          >
            {uz.auth.registerTab}
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-body-sm font-medium text-ink-700">{uz.auth.email}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-ink-900 outline-none focus:border-emerald-600"
              required
            />
          </label>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-700">{uz.auth.password}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-ink-900 outline-none focus:border-emerald-600"
              required
              minLength={6}
            />
          </label>
          {mode === "register" && (
            <label className="block">
              <span className="text-body-sm font-medium text-ink-700">{uz.auth.name}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-ink-900 outline-none focus:border-emerald-600"
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

        {error && <p className="mt-4 rounded-xl bg-clay-100 px-4 py-3 text-body-sm text-clay-600">{error}</p>}

        <p className="mt-6 text-center text-body-sm text-ink-500">
          <Link to="/" className="text-emerald-700 hover:underline">← Bosh sahifaga qaytish</Link>
        </p>
      </motion.div>
    </div>
  );
}
