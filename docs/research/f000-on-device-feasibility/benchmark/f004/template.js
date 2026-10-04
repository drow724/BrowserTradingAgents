// F004 no-LLM baseline: classify the intent into a canned reply type and fill dates/links (smart-reply level).
// ponytail: keyword intent classes + fixed sentences; cannot paraphrase or ask specific questions.
const DATE = /(\d{1,2}월 ?\d{1,2}일|\d{1,2}\/\d{1,2}|(다음 ?주|이번 ?주)? ?[월화수목금토일]요일|오늘|내일|모레|다음 ?주|이번 ?주|\d{1,2}시(?: ?\d{1,2}분)?)/g;
const URL = /https?:\/\/\S+/g, NUM = /\d[\d,.]*(?:원|만원|개|명|건|%|시간|일)/g;
function draft(s) {
  const t = s.intent, dates = t.match(DATE) || [], urls = t.match(URL) || [], nums = t.match(NUM) || [];
  const other = s.participants.find(p => p.id === s.messages.find(m => m.id === s.reply_to).authorId);
  const formal = other && other.relation === 'external';
  const end = (polite, casual) => (other && ['peer', 'junior'].includes(other.relation) && /반말|ㅇㅋ|해줘$|한다고/.test(t)) ? casual : polite;
  const d = dates.join(' ');
  let r;
  if (/미루|연기|늦|제안|대신|말고/.test(t) && dates.length) r = end(`죄송하지만 그때는 어렵고, ${d} 가능할 것 같습니다.`, `미안 그때는 어렵고 ${d} 어때?`);
  else if (/어렵|못 |못하|안 될|안될|거절|불가|힘들|사양/.test(t)) r = end('죄송하지만 이번에는 어렵습니다.', '미안 이번엔 어려울 것 같아.');
  else if (/감사|고맙/.test(t)) r = end('감사합니다!', '고마워!');
  else if (/물어|여쭤|궁금|확인해|되는지|인지 /.test(t)) r = end('혹시 관련해서 확인 부탁드려도 될까요?', '혹시 그거 확인해줄 수 있어?');
  else if (/공유|전달|알려|링크/.test(t) || urls.length) r = end(`공유드립니다. ${[...urls, ...dates, ...nums].join(' ')}`.trim(), `공유할게 ${[...urls, ...dates, ...nums].join(' ')}`.trim());
  else r = end(d ? `네, 알겠습니다. ${d}까지 진행하겠습니다.` : '네, 알겠습니다. 진행하겠습니다.', d ? `ㅇㅋ ${d}까지 할게` : 'ㅇㅋ 할게');
  return formal ? r.replace('죄송하지만', '송구하지만').replace('감사합니다!', '감사합니다.') : r;
}
if (typeof module !== 'undefined') module.exports = {draft};
