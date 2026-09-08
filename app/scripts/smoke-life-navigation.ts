import assert from 'node:assert/strict';
import {NODES,EDGES,route,DESTINATIONS} from '../src/oqim-life/navigation';
for(const from of Object.values(DESTINATIONS))for(const to of Object.values(DESTINATIONS)){
 const path=route(from,to);assert.equal(path[0],from);assert.equal(path.at(-1),to);
 assert.equal(new Set(path).size,path.length);
 for(let i=1;i<path.length;i++)assert.ok(EDGES.some(e=>e.includes(path[i-1])&&e.includes(path[i])),'Route follows a connected road');
 for(const n of path)assert.ok(NODES[n].x>=0&&NODES[n].x<=100&&NODES[n].y>=0&&NODES[n].y<=100);
}
assert.deepEqual(route('unknown','home'),[]);
console.log('NAVIGATION PASSED: all 49 destination pairs use connected roads');
