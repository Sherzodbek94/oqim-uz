// OQIM Hayot: independent rules, data and save format. No classic-engine imports.
export type Sector = 'trade' | 'production' | 'service';
export type Role = 'employee' | 'freelancer' | 'owner';
export type Place = 'home' | 'office' | 'market' | 'factory' | 'studio' | 'bank' | 'school';
export interface Business { sector: Sector; level: number; manager: boolean; efficiency: number; boost: number }
export interface Loan { principal: number; months: number }
export interface Entry { month: number; text: string; amount?: number }
export interface State {
  version: 1; role: Role; month: number; actions: number; cash: number; salary: number; living: number;
  energy: number; skill: number; businesses: Business[]; rentals: number; loan: Loan | null;
  demand: number; event: string | null; rng: number; log: Entry[]; freedomMonths: number; status: 'playing' | 'won' | 'lost';
}
export const SAVE_KEY = 'oqim-life-independent-v1';
export const money = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n)).replace(/,/g, ' ');
export const SECTORS = {
  trade: { name: 'Mahalla do‘koni', place: 'market', price: 35_000_000, capacity: 300, unit: 'savdo', sell: 120_000, variable: 75_000, rent: 2_000_000, wages: 3_000_000, other: 1_000_000, manager: 1_500_000, input: 'Tovar xaridi', scene: 1 },
  production: { name: 'Nonvoyxona', place: 'factory', price: 45_000_000, capacity: 4000, unit: 'dona non', sell: 7000, variable: 3500, rent: 1_500_000, wages: 4_000_000, other: 1_000_000, manager: 1_500_000, input: 'Un va xomashyo', scene: 11 },
  service: { name: 'Dizayn studiyasi', place: 'studio', price: 16_000_000, capacity: 20, unit: 'buyurtma', sell: 600_000, variable: 100_000, rent: 1_000_000, wages: 2_000_000, other: 500_000, manager: 1_200_000, input: 'Buyurtma xarajati', scene: 3 },
} as const;
export const ROLES = {
  employee: { title: 'Yollanma ishchi', description: 'Barqaror maosh. Kichik zaxiradan birinchi aktivgacha.', salary: 4_500_000, cash: 9_000_000, living: 3_000_000, image: '/avatar-programmer.png' },
  freelancer: { title: 'Mustaqil mutaxassis', description: 'O‘z studiyangiz bor. Buyurtma va vaqtingizni boshqaring.', salary: 0, cash: 12_000_000, living: 3_000_000, image: '/avatar-teacher.png' },
  owner: { title: 'Biznes egasi', description: 'Tayyor do‘kon. Jamoa, savdo va kengayish qarorlari.', salary: 0, cash: 20_000_000, living: 4_000_000, image: '/avatar-trader.png' },
} as const;
export function start(role: Role): State {
  const r = ROLES[role];
  return { version: 1, role, month: 1, actions: 4, cash: r.cash, salary: r.salary, living: r.living, energy: 80, skill: 0,
    businesses: role === 'employee' ? [] : [{sector: role === 'owner' ? 'trade' : 'service', level: 1, manager: false, efficiency: 0, boost: 0}],
    rentals: 0, loan: null, demand: 100, event: null, rng: 13491, log: [{month: 1, text: 'Yangi hayotingiz boshlandi.'}], freedomMonths: 0, status: 'playing' };
}
export function economics(s: State, b: Business) {
  const d = SECTORS[b.sector];
  const capacity = Math.round(d.capacity * (1 + (b.level - 1) * .45));
  const productivity = b.manager ? 1 : s.energy < 25 ? .65 : 1;
  const units = Math.round(capacity * Math.min(1, Math.max(.4, (s.demand + b.boost - 10) / 100)) * productivity);
  const revenue = units * d.sell;
  const variable = Math.round(units * d.variable * (1 - b.efficiency * .04));
  const rent = d.rent; const wages = Math.round(d.wages * (1 + (b.level - 1) * .3));
  const other = d.other; const manager = b.manager ? d.manager : 0;
  const profit = revenue - variable - rent - wages - other - manager;
  return {capacity, units, revenue, variable, rent, wages, other, manager, profit};
}
export function finances(s: State) {
  const business = s.businesses.reduce((v,b)=>v+economics(s,b).profit,0);
  const passive = s.rentals * 1_400_000 + s.businesses.filter(b=>b.manager).reduce((v,b)=>v+economics(s,b).profit,0);
  const rent = s.rentals * 1_400_000;
  const interest = s.loan ? Math.round(s.loan.principal * .02) : 0;
  const repayment = s.loan ? Math.ceil(s.loan.principal / s.loan.months) : 0;
  const debtPayment = interest + repayment;
  const expense = s.living + debtPayment;
  const income = s.salary + business + rent;
  return {business, passive, rent, interest, repayment, debtPayment, expense, income, flow: income - expense};
}
type Choice = { label: string; detail: string; cost: number; energy?: number; skill?: number; boost?: number };
export const EVENTS: Record<string, {title: string; body: string; scene: number; choices: Choice[]}> = {
  health: {title: 'Sog‘liqni ortga surmang', body: 'Tekshiruvga borish yoki hozircha uyda dam olishni tanlang.', scene: 6, choices: [{label: 'Shifokorga borish',detail: 'Naqd −600 000 · quvvat +20',cost: 600_000,energy: 20},{label: 'Uyda dam olish',detail: 'Pul sarflanmaydi · quvvat +5',cost: 0,energy: 5}]},
  family: {title: 'Oilaviy dam olish', body: 'Yaqinlaringiz bilan vaqt o‘tkazish ham hayotingizning bir qismi.',scene: 8,choices:[{label:'Birga sayohat',detail:'Naqd −500 000 · quvvat +25',cost:500_000,energy:25},{label:'Bog‘da sayr',detail:'Bepul · quvvat +10',cost:0,energy:10}]},
  employee: {title: 'Yangi loyiha taklifi',body:'Ish beruvchi qo‘shimcha vazifa taklif qildi. Daromad ko‘payadi, lekin dam olishga kamroq vaqt qoladi.',scene:0,choices:[{label:'Vazifani olish',detail:'Naqd +800 000 · quvvat −15',cost:-800_000,energy:-15},{label:'Asosiy ishga e’tibor',detail:'Naqd o‘zgarmaydi · quvvat +5',cost:0,energy:5}]},
  trade: {title:'Yetkazib beruvchi aksiyasi',body:'Do‘kon mahsulotlarini tanitish uchun yetkazib beruvchi bilan qo‘shma aksiya qilish mumkin.',scene:1,choices:[{label:'Aksiyani boshlash',detail:'Naqd −400 000 · shu oy talab +15%',cost:400_000,boost:15},{label:'Oddiy savdoni davom ettirish',detail:'Qo‘shimcha xarajat yo‘q',cost:0}]},
  production: {title:'Yangi partiya uchun buyurtma',body:'Mahalliy kafe nonvoyxonangizdan mahsulot olmoqchi. Namuna va yetkazib berishni tashkil etish kerak.',scene:11,choices:[{label:'Namuna yuborish',detail:'Naqd −300 000 · shu oy talab +15%',cost:300_000,boost:15},{label:'Hozirgi mijozlarni saqlash',detail:'Qo‘shimcha xarajat yo‘q',cost:0}]},
  service: {title:'Mijoz tavsiyasi',body:'Eski mijoz sizni hamkoriga tavsiya qildi. Uchrashuv uchun vaqt ajratsangiz, yangi buyurtmalar keladi.',scene:3,choices:[{label:'Uchrashuvga borish',detail:'Quvvat −10 · shu oy talab +15%',cost:0,energy:-10,boost:15},{label:'Mavjud ishlarni yakunlash',detail:'Quvvat +5',cost:0,energy:5}]},
};
export type Action = {type:'work'|'rest'|'learn'|'loan'|'repay'|'rent'|'month'} | {type:'buy'|'expand'|'manager'|'market'|'improve'|'sell';sector:Sector} | {type:'event';choice:number};
export function quote(s: State, a: Action): {cost:number;label:string;reason:string|null} {
  const b = 'sector' in a ? s.businesses.find(x=>x.sector===a.sector) : undefined;
  const d = 'sector' in a ? SECTORS[a.sector] : undefined;
  let cost=0,label='Davom etish',reason:string|null=null;
  switch(a.type) {
    case 'work': cost=-600_000;label='Qo‘shimcha ish';if(s.energy<20)reason='Avval dam oling: kamida 20 quvvat kerak.';break;
    case 'rest': label='Dam olish';break;
    case 'learn': cost=400_000;label='Amaliy kurs';if(s.skill>=5)reason='Barcha kurslar tugallangan.';break;
    case 'loan': cost=-10_000_000;label='10 mln kredit olish';if(s.loan)reason='Avval mavjud kreditni yoping.';break;
    case 'repay': cost=s.loan?.principal??0;label='Kreditni to‘liq yopish';if(!s.loan)reason='Qarzingiz yo‘q.';break;
    case 'rent': cost=28_000_000;label='Ijara aktivi sotib olish';if(s.rentals>=5)reason='Bu shaharchadagi 5 ta ijara joyi sizniki.';break;
    case 'buy': cost=d!.price;label='Biznesni sotib olish';if(b)reason='Bu biznes allaqachon sizniki.';break;
    case 'expand': cost=Math.round(d!.price*.4);label='Biznesni kengaytirish';if(!b)reason='Avval biznesni sotib oling.';else if(b.level>=3)reason='Maksimal hajmga yetdingiz.';break;
    case 'manager': label='Boshqaruvchi yollash';if(!b)reason='Avval biznesni sotib oling.';else if(b.manager)reason='Boshqaruvchi ishlayapti.';break;
    case 'market': cost=500_000;label='Mijozlarni jalb qilish';if(!b)reason='Avval biznesni sotib oling.';else if(b.boost>=20)reason='Bu oygi reklama yetarli.';break;
    case 'improve': cost=800_000;label='Jarayonni yaxshilash';if(!b)reason='Avval biznesni sotib oling.';else if(b.efficiency>=3)reason='Jarayon optimallashtirilgan.';else if(s.skill<1)reason='Avval bitta amaliy kursni tugating.';break;
    case 'sell': label='Biznesni sotish';cost=b?-Math.round(d!.price*(1+(b.level-1)*.4)*.65):0;if(!b)reason='Sotiladigan biznes yo‘q.';break;
    case 'month':label='Oyni yakunlash';if(s.actions>0)reason='Avval qolgan haftalar uchun qaror qiling.';break;
    case 'event': {const c=s.event?EVENTS[s.event]?.choices[a.choice]:undefined;if(!c)reason='Bu qaror mavjud emas.';else {cost=c.cost;label=c.label;}break;}
  }
  if(s.status!=='playing')reason='O‘yin yakunlangan.';
  if(s.event&&a.type!=='event')reason='Avval joriy voqea bo‘yicha qaror qiling.';
  if(!s.event&&a.type==='event')reason='Joriy voqea yo‘q.';
  if(a.type!=='event'&&a.type!=='month'&&s.actions<=0)reason='Oyni yakunlang.';
  if(cost>0&&s.cash<cost)reason='Naqd pul yetarli emas.';
  return {cost,label,reason};
}
function record(s:State,text:string,amount?:number){s.log=[{month:s.month,text,amount},...s.log].slice(0,60);}
function random(s:State){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
export function act(previous: State, a: Action): State {
  const q=quote(previous,a);if(q.reason)return previous;
  const s=structuredClone(previous);
  if(a.type==='month') {
    const f=finances(s);s.cash+=f.flow;
    record(s,`Oy yakuni: daromad ${money(f.income)}, yashash va kredit ${money(f.expense)}.`,f.flow);
    if(s.loan){s.loan.principal=Math.max(0,s.loan.principal-f.repayment);s.loan.months--;if(s.loan.principal===0)s.loan=null;}
    s.freedomMonths=f.passive>=f.expense&&s.cash>=f.expense*3?s.freedomMonths+1:0;
    if(s.freedomMonths>=3)s.status='won';else if(s.cash<0)s.status='lost';
    s.month++;s.actions=4;s.energy=Math.min(100,s.energy+10);s.demand=80+Math.floor(random(s)*31);
    s.businesses.forEach(b=>{b.boost=0;});return s;
  }
  s.cash-=q.cost;
  if(a.type==='event') {
    const c=EVENTS[s.event!].choices[a.choice];
    s.energy=Math.max(0,Math.min(100,s.energy+(c.energy??0)));s.skill+=c.skill??0;
    if(c.boost)s.businesses.forEach(b=>{if(b.sector===s.event)b.boost+=c.boost!;});
    s.event=null;record(s,q.label,-q.cost);return s;
  }
  const b='sector' in a?s.businesses.find(x=>x.sector===a.sector):undefined;
  switch(a.type){
    case 'work':s.energy-=15;break;
    case 'rest':s.energy=Math.min(100,s.energy+30);break;
    case 'learn':s.skill++;s.salary+=s.role==='employee'?250_000:0;break;
    case 'loan':s.loan={principal:10_000_000,months:12};break;
    case 'repay':s.loan=null;break;
    case 'rent':s.rentals++;break;
    case 'buy':s.businesses.push({sector:a.sector,level:1,manager:false,efficiency:0,boost:0});break;
    case 'expand':b!.level++;break;
    case 'manager':b!.manager=true;break;
    case 'market':b!.boost+=20;break;
    case 'improve':b!.efficiency++;break;
    case 'sell':s.businesses=s.businesses.filter(x=>x.sector!==a.sector);break;
  }
  s.actions--;record(s,q.label,-q.cost);
  if(s.actions===2){const n=random(s);s.event=n<.3?'health':n<.5?'family':s.businesses.length?s.businesses[Math.floor(random(s)*s.businesses.length)].sector:'employee';}
  return s;
}
export function readSave(raw: string|null): State|null {
  if(!raw)return null;
  try{const s=JSON.parse(raw) as State;
    const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
    if(s.version!==1||!Object.hasOwn(ROLES,s.role)||!['playing','won','lost'].includes(s.status))return null;
    if(!['month','actions','cash','salary','living','energy','skill','rentals','demand','rng','freedomMonths'].every(k=>finite(s[k as keyof State])))return null;
    if(!Number.isInteger(s.month)||s.month<1||!Number.isInteger(s.actions)||s.actions<0||s.actions>4||s.energy<0||s.energy>100||s.skill<0||s.skill>5||s.rentals<0||s.rentals>5)return null;
    if(s.event!==null&&!Object.hasOwn(EVENTS,s.event))return null;
    if(!Array.isArray(s.businesses)||s.businesses.length>3||new Set(s.businesses.map(b=>b.sector)).size!==s.businesses.length)return null;
    if(s.businesses.some(b=>!Object.hasOwn(SECTORS,b.sector)||!Number.isInteger(b.level)||b.level<1||b.level>3||typeof b.manager!=='boolean'||!finite(b.efficiency)||b.efficiency<0||b.efficiency>3||!finite(b.boost)))return null;
    if(s.loan!==null&&(!finite(s.loan.principal)||s.loan.principal<=0||!Number.isInteger(s.loan.months)||s.loan.months<1||s.loan.months>12))return null;
    if(!Array.isArray(s.log)||s.log.length>60||s.log.some(e=>typeof e.text!=='string'||!finite(e.month)||(e.amount!==undefined&&!finite(e.amount))))return null;
    return s;
  }catch{return null;}
}
