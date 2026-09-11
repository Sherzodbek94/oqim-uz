/**
 * Jonli ofis sahnasi — PROTOTIP, hozircha faqat 0-daraja (uy/garaj).
 *
 * NEGA RENDER FON BO'LIB QOLDI. Ofis rasmlari oldindan chizilgan, model
 * emas; three.js eng kam ishlatilishida ham 515 KB xom bo'lib, repodagi
 * 400 KB chunk chegarasiga sig'maydi (o'lchandi). Xonani video qilishga
 * ikki marta urinildi — Seedance ham, Kling ham (pro rejim, boshlang'ich
 * va yakuniy kadr bir xil berilgan holda ham) kamerani diorama atrofida
 * AYLANTIRDI va xonani har kadrda qaytadan chizdi. Shuning uchun xona
 * qimirlamaydigan rasm, harakat esa faqat personajda.
 *
 * PERSONAJ — 16 KADRLI SPRITE VARAQ. U alohida yasalgan videodan olingan:
 * tekis fonda yolg'iz personaj animatsiya qilinganda aylantiradigan
 * diorama bo'lmaydi va kadr qulf turadi. O'lchov buni tasdiqladi —
 * hamma kadrda bo'y 605 px, oyoq markazi 295.1–295.2 px, ya'ni siljish
 * yo'q. Fon qora matte bo'lib kelgani uchun (MP4 alfa saqlamaydi)
 * CHEKKADAN TO'LDIRISH bilan ajratildi: oddiy qora-kalit ichkaridagi qora
 * sochni ham teshib o'tardi.
 *
 * NEGA BITTA VARAQ VA `steps()`. O'n olti alohida `<img>` almashtirilsa,
 * brauzer har kadrni alohida dekod qilardi va birinchi siklda miltillash
 * berardi. Varaq bir marta yuklanadi, `background-position` esa
 * kompozitor darajasida siljiydi.
 *
 * KAYFIYAT tezlikka bog'langan: charchagan xodim sekinroq yozadi. Harakat
 * bezak emas — sahna o'yin holatini ko'rsatadi.
 *
 * HARAKATNI KAMAYTIRISH `index.css` dagi umumiy `prefers-reduced-motion`
 * bloki bilan to'xtaydi (u `animation-duration` ni 0.01 ms ga tushiradi va
 * takrorni bittaga qisqartiradi), shuning uchun bu yerda alohida qorovul
 * yo'q. Sahna to'xtovsiz aylanadi, ya'ni uni to'xtata olish shart.
 */

/*
 * Personajning fon ichidagi o'rni — foizda, chunki sahna ekran eniga qarab
 * cho'ziladi. Raqamlar 1168x880 asl renderdagi stul ustida o'lchangan va
 * sprite varaqning OYOQ LANGARI bo'yicha hisoblangan.
 */
const O_RIN = { left: "31.68%", top: "42.95%", width: "12.26%" };

/** Varaqdagi kadrlar soni va bitta kadrning nisbati. */
const KADR = 16;
const NISBAT = "190 / 398";

export default function LiveOffice({ morale, className }: { morale: number; className?: string }) {
  /* Kayfiyat 100 -> 1.4 s sikl, 0 -> 2.6 s. */
  const sikl = 2.6 - (Math.max(0, Math.min(100, morale)) / 100) * 1.2;

  return (
    <div className={className} style={{ position: "relative" }}>
      <img
        src="/startup/office/level0-empty.webp"
        alt="Uy/garaj: stol, noutbuk, matras, deraza ortida Toshkent hovlisi"
        width={720}
        height={542}
        loading="eager"
        decoding="async"
        className="block w-full"
      />
      {/*
        `aria-hidden`: xodim soni va kayfiyat sahna USTIDA matn bilan
        yozilgan, ya'ni bu ekran o'quvchi uchun takror.
      */}
      <div
        aria-hidden="true"
        className="oq-actor oq-actor-work pointer-events-none"
        style={{
          position: "absolute",
          ...O_RIN,
          aspectRatio: NISBAT,
          backgroundImage: "url(/startup/actors/founder-work.webp)",
          backgroundSize: `${KADR * 100}% 100%`,
          animationDuration: `${sikl.toFixed(2)}s`,
        }}
      />
    </div>
  );
}
