// Coordinates are metres; decimal wall edits use a 1 mm precision.
export const EPS = 1e-8;
export const MAX = 1000000;
const equal = (a,b) => Math.abs(a-b) < EPS;
const same = (a,b) => equal(a.x,b.x) && equal(a.y,b.y);
const horizontal = (a,b) => equal(a.y,b.y);
export function parseMetres(value) {
  const text = String(value).trim();
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(text)) return null;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= MAX ? n : null;
}
function intersects(a,b,c,d) {
  const ah = horizontal(a,b), ch = horizontal(c,d);
  const between = (x,p,q) => x >= Math.min(p,q)-EPS && x <= Math.max(p,q)+EPS;
  if (ah && ch) return equal(a.y,c.y) && Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x)) <= Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+EPS;
  if (!ah && !ch) return equal(a.x,c.x) && Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y)) <= Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))+EPS;
  if (!ah) return intersects(c,d,a,b);
  return between(c.x,a.x,b.x) && between(a.y,c.y,d.y);
}
export function validate(points, closed = true) {
  if (!Array.isArray(points) || points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x)>MAX || Math.abs(p.y)>MAX)) return 'Координаты вне допустимого диапазона.';
  if (closed && points.length < 4) return 'Для комнаты нужны минимум четыре угла.';
  const n = points.length, count = closed ? n : Math.max(0,n-1);
  for (let i=0;i<count;i++) {
    const a=points[i],b=points[(i+1)%n];
    if (same(a,b)) return 'Длина стены должна быть больше нуля.';
    if (!equal(a.x,b.x) && !equal(a.y,b.y)) return 'Стены должны быть горизонтальными или вертикальными. Выровняйте последнюю точку с первой.';
    if (closed || i<count-1) {
      const c=points[(i+2)%n];
      if (horizontal(a,b)===horizontal(b,c)) return 'Каждый угол должен быть 90°. Продолжите стену или поверните.';
    }
    for (let j=i+1;j<count;j++) {
      if (j===i+1 || (closed && i===0 && j===count-1)) continue;
      if (intersects(a,b,points[j],points[(j+1)%n])) return 'Стены пересекаются или касаются друг друга. Выберите другую точку.';
    }
  }
  if (closed && Math.abs(signedArea(points)) < EPS) return 'Контур не имеет площади.';
  return null;
}
function signedArea(p) {
  // Translate to the first vertex to avoid cancellation for distant origins.
  const o=p[0];
  return p.reduce((sum,a,i) => {const b=p[(i+1)%p.length];return sum+(a.x-o.x)*(b.y-o.y)-(b.x-o.x)*(a.y-o.y);},0)/2;
}
export function wallLengths(p) {
  return p.map((a,i)=>{const b=p[(i+1)%p.length];return Math.abs(b.x-a.x)+Math.abs(b.y-a.y);});
}
export function calculatePolygon(points,height) {
  if (validate(points)) return null;
  const h=parseMetres(height);
  if (h===null) return null;
  const area=Math.abs(signedArea(points)), perimeter=wallLengths(points).reduce((a,b)=>a+b,0);
  return {area,perimeter,wallArea:perimeter*h,volume:area*h};
}
export function appendPoint(points, point) {
  const next=points.map(p=>({...p})), last=next.at(-1);
  if (last && same(last,point)) throw Error('Выберите другую точку сетки.');
  if (next.length>=2) {
    const prev=next.at(-2);
    if (horizontal(prev,last)===horizontal(last,point)) {
      const dot=(last.x-prev.x)*(point.x-last.x)+(last.y-prev.y)*(point.y-last.y);
      if (dot<=0) throw Error('Нельзя вести стену назад по уже построенному участку.');
      next.pop();
    }
  }
  next.push({...point});
  const error=validate(next,false);
  if (error) throw Error(error);
  return next;
}
export function resizeWalls(points,values) {
  const error=validate(points);
  if (error) throw Error(error);
  if (values.length!==points.length) throw Error('Укажите длину каждой стены.');
  const lengths=values.map(parseMetres);
  if (lengths.some(v=>v===null)) throw Error('Размеры: больше 0, до 1 000 000 м, максимум три знака после запятой.');
  const result=[{...points[0]}];
  for (let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],last=result.at(-1);
    result.push({x:last.x+Math.sign(b.x-a.x)*lengths[i],y:last.y+Math.sign(b.y-a.y)*lengths[i]});
  }
  if (!same(result[0],result.at(-1))) throw Error('Размеры не замыкают контур. Суммы стен вправо и влево, вверх и вниз должны совпадать. Измените связанные стены вместе.');
  result.pop();
  const invalid=validate(result);
  if (invalid) throw Error(invalid);
  return result;
}
export function moveVertex(points,index,target) {
  const error=validate(points);
  if (error) throw Error(error);
  if (!Number.isInteger(index) || index<0 || index>=points.length || !target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) throw Error('Некорректная вершина.');
  const result=points.map(p=>({...p})),n=result.length;
  const prev=result[(index+n-1)%n],curr=result[index],next=result[(index+1)%n];
  const prevHorizontal=horizontal(prev,curr);
  if (prevHorizontal) { prev.y=target.y;next.x=target.x; }
  else {prev.x=target.x;next.y=target.y;}
  curr.x=target.x;curr.y=target.y;
  // Do not permit an edge to reverse direction during a drag.
  for(let i=0;i<n;i++) {
    const j=(i+1)%n;
    if ((points[j].x-points[i].x)*(result[j].x-result[i].x)+(points[j].y-points[i].y)*(result[j].y-result[i].y)<=EPS) throw Error('Стена не может исчезнуть или изменить направление.');
  }
  const invalid=validate(result);
  if (invalid) throw Error(invalid);
  return result;
}
