import assert from 'node:assert/strict';
import {act, economics, finances, quote, readSave, start} from '../src/oqim-life/engine';
import type {State} from '../src/oqim-life/engine';

const owner=start('owner');
const shop=economics(owner,owner.businesses[0]);
assert.equal(shop.revenue,32_400_000);
assert.equal(shop.variable,20_250_000);
assert.equal(shop.profit,6_150_000);
assert.equal(finances(owner).passive,0,'Owner-operated profit is not passive');
const managed=act(owner,{type:'manager',sector:'trade'});
assert.equal(finances(managed).passive,4_650_000);
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
