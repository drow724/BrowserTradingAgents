// F001-E2 deterministic pre-classifier (v2). Returns 'NO_ACTION' | 'CLARIFY' | null (null = pass to model).
// ponytail: keyword lexicon, Korean-only heuristics; replace with a trained classifier if the lexicon keeps growing.
const DESTRUCTIVE = /삭제|지워|지우|내보내|강퇴|추방|정지|차단|권한|(비밀번호|패스워드).{0,4}(바꿔|변경)|아카이브|수정해|전달해|포워드|뿌려|보내 ?줘|외부로|공유해 ?줘|몰래|보관 ?처리|고쳐서|다시 올려/i;
const OUT_OF_SCOPE = /날씨|비 ?(와|오)|환율|주식|메뉴|맛집|추천해|노래|음악|코드 ?(짜|작성)|파이썬|자바스크립트|엑셀|수식|문법|번역|넌 누구|너 누구/i;
const CUE = new RegExp([
  '찾|검색|어디|어딨|주소|링크|url|파일|티켓|번호|회의록|뭐였|뭐라 ?(했|그랬)|언급|find|search',      // SEARCH
  '보여|열어|읽어|펼쳐|원문|스레드|답글|댓글|까봐|thread',                                          // READ
  '요약|정리|요점|핵심|tl;?dr|놓친|무슨 (내용|얘기)|상황|summar',                                   // SUMMARIZE
  '할 ?일|해야 ?(할|하는|될|됨)|뭐 해야|할 ?거 ?(있|리스트|목록|정리|뭐)|todo|액션|작업|담당|맡은|시킨|몫|약속|리스트업',                                       // TODOS
  '결정|결론|확정|합의|정해|하기로|decision',                                                       // DECISIONS
  '답장|회신|답변|대답|초안|reply|(라고|다고) ?(해|답|말|써)',                                       // DRAFT
  '알려|알림|리마인|상기|핑|기억|remind|나중에 다시|다시 보게',                                       // REMIND
].join('|'), 'i');
const ACK = /안녕|좋은 아침|반가|ㅋㅋ|ㅎㅎ|고마|감사|갑사|ㄳ|ㄱㅅ|땡큐|thx|thank|ㅇㅋ|ㅇㅇ|오케이|오키|okay|\bok\b|넵|^네|^응|알겠|됐|됬|괜찮|수고|잘했|좋아|취소|아니야|아냐|그만|신경 ?쓰지|필요 ?없|몰라|그냥 둬|볼게/i;
const GENERIC = /해 ?줘|해 ?봐|해 ?주세요|처리|손봐|진행|부탁|맡길|맡겨|도와|해결|마무리|계속해|이어서|알아서|만들어|ㄱㄱ?$|^(이거|그거|저거|그 ?건|이 ?건|아까 그거)/;
function preclassifyV2(command) {
  const c = command.trim();
  if (DESTRUCTIVE.test(c) || OUT_OF_SCOPE.test(c)) return 'NO_ACTION';
  if (CUE.test(c)) return null;
  if (ACK.test(c) && !/어떻게/.test(c)) return 'NO_ACTION';
  // v2: CLARIFY only for generic-verb / pronoun-only / bare 1-2 word fragments; everything else goes to the model.
  if (GENERIC.test(c) || (c.split(/\s+/).length <= 2 && !/\?/.test(c))) return 'CLARIFY';
  return null;
}
if (typeof module !== 'undefined') module.exports = {preclassifyV2};
