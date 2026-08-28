# OQIM v19 — Onlayn multiplayer (Cloudflare Workers + Durable Objects)

## Maqsad
2–4 real o'yinchi xona kodi orqali tarmoqda o'ynaydi; navbat taymeri server-side;
o'yin dvijogi (engine.ts) serverda ham ishlaydi (soxtalikka qarshi).
Deploy — foydalanuvchi o'z Cloudflare akkauntiga `wrangler deploy` bilan qiladi
(bizda akkaunt yo'q, shuning uchun kod + yo'riqnoma yetkaziladi).

## Stage 1 — Worker (server)
- `workers/` papka: wrangler.toml, GameRoom Durable Object klassi
- Protokol: HTTP create-join (room code) + WebSocket xabarlar (join/state/action/turn-timeout)
- Server authoritative: engine.ts ni import qilib navbatlarni serverda tekshiradi
- Taymer: 60/120 sek, WebSocket Hibernation, reconnect tokeni

## Stage 2 — Frontend
- "🌐 Onlayn o'yin" oqimi: xona yaratish / kod bilan kirish / lobby (2–4 o'yinchi)
- WebSocket klient (reconnect bilan), online rejimda botlar aralash mumkin
- Lokal rejim to'liq saqlanadi (offline fallback)

## Stage 3 — Tekshiruv va yetkazish
- smoke testlar (protokol, xona holati), build yashil, master merge
- DEPLOY.md yo'riqnomasi (wrangler login/deploy, Pages sozlash)
- website_version_manager bilan versiya
