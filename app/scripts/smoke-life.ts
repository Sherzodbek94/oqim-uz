import assert from 'node:assert/strict';
import {act, economics, finances, quote, readSave, start, makeBusiness, SECTORS, EVENTS, eligibleEvents} from '../src/oqim-life/engine';
import type {State,Sector} from '../src/oqim-life/engine';

const owner=start('owner');
const shop=economics(owner,owner.businesses[0]);
assert.equal(shop.revenue,32_400_000);
assert.equal(shop.variable,20_250_000);
assert.equal(shop.profit,4_503_167);
assert.equal(finances(owner).passive,0,'Owner-operated profit is not passive');
const managed=act(owner,{type:'manager',sector:'trade'});
assert.equal(finances(managed).passive,3_003_167);
assert.equal(owner.businesses[0].manager,false,'Reducer cannot mutate old save');
assert.equal(act(managed,{type:'manager',sector:'trade'}),managed,'Duplicate manager rejected');
assert.ok(quote(start('employee'),{type:'buy',sector:'production'}).reason);

let loan=act(start('employee'),{type:'loan'});
assert.equal(loan.cash,19_000_000);
assert.equal(finances(loan).income,4_500_000,'Loan is not income');
loan.actions=0;
const before=finances(loan);const cash=loan.cash;
loan=act(loan,{type:'month'});
assert.equal(loan.cash,cash+before.flow,'Month books cash exactly once');
assert.equal(loan.loan?.principal,10_000_000-before.repayment);
assert.equal(act(loan,{type:'month'}),loan,'Month cannot settle twice');

let win:State={...start('employee'),rentals:4,cash:50_000_000,actions:0};
for(let i=0;i<3;i++){win.actions=0;win=act(win,{type:'month'});}
assert.equal(win.status,'won');
let loss:State={...start('employee'),salary:0,cash:0,actions:0};
loss=act(loss,{type:'month'});assert.equal(loss.status,'lost');
assert.equal(act(loss,{type:'loan'}),loss);

for(const role of ['employee','freelancer','owner'] as const){
  let s=start(role);
  for(let month=0;month<12;month++){
    for(let week=0;week<4;week++){
      s=act(s,{type:week%2?'rest':'work'});
      if(s.event)s=act(s,{type:'event',choice:1});
    }
    s=act(s,{type:'month'});
    assert.ok(readSave(JSON.stringify(s)));assert.ok(Number.isFinite(finances(s).flow));
  }
  assert.equal(s.month,13);assert.equal(s.status,'playing');
}
assert.equal(readSave('{bad'),null);
assert.equal(readSave(JSON.stringify({...owner,actions:99})),null);
assert.equal(readSave(JSON.stringify({...owner,businesses:[null]})),null);
assert.equal(readSave(JSON.stringify({...owner,loan:{principal:10,months:0}})),null);
console.log('LIFE ECONOMY PASSED: accounting, credit, independent saves, 3 careers × 12 months, win/loss');

assert.equal(Object.keys(SECTORS).length,9);assert.equal(Object.keys(EVENTS).length,36);
function netAssets(s:State){return s.cash+s.businesses.reduce((a,b)=>a+b.book+b.stockValue+b.receivable-b.payable,0)-(s.loan?.principal??0);}
for(const sector of Object.keys(SECTORS) as Sector[]){
 let s:State={...start('owner'),cash:100_000_000,living:1,businesses:[makeBusiness(sector)]};
 for(let i=0;i<12;i++){
  s.actions=0;const before=netAssets(s),e=economics(s,s.businesses[0]),f=finances(s);
  assert.equal(f.businessCash,f.business+f.depreciation+f.inventoryRelease-f.receivableChange+f.payableChange,'Accrual/cash bridge');
  const next=act(s,{type:'month'});
  assert.equal(netAssets(next)-before,e.profit-1,'Net assets increase by earned profit, not by receipts');
  assert.ok(next.businesses[0].book>=0);assert.ok(next.businesses[0].stockValue>=0);
  s=next;
 }
}
const v1={...start('owner'),version:1};
v1.businesses=v1.businesses.map(b=>({sector:b.sector,level:b.level,manager:b.manager,efficiency:b.efficiency,boost:b.boost})) as typeof v1.businesses;
const migrated=readSave(JSON.stringify(v1));assert.ok(migrated);assert.equal(migrated.cash,v1.cash);assert.equal(migrated.version,2);
assert.equal(eligibleEvents({...start('employee'),month:3}).some(id=>EVENTS[id].scope==='production'),false);
for(const card of Object.values(EVENTS))assert.ok(card.choices.some(c=>c.cost<=0),'Every event has an affordable exit');
const paired={...start('owner'),businesses:[makeBusiness('trade'),makeBusiness('clothing')],event:'trade',eventTarget:'clothing' as const};
const resolved=act(paired,{type:'event',choice:0});assert.equal(resolved.businesses[0].boost,0);assert.equal(resolved.businesses[1].boost,15);
console.log('EXPANSION PASSED: 9 businesses × 12 months conserve equity, 36 scoped events, migration and targeted effects');
