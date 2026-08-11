export function formatNumber(value) {
  if (!Number.isFinite(value)) return '0';
  if (value < 1000) return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0).replace(/\.00$|\.0$/, '');
  for (const [suffix, unit] of [['Qa',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]]) {
    if (value >= unit) return `${(value / unit).toFixed(value / unit < 10 ? 2 : value / unit < 100 ? 1 : 0).replace(/\.00$|\.0$/, '')}${suffix}`;
  }
  return Math.floor(value).toLocaleString('ko-KR');
}
