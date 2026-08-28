import { useCallback, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Hero from "./rules/Hero";
import Goal from "./rules/Goal";
import BoardLegend from "./rules/BoardLegend";
import Stages from "./rules/Stages";
import StatementSection from "./rules/StatementSection";
import EscapeMath from "./rules/EscapeMath";
import Glossary from "./rules/Glossary";
import Strategies from "./rules/Strategies";
import FastTrackSection from "./rules/FastTrackSection";
import Bankruptcy from "./rules/Bankruptcy";
import UzbekContext from "./rules/UzbekContext";
import Quiz from "./rules/Quiz";
import Faq from "./rules/Faq";
import PathMode from "./rules/PathMode";
import FinalCta from "./rules/FinalCta";
import { TocDesktop, TocMobile } from "./rules/Toc";
import { TOC } from "./rules/data";

/**
 * Qoidalar sahifasi `/rules` (rules.md) — how-to-play guide + financial
 * literacy academy. Long-form page: sticky scrollspy TOC (desktop) /
 * top pill + bottom sheet (mobile), 12 sections, final CTA band.
 * Wrapped by Layout (Navbar + Footer) via nested route.
 */
export default function Rules() {
  const [active, setActive] = useState<string>(TOC[0].id);
  const lenisRef = useRef<Lenis | null>(null);

  // Lenis smooth scroll (disabled under prefers-reduced-motion)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11 });
    lenisRef.current = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Scrollspy — IntersectionObserver over s1…s12
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );
    for (const item of TOC) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: -88, duration: 1.1 });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <>
      <Hero onScrollToConcepts={() => scrollTo("s6")} />

      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <TocMobile active={active} onNavigate={scrollTo} />

        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
          <TocDesktop active={active} onNavigate={scrollTo} />

          <div className="max-w-[760px]">
            <section id="s1" className="scroll-mt-28 py-16 md:py-24">
              <Goal />
            </section>

            <SectionDivider />

            <section id="s2" className="scroll-mt-28 py-16 md:py-24">
              <BoardLegend />
            </section>

            <SectionDivider />

            <section id="s3" className="scroll-mt-28 py-16 md:py-24">
              <Stages />
            </section>

            <SectionDivider />

            <section id="s4" className="scroll-mt-28 py-16 md:py-24">
              <StatementSection />
            </section>

            <SectionDivider />

            <section id="s5" className="scroll-mt-28 py-16 md:py-24">
              <EscapeMath />
            </section>

            <SectionDivider />

            <section id="s6" className="scroll-mt-28 py-16 md:py-24">
              <Glossary />
            </section>

            <SectionDivider />

            <section id="s7" className="scroll-mt-28 py-16 md:py-24">
              <Strategies />
            </section>

            <section id="s8" className="scroll-mt-28 py-16 md:py-24">
              <FastTrackSection />
            </section>

            <section id="s9" className="scroll-mt-28 pb-16 pt-4 md:pb-24 md:pt-8">
              <Bankruptcy />
            </section>

            <SectionDivider />

            <section id="s10" className="scroll-mt-28 py-16 md:py-24">
              <UzbekContext />
            </section>

            <SectionDivider />

            <section id="s11" className="scroll-mt-28 py-16 md:py-24">
              <Quiz />
            </section>

            <SectionDivider />

            <section id="s12" className="scroll-mt-28 py-16 md:py-24">
              <Faq />
            </section>

            <SectionDivider />

            <section id="s13" className="scroll-mt-28 py-16 md:py-24">
              <PathMode />
            </section>
          </div>
        </div>
      </div>

      <FinalCta />
    </>
  );
}

/** Suzani strip divider between sections (emerald, low opacity). */
function SectionDivider() {
  return (
    <div
      aria-hidden
      className="h-6 w-full text-emerald-600 opacity-[0.12]"
      style={{
        backgroundImage: "url(/border-suzani.svg)",
        backgroundRepeat: "repeat-x",
        backgroundSize: "480px 24px",
      }}
    />
  );
}
