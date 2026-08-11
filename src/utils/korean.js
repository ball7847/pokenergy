/**
 * 한글 음절의 종성(받침) 유무를 판별한다.
 * 현재 게임에서 사용하는 포켓몬 한국어 이름을 기준으로 하며,
 * 마지막 문자가 완성형 한글이 아니면 받침 없음으로 처리한다.
 */
export function hasBatchim(word) {
  const text = String(word ?? '').trim();
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

export function chooseJosa(word, pair) {
  const [withBatchim, withoutBatchim] = String(pair).split('/');
  if (!withBatchim || !withoutBatchim) throw new Error(`지원하지 않는 조사 형식입니다: ${pair}`);
  return hasBatchim(word) ? withBatchim : withoutBatchim;
}

export function attachJosa(word, pair) {
  return `${word}${chooseJosa(word, pair)}`;
}
