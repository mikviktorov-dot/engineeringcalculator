import { calculateRoom } from './calculator.js';
import { calculatePolygon, parseMetres } from './geometry.js';
import { createEditor } from './editor.js';
const $=id=>document.getElementById(id);
const fields=['length','width','height'].map($);
const format=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:4});
let mode='rectangle',polygon=null,dirty=false;
function update(){
  let result=null,error='';
  if(mode==='rectangle'){
    const room=calculateRoom(...fields.map(f=>f.value));
    if(room){const [l,w,h]=room.dimensions;result={...room,perimeter:2*(l+w),wallArea:2*(l+w)*h};}
    else error='Введите все размеры: больше 0 и не более 1 000 000 м.';
    fields.forEach(field=>field.setAttribute('aria-invalid',String(!calculateRoom(field.value,1,1))));
  }else{
    fields[2].setAttribute('aria-invalid',String(parseMetres(fields[2].value)===null));
    if(dirty)error='Размеры стен изменены. Примените их или верните размеры плана.';
    else if(!polygon)error='Постройте и замкните контур для расчёта.';
    else if(parseMetres(fields[2].value)===null)error='Введите высоту больше 0, до 1 000 000 м, максимум три знака после запятой.';
    else result=calculatePolygon(polygon,fields[2].value);
  }
  $('error').textContent=error;
  for(const [id,key] of [['area','area'],['volume','volume'],['perimeter','perimeter'],['wall-area','wallArea']])$(id).textContent=result?format.format(result[key]):'—';
  fields.forEach(field=>{
    const value=calculateRoom(field.value,1,1);
    $(`diagram-${field.id}`).textContent=value?`${format.format(value.dimensions[0])} м`:'—';
  });
}
createEditor($('shape-editor'),(p,d)=>{polygon=p;dirty=d;update();});
function select(next){
  mode=next;
  const custom=mode==='custom';
  $('rectangle-fields').hidden=custom;
  $('shape-editor').hidden=!custom;
  document.querySelector('.scene').hidden=custom;
  document.querySelector('.workspace').classList.toggle('custom-mode',custom);
  $('mode-rectangle').setAttribute('aria-pressed',String(!custom));
  $('mode-custom').setAttribute('aria-pressed',String(custom));
  $('area-formula').textContent=custom?'Формула площади многоугольника':'Длина × Ширина';
  update();
}
$('mode-rectangle').addEventListener('click',()=>select('rectangle'));
$('mode-custom').addEventListener('click',()=>select('custom'));
$('dimensions').addEventListener('input',update);
$('dimensions').addEventListener('submit',e=>e.preventDefault());
$('reset').addEventListener('click',()=>{
  (mode==='custom'?[fields[2]]:fields).forEach(f=>f.value='');
  update();(mode==='custom'?fields[2]:fields[0]).focus();
});
update();
