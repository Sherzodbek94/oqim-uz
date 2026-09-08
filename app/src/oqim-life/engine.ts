// OQIM Hayot: independent rules, data and save format. No classic-engine imports.
import {SECTORS} from './catalog';
import {EVENTS} from './events';
export {SECTORS,EVENTS};
export type Sector = keyof typeof SECTORS;
export const MODEL = {turnoverTax:.04, monthlyInflation:.005, assetMonths:60} as const;
export type Role = 'employee' | 'freelancer' | 'owner';
export type Place = 'home' | 'office' | 'market' | 'factory' | 'studio' | 'bank' | 'school';
export interface Business { sector: Sector; level: number; manager: boolean; efficiency: number; boost: number; stock: number; stockValue:number; book:number; basis:number; receivable:number; payable:number; priceStep:number }
export interface Loan { principal: number; months: number }
export interface Entry { month: number; text: string; amount?: number }
export interface State {
  version: 2; role: Role; month: number; actions: number; cash: number; salary: number; living: number;
  energy: number; skill: number; businesses: Business[]; rentals: number; loan: Loan | null;
  demand: number; event: string | null; rng: number; log: Entry[]; freedomMonths: number; status: 'playing' | 'won' | 'lost'; recentEvents:string[]; eventTarget:Sector|null;
}
export const SAVE_KEY = 'oqim-life-independent-v1';
export const money = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n)).replace(/,/g, ' ');
export const ROLES = {
  employee: { title: 'Yollanma ishchi', description: 'Barqaror maosh. Kichik zaxiradan birinchi aktivgacha.', salary: 4_500_000, cash: 9_000_000, living: 3_000_000, image: '/avatar-programmer.png' },
  freelancer: { title: 'Mustaqil mutaxassis', description: 'O‘z studiyangiz bor. Buyurtma va vaqtingizni boshqaring.', salary: 0, cash: 12_000_000, living: 3_000_000, image: '/avatar-teacher.png' },
  owner: { title: 'Biznes egasi', description: 'Tayyor do‘kon. Jamoa, savdo va kengayish qarorlari.', salary: 0, cash: 20_000_000, living: 4_000_000, image: '/avatar-trader.png' },
} as const;
export function start(role: Role): State {
  const r = ROLES[role];
  return { version: 2, recentEvents:[], eventTarget:null, role, month: 1, actions: 4, cash: r.cash, salary: r.salary, living: r.living, energy: 80, skill: 0,
    businesses: role === 'employee' ? [] : [makeBusiness(role === 'owner' ? 'trade' : 'service')],
    rentals: 0, loan: null, demand: 100, event: null, rng: 13491, log: [{month: 1, text: 'Yangi hayotingiz boshlandi.'}], freedomMonths: 0, status: 'playing' };
}
export function makeBusiness(sector:Sector, legacy=false):Business {
  const d=SECTORS[sector];const stock=d.group==='service'||legacy?0:Math.min(d.capacity,Math.floor(d.price*.4/d.variable));
  return {sector,level:1,manager:false,efficiency:0,boost:0,stock,stockValue:stock*d.variable,book:d.price-stock*d.variable,basis:d.price-stock*d.variable,receivable:0,payable:0,priceStep:0};
}
export function economics(s:State,b:Business){
  const d=SECTORS[b.sector],inflation=Math.pow(1+MODEL.monthlyInflation,s.month-1);
  const capacity=Math.round(d.capacity*(1+(b.level-1)*.45));
  const productivity=b.manager?1:s.energy<25?.65:1;
  const units=Math.round(capacity*Math.min(1,Math.max(.25,(s.demand+b.boost-10-b.priceStep*5)/100))*productivity);
  const sell=Math.round(d.sell*(1+b.priceStep*.05)),unitCost=Math.round(d.variable*(1-b.efficiency*.04)*inflation);
  const revenue=units*sell,used=Math.min(b.stock,units),stockUsed=b.stock?Math.round(b.stockValue*used/b.stock):0;
  const purchase=(units-used)*unitCost,variable=stockUsed+purchase;
  const rent=Math.round(d.rent*inflation),wages=Math.round(d.wages*(1+(b.level-1)*.3)*inflation),other=Math.round(d.other*inflation),manager=b.manager?Math.round(d.manager*inflation):0;
  const tax=Math.round(revenue*MODEL.turnoverTax),depreciation=Math.min(b.book,Math.round(b.basis/MODEL.assetMonths));
  const overhead=rent+wages+other+manager;
  const profit=revenue-variable-overhead-tax-depreciation;
  const receivable=Math.round(revenue*d.credit),payable=Math.round(purchase*d.supplierCredit);
  const receipts=revenue-receivable+b.receivable,supplierPayment=purchase-payable+b.payable;
  const cashFlow=receipts-supplierPayment-overhead-tax;
  const contribution=sell*(1-MODEL.turnoverTax)-unitCost;
  const breakEven=contribution>0?Math.ceil((overhead+depreciation)/contribution):null;
  return {capacity,units,sell,unitCost,revenue,variable,purchase,stockUsed,rent,wages,other,manager,tax,depreciation,profit,receivable,payable,receipts,supplierPayment,cashFlow,breakEven,margin:revenue?profit/revenue*100:0,stockAfter:b.stock-used,stockValueAfter:b.stockValue-stockUsed};
}
export function finances(s:State){
  const accounts=s.businesses.map(b=>({b,e:economics(s,b)}));
  const business=accounts.reduce((v,{e})=>v+e.profit,0),businessCash=accounts.reduce((v,{e})=>v+e.cashFlow,0);
  const depreciation=accounts.reduce((v,{e})=>v+e.depreciation,0);
  const inventoryRelease=accounts.reduce((v,{e})=>v+e.stockUsed,0);
  const receivableChange=accounts.reduce((v,{b,e})=>v+e.receivable-b.receivable,0);
  const payableChange=accounts.reduce((v,{b,e})=>v+e.payable-b.payable,0);
  const rent=s.rentals*1_400_000;
  const passive=rent+accounts.filter(({b})=>b.manager).reduce((v,{e})=>v+Math.min(e.profit,e.cashFlow),0);
  const interest=s.loan?Math.round(s.loan.principal*.02):0,repayment=s.loan?Math.ceil(s.loan.principal/s.loan.months):0,debtPayment=interest+repayment;
  const expense=s.living+debtPayment,income=s.salary+business+rent;
  return {business,businessCash,depreciation,inventoryRelease,receivableChange,payableChange,passive,rent,interest,repayment,debtPayment,expense,income,flow:s.salary+businessCash+rent-expense};
}
export function eligibleEvents(s:State){
 const groups=new Set(s.businesses.map(b=>SECTORS[b.sector].group));
 return Object.keys(EVENTS).filter(id=>{const e=EVENTS[id];return s.month>=(e.minMonth??1)&&(e.scope==='common'||(e.scope==='employee'&&s.role==='employee')||groups.has(e.scope as 'trade'|'production'|'service'));});
}
export type Action = {type:'work'|'rest'|'learn'|'loan'|'repay'|'rent'|'month'} | {type:'buy'|'expand'|'manager'|'market'|'improve'|'sell'|'price';sector:Sector} | {type:'event';choice:number};
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
    case 'price': label='Sotuv narxini oshirish';if(!b)reason='Avval biznesni sotib oling.';else if(b.priceStep>=3)reason='Narx chegarasiga yetdingiz.';break;
    case 'sell': label='Biznesni sotish';cost=b?-(Math.round((b.book+b.stockValue)*.65)+b.receivable-b.payable):0;if(!b)reason='Sotiladigan biznes yo‘q.';break;
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
    s.businesses.forEach(b=>{const e=economics(s,b);b.stock=e.stockAfter;b.stockValue=e.stockValueAfter;b.book-=e.depreciation;b.receivable=e.receivable;b.payable=e.payable;});
    record(s,`Oy yakuni: sof daromad ${money(f.income)}, pul oqimi ${money(f.flow)}, yashash va kredit ${money(f.expense)}.`,f.flow);
    if(s.loan){s.loan.principal=Math.max(0,s.loan.principal-f.repayment);s.loan.months--;if(s.loan.principal===0)s.loan=null;}
    s.freedomMonths=f.passive>=f.expense&&s.cash>=f.expense*3?s.freedomMonths+1:0;
    if(s.freedomMonths>=3)s.status='won';else if(s.cash<0)s.status='lost';
    s.month++;s.living=Math.round(s.living*(1+MODEL.monthlyInflation));s.actions=4;s.energy=Math.min(100,s.energy+10);s.demand=80+Math.floor(random(s)*31);
    s.businesses.forEach(b=>{b.boost=0;});return s;
  }
  s.cash-=q.cost;
  if(a.type==='event') {
    const c=EVENTS[s.event!].choices[a.choice];
    s.energy=Math.max(0,Math.min(100,s.energy+(c.energy??0)));s.skill=Math.min(5,s.skill+(c.skill??0));s.salary=Math.max(0,s.salary+(c.salaryDelta??0));s.living=Math.max(0,s.living+(c.livingDelta??0));
    if(c.boost)s.businesses.forEach(b=>{if(b.sector===s.eventTarget)b.boost+=c.boost!;});
    s.event=null;s.eventTarget=null;record(s,q.label,-q.cost);return s;
  }
  const b='sector' in a?s.businesses.find(x=>x.sector===a.sector):undefined;
  switch(a.type){
    case 'work':s.energy-=15;break;
    case 'rest':s.energy=Math.min(100,s.energy+30);break;
    case 'learn':s.skill++;s.salary+=s.role==='employee'?250_000:0;break;
    case 'loan':s.loan={principal:10_000_000,months:12};break;
    case 'repay':s.loan=null;break;
    case 'rent':s.rentals++;break;
    case 'buy':s.businesses.push(makeBusiness(a.sector));break;
    case 'expand':b!.level++;b!.book+=q.cost;b!.basis+=q.cost;break;
    case 'manager':b!.manager=true;break;
    case 'market':b!.boost+=20;break;
    case 'price':b!.priceStep++;break;
    case 'improve':b!.efficiency++;break;
    case 'sell':s.businesses=s.businesses.filter(x=>x.sector!==a.sector);break;
  }
  s.actions--;record(s,q.label,-q.cost);
  if(s.actions===2){
    const available=eligibleEvents(s),fresh=available.filter(id=>!s.recentEvents.includes(id)),pool=fresh.length?fresh:available;
    if(pool.length){s.event=pool[Math.floor(random(s)*pool.length)];s.recentEvents=[s.event,...s.recentEvents].slice(0,6);
      const owned=s.businesses.filter(b=>SECTORS[b.sector].group===EVENTS[s.event!].scope);s.eventTarget=owned.length?owned[Math.floor(random(s)*owned.length)].sector:null;}
  }
  return s;
}
export function readSave(raw: string|null): State|null {
  if(!raw)return null;
  try{const parsed=JSON.parse(raw);
    if(parsed?.version===1){parsed.version=2;parsed.recentEvents=[];parsed.eventTarget=parsed.businesses?.find((b:Business)=>b.sector===parsed.event)?.sector??null;
      if(Array.isArray(parsed.businesses))parsed.businesses=parsed.businesses.map((b:Business)=>({...makeBusiness(b.sector,true),...b}));}
    const s=parsed as State;
    const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
    if(s.version!==2||!Object.hasOwn(ROLES,s.role)||!['playing','won','lost'].includes(s.status))return null;
    if(!['month','actions','cash','salary','living','energy','skill','rentals','demand','rng','freedomMonths'].every(k=>finite(s[k as keyof State])))return null;
    if(!Number.isInteger(s.month)||s.month<1||!Number.isInteger(s.actions)||s.actions<0||s.actions>4||s.energy<0||s.energy>100||s.skill<0||s.skill>5||s.rentals<0||s.rentals>5)return null;
    if(s.event!==null&&!Object.hasOwn(EVENTS,s.event))return null;
    if(!Array.isArray(s.businesses)||s.businesses.length>9||new Set(s.businesses.map(b=>b.sector)).size!==s.businesses.length)return null;
    if(s.businesses.some(b=>!Object.hasOwn(SECTORS,b.sector)||!Number.isInteger(b.level)||b.level<1||b.level>3||typeof b.manager!=='boolean'||!finite(b.efficiency)||b.efficiency<0||b.efficiency>3||!finite(b.boost)||Math.abs(b.boost)>100||!['stock','stockValue','book','basis','receivable','payable','priceStep'].every(k=>finite(b[k as keyof Business])&&Number(b[k as keyof Business])>=0)||!Number.isInteger(b.stock)||!Number.isInteger(b.priceStep)||b.priceStep>3))return null;
    if(s.loan!==null&&(!finite(s.loan.principal)||s.loan.principal<=0||!Number.isInteger(s.loan.months)||s.loan.months<1||s.loan.months>12))return null;
    if(!Array.isArray(s.log)||s.log.length>60||s.log.some(e=>typeof e.text!=='string'||!finite(e.month)||(e.amount!==undefined&&!finite(e.amount))))return null;
    if(!Array.isArray(s.recentEvents)||s.recentEvents.length>6||s.recentEvents.some(id=>!Object.hasOwn(EVENTS,id)))return null;
    if(s.eventTarget!==null&&!s.businesses.some(b=>b.sector===s.eventTarget))return null;
    return s;
  }catch{return null;}
}
