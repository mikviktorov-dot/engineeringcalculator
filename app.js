import { calculateRoom } from './calculator.js';
const fields = ['length', 'width', 'height'].map(id => document.getElementById(id));
const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
function update() {
  const result = calculateRoom(...fields.map(field => field.value));
  fields.forEach(field => field.setAttribute('aria-invalid', String(!calculateRoom(field.value, 1, 1))));
  document.getElementById('error').textContent = result ? '' : 'Введите все размеры: больше 0 и не более 1 000 000 м.';
  document.getElementById('area').textContent = result ? format.format(result.area) : '—';
  document.getElementById('volume').textContent = result ? format.format(result.volume) : '—';
  fields.forEach(field => {
    const value = calculateRoom(field.value, 1, 1);
    document.getElementById(`diagram-${field.id}`).textContent = value ? `${format.format(value.dimensions[0])} м` : '—';
  });
}
const form = document.getElementById('dimensions');
form.addEventListener('input', update);
form.addEventListener('submit', event => event.preventDefault());
document.getElementById('reset').addEventListener('click', () => {
  fields.forEach(field => { field.value = ''; });
  update();
  fields[0].focus();
});
update();
