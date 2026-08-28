import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { GLOSSARY } from "./data";
import { Accordion, SectionHead } from "./ui";

/**
 * §6 Moliyaviy savodxonlik lug'ati — accordion, one open at a time,
 * deep-linkable (#roi), first item auto-opens on scroll into view.
 */
export default function Glossary() {
  const [openId, setOpenId] = useState<string | null>(null);
  const autoOpened = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, margin: "-20% 0px" });

  // deep-link: open the item matching location.hash (e.g. #roi)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      autoOpened.current = true;
      setOpenId(hash);
      const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
      return () => clearTimeout(t);
    }
  }, []);

  // invite interaction: auto-open the first term 400ms after scrolling into view
  useEffect(() => {
    if (!inView || autoOpened.current) return;
    const t = setTimeout(() => {
      if (!autoOpened.current) setOpenId((cur) => cur ?? GLOSSARY[0].id);
    }, 400);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <div ref={wrapRef}>
      <SectionHead
        eyebrow="06 · LUG'AT"
        title="Moliyaviy savodxonlik lug'ati"
        sub="10 ta asosiy tushuncha — sodda o'zbek tilida, real so'm raqamlari bilan."
      />
      <div className="mt-8">
        <Accordion
          items={GLOSSARY.map((t) => ({
            id: t.id,
            header: (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <t.icon className="h-4 w-4" />
                </span>
                <span className="font-semibold text-ink-900">{t.term}</span>
              </>
            ),
            body: (
              <>
                <p>{t.body}</p>
                <p className="mt-2 rounded-lg bg-sand-100 px-3 py-2 font-medium text-ink-900">
                  {t.example}
                </p>
              </>
            ),
          }))}
          openId={openId}
          onOpen={(id) => {
            autoOpened.current = true;
            setOpenId(id);
          }}
        />
      </div>
    </div>
  );
}
