import {appendPoint,validate,wallLengths,resizeWalls,moveVertex,calculatePolygon} from './geometry.js';
const fmt=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3});
export function createEditor(root,onChange) {
  root.innerHTML=`<div class="heading"><span class="step">02</span><h2>План помещения</h2><span class="units">Контур 2.0</span></div>
  <p class="description">Нажимайте на сетку по порядку. Точки привязываются с шагом 0,25 м, стены — под прямым углом.</p>
  <div class="toolbar" aria-label="Управление планом"><button type="button" data-action="undo">↶ Отменить</button><button type="button" data-action="close">Замкнуть контур</button><button type="button" data-action="clear">Начать заново</button></div>
  <div class="plan-wrap"><svg id="plan" viewBox="-1 -1 12 10" role="img" aria-label="Сетка плана. Нажимайте, чтобы добавить углы. После замыкания перетаскивайте углы." preserveAspectRatio="xMidYMid meet"><defs><pattern id="grid" width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M .25 0 H 0 V .25" fill="none" stroke="#dce5d5" stroke-width=".012"/></pattern></defs><rect class="grid-bg" x="-1000000" y="-1000000" width="2000000" height="2000000" fill="url(#grid)"/><g id="drawing"></g></svg></div>
  <div class="toolbar zoom"><button type="button" data-action="out" aria-label="Уменьшить план">−</button><button type="button" data-action="in" aria-label="Увеличить план">+</button><button type="button" data-action="fit">План целиком</button><button type="button" data-action="pan" aria-pressed="false">Перемещать план</button></div>
  <p id="plan-status" role="status" aria-live="polite"></p>
  <details><summary>Как построить и изменить план</summary><p>Одна клетка — 0,25 м. После первой точки выбирается ближайшее горизонтальное или вертикальное направление. Для замыкания выровняйте последнюю точку с первой и нажмите «Замкнуть контур» или первую точку.</p><p>Замкнув план, тяните угол пальцем. Соседние углы смещаются вместе с ним. Масштаб: кнопки + / − или два пальца. Для сдвига включите «Перемещать план». Страницу можно прокручивать за пределами сетки.</p></details>
  <form id="wall-form" hidden novalidate><h3>Размеры стен, м</h3><p class="description">Изменяйте связанные стены вместе. Точность — до 0,001 м; запятая и точка допустимы.</p><div id="wall-fields"></div><button class="primary" type="submit">Применить размеры</button><button type="button" data-action="restore">Вернуть размеры плана</button><p id="wall-error" role="alert"></p></form>`;
  const svg=root.querySelector('#plan'),drawing=root.querySelector('#drawing'),status=root.querySelector('#plan-status'),form=root.querySelector('#wall-form');
  let points=[],closed=false,view={x:-1,y:-1,w:12,h:10},pan=false,gesture=null,dirty=false;
  const pointers=new Map();
  const message=t=>{status.textContent=t;};
  function result(){onChange(closed ? points : null,dirty);}
  function setView(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);}
  function world(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  const snap=p=>({x:Math.round(p.x*4)/4,y:Math.round(p.y*4)/4});
  function render() {
    const scale=1/(svg.getScreenCTM()?.a || svg.clientWidth/view.w || 1),r=7*scale,hit=24*scale;
    const path=points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')+(closed?' Z':'');
    const lengths=closed?wallLengths(points):[];
    drawing.innerHTML=`<path d="${path}" fill="${closed?'#d9efbc80':'none'}" stroke="#678d3d" stroke-width="${3*scale}" stroke-linejoin="round"/>`+
      lengths.map((l,i)=>{const a=points[i],b=points[(i+1)%points.length];return `<text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-12*scale}" text-anchor="middle" font-size="${12*scale}" fill="#334a28" paint-order="stroke" stroke="white" stroke-width="${3*scale}">${i+1}: ${fmt.format(l)} м</text>`;}).join('')+
      points.map((p,i)=>`<g><circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${i===0?'#678d3d':'white'}" stroke="#678d3d" stroke-width="${2*scale}"/><circle data-vertex="${i}" cx="${p.x}" cy="${p.y}" r="${hit}" fill="transparent"/></g>`).join('');
    root.querySelector('[data-action=close]').disabled=closed||points.length<4;
    root.querySelector('[data-action=undo]').disabled=!points.length;
    form.hidden=!closed;
  }
  function fields() {
    dirty=false;
    root.querySelector('#wall-error').textContent='';
    root.querySelector('#wall-fields').innerHTML=closed?wallLengths(points).map((v,i)=>`<label>Стена ${i+1}<input name="wall-${i}" aria-label="Длина стены ${i+1} в метрах" inputmode="decimal" autocomplete="off" value="${fmt.format(v).replace(/\s/g,'')}"></label>`).join(''):'';
  }
  function fit() {
    if (!points.length) view={x:-1,y:-1,w:12,h:10};
    else {const xs=points.map(p=>p.x),ys=points.map(p=>p.y),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);const side=Math.max(w,h,1)*1.35;view={x:(Math.max(...xs)+Math.min(...xs)-side)/2,y:(Math.max(...ys)+Math.min(...ys)-side)/2,w:side,h:side};}
    setView();render();
  }
  function zoom(factor) {
    const w=Math.min(200,Math.max(1,view.w*factor)),ratio=w/view.w;
    view={x:view.x+(view.w-w)/2,y:view.y+(view.h-view.h*ratio)/2,w,h:view.h*ratio};setView();render();
  }
  function close() {
    const error=validate(points);
    if(error){message(error);return;}
    closed=true;fields();render();result();message('Контур замкнут. Можно изменить размеры стен или перетащить угол.');
  }
  root.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    if(action==='close')return close();
    if(action==='in')return zoom(.8);
    if(action==='out')return zoom(1.25);
    if(action==='fit')return fit();
    if(action==='pan'){pan=!pan;e.target.setAttribute('aria-pressed',String(pan));message(pan?'Перетаскивайте сетку для перемещения плана.':'Режим построения и редактирования.');return;}
    if(action==='restore'){fields();result();return;}
    if(action==='undo'){if(closed)closed=false;else points.pop();fields();render();result();message('Последнее действие отменено.');}
    if(action==='clear'){points=[];closed=false;fields();fit();result();message('Новый план. Нажмите на сетку, чтобы поставить первый угол.');}
  });
  form.addEventListener('input',()=>{dirty=true;root.querySelector('#wall-error').textContent='Размеры изменены. Примените их, чтобы обновить расчёт.';result();});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    try{points=resizeWalls(points,[...form.querySelectorAll('input')].map(el=>el.value));fields();fit();result();message('Размеры применены. Контур проверен.');}
    catch(error){dirty=true;root.querySelector('#wall-error').textContent=error.message;result();}
  });
  svg.addEventListener('pointerdown',e=>{
    e.preventDefault();svg.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      if(gesture?.type==='vertex'){points=gesture.original;render();}
      const [a,b]=[...pointers.values()];
      gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),view:{...view}};return;
    }
    if(pointers.size>2)return;
    if(dirty&&!pan){message('Сначала примените размеры или верните размеры плана.');gesture=null;return;}
    const i=e.target.dataset.vertex;
    gesture={type:pan?'pan':closed&&i!==undefined?'vertex':'tap',index:Number(i),hit:i,start:{x:e.clientX,y:e.clientY},world:world(e),view:{...view},original:points.map(p=>({...p})),moved:false};
  });
  svg.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(gesture.type==='pinch'){
      const [a,b]=[...pointers.values()];if(!b)return;
      const ratio=gesture.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),v=gesture.view,w=Math.min(200,Math.max(1,v.w*ratio)),r=w/v.w;
      view={x:v.x+(v.w-w)/2,y:v.y+(v.h-v.h*r)/2,w,h:v.h*r};setView();render();return;
    }
    if(Math.hypot(e.clientX-gesture.start.x,e.clientY-gesture.start.y)>5)gesture.moved=true;
    if(gesture.type==='pan'){const p=world(e);view.x+=gesture.world.x-p.x;view.y+=gesture.world.y-p.y;setView();render();}
    if(gesture.type==='vertex'&&gesture.moved){
      try{points=moveVertex(gesture.original,gesture.index,snap(world(e)));render();message('Отпустите угол, чтобы сохранить.');}
      catch(error){message(error.message);}
    }
  });
  function end(e,cancel=false){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(!gesture)return;
    if(gesture.type==='pinch'){if(!pointers.size)gesture=null;return;}
    const g=gesture;gesture=null;
    if(cancel){points=g.original;render();return;}
    if(g.type==='vertex'&&g.moved){fields();result();message('Положение угла сохранено.');return;}
    if(g.type!=='tap'||g.moved||closed)return;
    if(dirty)return;
    try{
      const p=snap(world(e)),last=points.at(-1);
      if(g.hit==='0'&&points.length>=4){close();return;}
      if(last){if(Math.abs(p.x-last.x)>=Math.abs(p.y-last.y))p.y=last.y;else p.x=last.x;}
      points=appendPoint(points,p);render();result();message(`Углов: ${points.length}. Продолжайте контур; замыкание — по первой точке.`);
    }catch(error){message(error.message);}
  }
  svg.addEventListener('pointerup',e=>end(e));
  svg.addEventListener('pointercancel',e=>end(e,true));
  new ResizeObserver(()=>render()).observe(svg);
  fields();render();message('Нажмите на сетку, чтобы поставить первый угол.');
  return {get points(){return closed?points:null;},get dirty(){return dirty;}};
}
