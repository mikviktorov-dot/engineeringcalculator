import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,calculatePolygon,resizeWalls,moveVertex,appendPoint,parseMetres,wallLengths} from './geometry.js';
const polygon=coords=>coords.map(([x,y])=>({x,y}));
const rect=polygon([[0,0],[5,0],[5,4],[0,4]]);
const ell=polygon([[0,0],[6,0],[6,2],[3,2],[3,5],[0,5]]);
const niche=polygon([[0,0],[6,0],[6,5],[4,5],[4,3],[2,3],[2,5],[0,5]]);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, a+' != '+b);
test('rectangle: exact area, perimeter, wall area and volume',()=>{
  assert.deepEqual(calculatePolygon(rect,'2,7'),{area:20,perimeter:18,wallArea:48.6,volume:54});
});
test('L room is a union of rectangles',()=>{
  assert.deepEqual(calculatePolygon(ell,3),{area:21,perimeter:22,wallArea:66,volume:63});
});
test('room with niche and protrusion: concave area and perimeter',()=>{
  assert.deepEqual(calculatePolygon(niche,3),{area:26,perimeter:26,wallArea:78,volume:78});
  const protrusion=polygon([[0,0],[4,0],[4,2],[6,2],[6,4],[4,4],[4,6],[0,6]]);
  assert.equal(calculatePolygon(protrusion,3).area,28);
  assert.equal(calculatePolygon(protrusion,3).perimeter,24);
});
test('winding, translation and fractional dimensions preserve formulas',()=>{
  const p=rect.map(({x,y})=>({x:x*.25+100,y:y*.25-50})).reverse();
  const r=calculatePolygon(p,'2.125');
  close(r.area,1.25);close(r.perimeter,4.5);close(r.volume,2.65625);
});
test('invalid contours never produce calculations',()=>{
  for(const p of [
    [],polygon([[0,0],[1,0],[1,1]]),
    polygon([[0,0],[5,0],[5,4],[1,3]]),
    polygon([[0,0],[5,0],[5,4],[5,4],[0,4]]),
    polygon([[0,0],[2,0],[4,0],[4,4],[0,4]]),
    polygon([[0,0],[4,0],[4,4],[2,4],[2,-1],[1,-1],[1,3],[0,3]]),
    polygon([[0,0],[4,0],[4,4],[2,4],[2,0],[1,0],[1,3],[0,3]]),
    [{x:NaN,y:0},...rect.slice(1)],
    rect.map(p=>({x:p.x+1000001,y:p.y}))
  ]) {assert.ok(validate(p));assert.equal(calculatePolygon(p,3),null);}
});
test('invalid height and metres are rejected',()=>{
  for(const v of ['',0,-1,'abc','Infinity','1e3','1,2.3','2.0001',1000001]){
    assert.equal(parseMetres(v),null);assert.equal(calculatePolygon(rect,v),null);
  }
  assert.equal(parseMetres(' 2,375 '),2.375);
});
test('dimension edits preserve closure and reject incompatible lengths atomically',()=>{
  const original=JSON.stringify(rect);
  const p=resizeWalls(rect,['5,125','4.25','5,125','4.25']);
  assert.equal(validate(p),null);close(calculatePolygon(p,3).area,21.78125);
  assert.throws(()=>resizeWalls(rect,[6,4,5,4]),/не замыкают/);
  assert.throws(()=>resizeWalls(rect,[0,4,0,4]));
  assert.throws(()=>resizeWalls(rect,[5,4]));
  assert.equal(JSON.stringify(rect),original);
});
test('closed but intersecting wall dimensions are rejected',()=>{
  assert.throws(()=>resizeWalls(niche,[6,5,2,6,2,6,2,5]),/пересекаются/);
});
test('vertex movement keeps right angles, closure and exact calculations',()=>{
  const original=JSON.stringify(rect);
  const moved=moveVertex(rect,1,{x:6.25,y:-.5});
  assert.equal(validate(moved),null);
  close(calculatePolygon(moved,3).area,28.125);
  assert.equal(JSON.stringify(rect),original);
  const movedL=moveVertex(ell,3,{x:2.5,y:2.5});
  assert.equal(validate(movedL),null);
  assert.throws(()=>moveVertex(rect,1,{x:0,y:0}));
  assert.throws(()=>moveVertex(rect,1,{x:-1,y:0}));
  assert.throws(()=>moveVertex(niche,4,{x:1,y:3}));
});
test('construction extends straight walls, rejects reversals and crossings',()=>{
  let p=[];
  for(const point of rect)p=appendPoint(p,point);
  assert.equal(validate(p),null);
  const extended=appendPoint(polygon([[0,0],[2,0]]),{x:4,y:0});
  assert.equal(extended.length,2);
  assert.throws(()=>appendPoint(extended,{x:1,y:0}));
  assert.throws(()=>appendPoint(polygon([[0,0],[4,0],[4,4],[2,4]]),{x:2,y:-1}));
  assert.deepEqual(wallLengths(rect),[5,4,5,4]);
});
