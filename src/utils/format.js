export function formatNumber(value) {
  if (!Number.isFinite(value)) return '0';
  if (value < 1000) return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0).replace(/\.00$|\.0$/, '');
  for (const [suffix, unit] of [['Qa',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]]) {
    if (value >= unit) return `${(value / unit).toFixed(value / unit < 10 ? 2 : value / unit < 100 ? 1 : 0).replace(/\.00$|\.0$/, '')}${suffix}`;
  }
  return Math.floor(value).toLocaleString('ko-KR');
}

/**
 * 에너지 전용 표시 규칙.
 * - 소수점 둘째 자리까지만 표시하고 불필요한 0은 제거한다.
 * - 절댓값 1,000,000 이상은 1.23e6 형태의 과학적 표기법을 사용한다.
 */
export function formatEnergyNumber(value) {
  if (!Number.isFinite(value)) return '0';
  const rounded = roundTwoDecimals(value);
  if (Math.abs(rounded) >= 1_000_000) {
    const exponent = Math.floor(Math.log10(Math.abs(rounded)));
    const coefficient = rounded / (10 ** exponent);
    return `${trimTwoDecimals(coefficient)}e${exponent}`;
  }
  return trimTwoDecimals(rounded);
}

function roundTwoDecimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function trimTwoDecimals(value) {
  const rounded = roundTwoDecimals(value);
  if (Object.is(rounded, -0)) return '0';
  return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
