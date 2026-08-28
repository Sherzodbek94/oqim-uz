import { Link } from "react-router";
import { Github, Send, Youtube } from "lucide-react";
import { uz } from "@/lib/uz";
import { APP_VERSION } from "@/lib/version";

/**
 * Footer (design.md §9.2) — light sand-100 band with suzani border strip on top.
 */
export default function Footer() {
  return (
    <footer className="relative bg-sand-100">
      {/* suzani strip on top edge, emerald 10% */}
      <div
        aria-hidden
        className="h-6 w-full text-emerald-600 opacity-10"
        style={{
          backgroundImage: "url(/border-suzani.svg)",
          backgroundRepeat: "repeat-x",
          backgroundSize: "480px 24px",
        }}
      />
      <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/oqim-logo.png" alt="OQIM" className="h-8 w-8 rounded" />
              <span className="font-display text-lg font-bold text-ink-900">
                OQ<span className="text-emerald-600">IM</span>
              </span>
            </Link>
            <p className="mt-3 text-body-sm text-ink-600">{uz.app.tagline}</p>
          </div>

          {/* Pages */}
          <div>
            <h4 className="text-h4">{uz.footer.pages}</h4>
            <ul className="mt-3 space-y-2 text-body-sm">
              <li><Link className="text-ink-600 hover:text-emerald-600" to="/">{uz.nav.home}</Link></li>
              <li><Link className="text-ink-600 hover:text-emerald-600" to="/game">{uz.nav.game}</Link></li>
              <li><Link className="text-ink-600 hover:text-emerald-600" to="/rules">{uz.nav.rules}</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-h4">{uz.footer.about}</h4>
            <p className="mt-3 text-body-sm text-ink-600">{uz.footer.aboutText}</p>
            <p className="mt-2 text-caption text-ink-400">{uz.app.disclaimer}</p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-h4">{uz.footer.contact}</h4>
            <div className="mt-3 flex gap-3">
              {[Send, Youtube, Github].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-600 shadow-card transition-colors hover:text-emerald-600"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 pt-6">
          <p className="text-body-sm text-ink-400">{uz.app.copyright}</p>
          <span className="chip bg-gold-100 text-gold-600">OQIM v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
