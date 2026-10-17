// Interaction tests use a small SVG/DOM adapter; these are not browser layout tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor} from './editor.js';
function harness(){
  class Element {
    constructor(){this.handlers={};this.dataset={};this.attrs={};this.clientWidth=360;this.hidden=false;this.textContent='';}
    addEventListener(type,fn){this.handlers[type]=fn;}
    setAttribute(k,v){this.attrs[k]=v;}
    setPointerCapture(){}
    getScreenCTM(){return {inverse(){return {};}};}
    createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x/30,y:this.y/30};}};}
    emit(type,data={}){
      this.handlers[type]?.({preventDefault(){},target:this,pointerId:1,clientX:0,clientY:0,...data});
    }
    closest(){return this;}
  }
  const map=new Map(),root=new Element();
  root.querySelector=selector=>{
    if(!map.has(selector))map.set(selector,new Element());
    return map.get(selector);
  };
  const form=root.querySelector('#wall-form');
  form.querySelectorAll=()=>[...root.querySelector('#wall-fields').innerHTML.matchAll(/value="([^"]*)"/g)].map(m=>({value:m[1]}));
  let change=null;
  const previous=globalThis.ResizeObserver;
  globalThis.ResizeObserver=class{observe(){}};
  let editor;
  try{editor=createEditor(root,(p,dirty)=>{change={points:p,dirty};});}
  finally{globalThis.ResizeObserver=previous;}
  const svg=root.querySelector('#plan');
  const tap=(x,y,vertex)=>{
    const target=new Element();if(vertex!==undefined)target.dataset.vertex=String(vertex);
    svg.emit('pointerdown',{clientX:x*30,clientY:y*30,target});
    // Pointer capture retargets pointerup to SVG, not the circle.
    svg.emit('pointerup',{clientX:x*30,clientY:y*30});
  };
  const action=name=>root.emit('click',{target:{dataset:{action:name},setAttribute(){},closest(){return this;}}});
  const rectangle=()=>{tap(0,0);tap(5,0);tap(5,4);tap(0,4);};
  return {root,svg,editor,tap,action,rectangle,get change(){return change;}};
}
test('editor initializes, builds and closes by tapping first vertex under pointer capture',()=>{
  const h=harness();h.rectangle();h.tap(0,0,0);
  assert.equal(h.editor.points.length,4);
  assert.equal(h.change.dirty,false);
  assert.equal(h.root.querySelector('#wall-form').hidden,false);
  h.action('undo');assert.equal(h.editor.points,null);
  h.action('undo');h.action('clear');assert.equal(h.editor.points,null);
});
test('editor blocks incompatible dimensions and restores original plan',()=>{
  const h=harness();h.rectangle();h.action('close');
  const original=JSON.stringify(h.editor.points),form=h.root.querySelector('#wall-form');
  form.emit('input');
  assert.equal(h.change.dirty,true);
  form.querySelectorAll=()=>[6,4,5,4].map(value=>({value}));
  form.emit('submit');
  assert.match(h.root.querySelector('#wall-error').textContent,/не замыкают/);
  assert.equal(JSON.stringify(h.editor.points),original);
  h.action('restore');assert.equal(h.change.dirty,false);
});
test('pointer cancellation restores geometry and vertex drag preserves orthogonality',()=>{
  const h=harness();h.rectangle();h.action('close');
  const target={dataset:{vertex:'1'}},before=JSON.stringify(h.editor.points);
  h.svg.emit('pointerdown',{clientX:150,clientY:0,target});
  h.svg.emit('pointermove',{clientX:180,clientY:0});
  h.svg.emit('pointercancel');
  assert.equal(JSON.stringify(h.editor.points),before);
  h.svg.emit('pointerdown',{clientX:150,clientY:0,target});
  h.svg.emit('pointermove',{clientX:180,clientY:0});
  h.svg.emit('pointerup',{clientX:180,clientY:0});
  assert.equal(h.editor.points[1].x,6);
  assert.equal(h.editor.points[2].x,6);
});
test('zoom, pan and pinch do not add accidental vertices',()=>{
  const h=harness();
  h.action('in');h.action('out');h.action('fit');h.action('pan');h.tap(1,1);
  assert.equal(h.editor.points,null);
  h.action('pan');
  h.svg.emit('pointerdown',{pointerId:1,clientX:20});
  h.svg.emit('pointerdown',{pointerId:2,clientX:100});
  h.svg.emit('pointermove',{pointerId:2,clientX:150});
  h.svg.emit('pointerup',{pointerId:2});
  h.svg.emit('pointerup',{pointerId:1});
  assert.equal(h.editor.points,null);
  h.rectangle();h.action('close');assert.equal(h.editor.points.length,4);
});
