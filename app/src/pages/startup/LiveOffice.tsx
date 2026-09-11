/**
 * Jonli ofis sahnasi — PROTOTIP, hozircha faqat 0-daraja (uy/garaj).
 *
 * NEGA SHU YO'L. Ofis renderlari oldindan chizilgan rasm, model emas —
 * ularni real vaqtda 3D qilish butun vizual tilni qaytadan qurish demakdi.
 * Ustiga three.js eng kam ishlatilishida ham 515 KB xom bo'lib, repodagi
 * 400 KB chunk chegarasiga sig'maydi (o'lchandi). Shuning uchun render FON
 * bo'lib qoladi va ustiga shaffof fonli personaj qo'yiladi: qo'shimcha
 * kutubxona nolga teng, harakat esa CSS va bitta taymerda.
 *
 * NIMA QILADI. Personaj yozadi (ikki kadr almashadi), vaqti-vaqti bilan
 * qahva ho'playdi yoki cho'zilib esnaydi. Tanaffus chastotasi KAYFIYATGA
 * bog'liq: kayfiyat past bo'lsa u ko'proq chalg'iydi va kamroq yozadi —
 * ya'ni harakat bezak emas, o'yin holatini ko'rsatadi.
 *
 * HARAKATNI KAMAYTIRISH so'ralgan bo'lsa (`prefers-reduced-motion`) taymer
 * umuman ishga tushmaydi va bitta tinch kadr qoladi. Bu shart emas, balki
 * zarur: sahna doimiy aylanadi, ya'ni vestibulyar sezgirligi bor odam uchun
 * uni to'xtatib bo'lmaydigan harakat bo'lardi.
 */
import { useEffect, useState } from "react";

type Poza = "type-a" | "type-b" | "coffee" | "stretch";

const SRC: Record<Poza, string> = {
  "type-a": "/startup/actors/founder-type-a.webp",
  "type-b": "/startup/actors/founder-type-b.webp",
  coffee: "/startup/actors/founder-coffee.webp",
  stretch: "/startup/actors/founder-stretch.webp",
};

/*
 * Personajning fon ichidagi o'rni — foizda, chunki sahna ekran eniga qarab
 * cho'ziladi. Raqamlar 1168x880 asl renderdagi stul ustida o'lchangan.
 *
 * POZALAR TANA LANGARI bo'yicha tekislangan, chegara markazi bo'yicha emas.
 * Avval markaz olingandi va cho'zilish pozasida qo'llar yuqoriga ketgani
 * uchun chegara siljib, personaj stuldan 26 px yon tomonga sakrardi —
 * «stul boshqa tomonda, harakat boshqa tomonda» ko'rinardi. Langar — eng
 * pastki qatorlar (oyoqlar) markazi, u har qanday pozada joyida qoladi.
 */
const O_RIN = { left: "30.94%", top: "41.62%", width: "17.66%" };

/** Yozish kadri necha ms; tanaffus oralig'i va davomiyligi. */
const YOZISH_KADR = 620;

export default function LiveOffice({ morale, className }: { morale: number; className?: string }) {
  const [poza, setPoza] = useState<Poza>("type-a");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let t: ReturnType<typeof setTimeout>;
    let yozilgan = 0;
    /*
     * Kayfiyat 100 da ~20 kadr yozib bir tanaffus, 0 da ~6 kadr. Ya'ni
     * charchagan xodim ekranda ham tez-tez chalg'iydi.
     */
    const kadrTanaffusgacha = () => Math.round(6 + (morale / 100) * 14);

    const keyingi = (p: Poza) => {
      setPoza(p);
      const kut = p === "coffee" ? 2400 : p === "stretch" ? 1800 : YOZISH_KADR;
      t = setTimeout(() => {
        if (p === "coffee" || p === "stretch") { yozilgan = 0; keyingi("type-a"); return; }
        yozilgan++;
        if (yozilgan >= kadrTanaffusgacha()) keyingi(Math.random() < 0.5 ? "coffee" : "stretch");
        else keyingi(p === "type-a" ? "type-b" : "type-a");
      }, kut);
    };
    keyingi("type-a");
    return () => clearTimeout(t);
  }, [morale]);

  return (
    <div className={className} style={{ position: "relative" }}>
      <img
        src="/startup/office/level0-empty.webp"
        alt="Uy/garaj: stol, noutbuk, matras, deraza ortida Toshkent hovlisi"
        width={720}
        height={542}
        loading="eager"
        decoding="async"
        /* Tabiiy nisbat: `aspect-[4/3]` + `object-contain` rasmni quti ichida
           letterbox qilardi va foizlar rasmga emas, QUTIGA tushardi. */
        className="block w-full"
      />
      {/*
        `alt=""`: xodim soni va kayfiyat sahna USTIDA matn bilan yozilgan,
        ya'ni bu rasm ekran o'quvchi uchun takror.
      */}
      <img
        src={SRC[poza]}
        alt=""
        width={200}
        height={306}
        loading="eager"
        decoding="async"
        style={{ position: "absolute", ...O_RIN }}
        className="pointer-events-none select-none"
      />
    </div>
  );
}
