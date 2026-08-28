import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { FAQ } from "./data";
import { Accordion, SectionHead } from "./ui";

/** §12 Ko'p so'raladigan savollar — accordion. */
export default function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <SectionHead eyebrow="12 · FAQ" title="Ko'p so'raladigan savollar" />
      <div className="mt-8">
        <Accordion
          items={FAQ.map((f, i) => ({
            id: `faq-${i}`,
            header: (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                  <MessageCircleQuestion className="h-4 w-4" />
                </span>
                <span className="font-semibold text-ink-900">{f.q}</span>
              </>
            ),
            body: <p>{f.a}</p>,
          }))}
          openId={openId}
          onOpen={setOpenId}
        />
      </div>
    </div>
  );
}
