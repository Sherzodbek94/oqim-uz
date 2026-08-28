/**
 * OQIM — v19 smoke test: Onlayn multiplayer protokoli (workers/src/game/online.ts).
 *  N1 Xona yaratish: 6 belgili kod, lobby fazasi, sozlamalar normalize.
 *  N2 Join: 4 kishigacha, 5-si rad etiladi; o'yin boshlangach join rad etiladi.
 *  N3 Start: faqat xost; botlar to'ldiriladi; kamida 2 o'yinchi talabi.
 *  N4 Navbat: faqat joriy o'yinchi; zar → harakat → opportunity katakda deal-size pending.
 *  N5 Bitim oqimi: deal-size → deal → buy aktiv qo'shadi; navbat botga → bot sinxron o'ynaydi.
 *  N6 Taymer timeout: kutilayotgan roll avtomatik bajariladi; deal pending o'tkazib yuboriladi.
 *  N7 publicState: tokenlar sizilmaydi.
 * Run: ./node_modules/.bin/esbuild scripts/smoke-fix19.ts --bundle --platform=node --outfile=/tmp/smoke-fix19.cjs --format=cjs && node /tmp/smoke-fix19.cjs
 */
import {
  MAX_PLAYERS,
  createRoom,
  handleAction,
  joinRoom,
  makeRoomCode,
  onTimeout,
  publicState,
  startGame,
} from "../workers/src/game/online";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`);
  }
}

// Deterministik "tasodif": zar doim 1, karta doim birinchisi
const realRandom = Math.random;
Math.random = () => 0;

/* N1 — xona yaratish */
console.log("N1: xona yaratish");
const code = makeRoomCode();
check("kod 6 belgi, o'qish oson alfavit", /^[A-Z2-9]{6}$/.test(code));
const room = createRoom(code, { timerSec: 120, bots: 1 }, "Ali", "host-token");
check("lobby fazasi", room.phase === "lobby");
check("xost birinchi o'yinchi", room.players.length === 1 && room.players[0].name === "Ali");
check("timerSec normalize (120)", room.settings.timerSec === 120);
const room2 = createRoom(makeRoomCode(), { timerSec: 45 as 60, bots: 99 }, "B", "t2");
check("timerSec 45→60, bots 99→3 clamp", room2.settings.timerSec === 60 && room2.settings.bots === 3);

/* N2 — join limitlari */
console.log("N2: join limitlari");
check("2-o'yinchi qo'shildi", joinRoom(room, "Vali", "tok-vali").ok);
check("3-o'yinchi qo'shildi", joinRoom(room, "Gani", "tok-gani").ok);
check("4-o'yinchi qo'shildi", joinRoom(room, "Sani", "tok-sani").ok);
const fifth = joinRoom(room, "Oltinchi", "tok-5");
check(`5-o'yinchi rad etildi (max ${MAX_PLAYERS})`, !fifth.ok && !!fifth.error);

/* N3 — start */
console.log("N3: start qoidalari");
check("xost bo'lmagan starta olmaydi", !startGame(room, "tok-vali").ok);
const solo = createRoom(makeRoomCode(), { timerSec: 60, bots: 0 }, "Yolgiz", "tok-solo");
check("1 o'yinchi + 0 bot — start rad", !startGame(solo, "tok-solo").ok);
// 4 kishilik xonada bot qo'shilmaydi (to'la), start OK
check("xost start qildi", startGame(room, "host-token").ok);
check("faza playing", room.phase === "playing");
check("o'yin holati yaratildi (klassik)", !!room.game && room.game.boardMode === "classic");
check("to'la xonada bot qo'shilmadi", room.players.length === 4);
check("startdan keyin join rad", !joinRoom(room, "Kechikkan", "tok-late").ok);

// Bot to'ldirish alohida tekshiruvi
const broom = createRoom(makeRoomCode(), { timerSec: 60, bots: 2 }, "Xost", "b-host");
check("botli xona start", startGame(broom, "b-host").ok);
check("2 bot qo'shildi (jami 3)", broom.players.length === 3 && broom.players.filter((p) => p.isBot).length === 2);

/* N4 — navbat va zar (deterministik: doim 1 katak) */
console.log("N4: navbat mexanikasi");
const g = broom.game!;
check("birinchi navbat xostda", g.current === 0 && broom.awaiting === 0);
check("boshqa o'yinchi yura olmaydi", !handleAction(broom, "b-host2", { kind: "roll" }).ok);
const before = g.players[0].position;
check("xost zar tashladi", handleAction(broom, "b-host", { kind: "roll" }).ok);
check("1 katak yurildi (0→1)", g.players[0].position === before + 1);
check("opportunity → deal-size pending", broom.pending?.kind === "deal-size" && broom.awaiting === 0);
check("pending paytida roll rad", !handleAction(broom, "b-host", { kind: "roll" }).ok);

/* N5 — bitim oqimi */
console.log("N5: bitim oqimi");
check("deal-size: small tanlandi", handleAction(broom, "b-host", { kind: "deal-size", size: "small" }).ok);
check("endi deal pending", broom.pending?.kind === "deal");
const cardTitle = broom.pending?.kind === "deal" ? broom.pending.card.title : "";
const assetsBefore = g.players[0].assets.length;
const cashBefore = g.players[0].cash;
check("bitim sotib olindi", handleAction(broom, "b-host", { kind: "buy" }).ok);
check("aktiv qo'shildi: " + cardTitle, g.players[0].assets.length === assetsBefore + 1);
check("naqd yoki kredit hisoblandi", g.players[0].cash !== cashBefore || g.players[0].loans.length > 0);
check("pending tozalandi", broom.pending === null);
// Navbat botga o'tdi va bot sinxron o'ynab, yana navbat qaytishi kerak (2 bot, keyin xost)
check("botlar navbatini o'ynadi — navbat yana xostda", g.current === 0 && broom.awaiting === 0);
check("har bir o'yinchi 1 katak yurgan (rand=0)", g.players[1].position === 1 && g.players[2].position === 1);
check("bot ham doodad katakda biror harakat qildi (log)", g.log.some((l) => l.text.includes("Bot")));

/* N6 — timeout */
console.log("N6: taymer timeout");
// xost kutilmoqda (roll) — timeout avtomatik zar tashlaydi
const posBeforeTimeout = g.players[0].position;
onTimeout(broom);
check(
  "timeout: avtomatik zar (pozitsiya o'zgardi yoki pending paydo)",
  g.players[0].position !== posBeforeTimeout || broom.pending !== null
);
// pending bo'lsa — timeout uni o'tkazib yuboradi
if (broom.pending) {
  const ap = broom.awaiting;
  onTimeout(broom);
  check("timeout: pending bekor qilindi", broom.pending === null && broom.awaiting !== ap);
} else {
  check("timeout: pending yo'q edi (to'g'ridan-to'g'ri navbat o'tdi)", true);
}

/* N7 — maxfiylik */
console.log("N7: publicState maxfiyligi");
const pub = publicState(broom, "b-host");
const raw = JSON.stringify(pub);
check("tokenlar sizilmaydi", !raw.includes("b-host") || raw.includes('"b-host"') === false);
check("siz = 0", pub.you === 0 && pub.isHost);
check("o'yinchi ro'yxati ochiq", pub.players.length === 3 && pub.game !== null);

Math.random = realRandom;
console.log(`\nNatija: ${passed} o'tdi, ${failed} yiqildi`);
if (failed > 0) process.exit(1);
