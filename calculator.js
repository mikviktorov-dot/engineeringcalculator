export function calculateRoom(length, width, height) {
  const values = [length, width, height].map(value => {
    const text = String(value).trim();
    return /^\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
  });
  if (values.some(value => !Number.isFinite(value) || value <= 0 || value > 1000000)) return null;
  const [l, w, h] = values;
  return { area: l * w, volume: l * w * h, dimensions: values };
}
