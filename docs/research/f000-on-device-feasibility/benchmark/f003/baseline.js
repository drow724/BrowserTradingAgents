// F003 rule baseline for TODO extraction (no LLM). extractTodos(conversation) -> [{assignee, task, due, sources}]
// ponytail: Korean surface rules (promise endings, named requests, replies to requests); no deep coreference.
const DUE = [['월요일', /월요일/], ['화요일', /화요일/], ['수요일', /수요일/], ['목요일', /목요일/], ['금요일', /금요일/], ['토요일', /토요일/], ['일요일', /일요일/],
  ['오늘', /오늘|오전 중|퇴근 전|당일|바로/], ['내일', /내일|낼/], ['모레', /모레/], ['이번주', /이번 ?주/], ['다음주', /다음 ?주/]];
const dueOf = (...texts) => { for (const t of texts) for (const [d, re] of DUE) if (t && re.test(t)) return d; return null; };
const PROMISE = /(ㄹ게|[을를할릴볼갈줄둘낼올길킬일칠들]게(요)?|겠습니다|겠어요|하겠음|할께|할 ?거예요|드릴게)([.!~ ㅎㅋ👍🙏?]|$)/;
const ACCEPT = /^(네|넵|넹|ㅇㅋ|ㅇㅇ|오키|콜|ok|okay|알겠|좋아요|그럴게|제가 ?(할|하죠|요|해요)|저요|접수)/i;
const REQUEST = /(해 ?줄 수 있|주세요|줘요|해 ?줘|주실|해주시|부탁|가능할까요|가능하세요|해 ?줄래|받아 ?줄|맡아 ?주|챙겨 ?줘|봐 ?줄래|좀 해|주시겠어요|맡아줄|해줄 수|써줄래|주실래요)/;
const DECLINE = /(어렵|못 ?(해|하|할)|안 ?돼|불가|출장|휴가라|병가|바빠서|힘들)/;
const NOT_TODO = /(확정|결정했|하기로 (했|함)|했어요?$|보냈어|완료|끝났|끝냈|안 해도|취소|됐어요?$)/;
const clauses = t => t.split(/(?<=[.?!]|요,|고,)\s+/).filter(Boolean);
function extractTodos(c) {
  const names = c.participants.filter(p => p.id !== 'u_me').map(p => [p.id, p.name.replace(/(님|씨)$/, '')]);
  const named = text => /나님|@나(\s|$|님)/.test(text) ? 'u_me' : (names.find(([, n]) => text.includes(n)) || [])[0];
  const out = [], ms = c.messages, requestOf = {};               // message id -> todo created from a request in it
  const other = a => c.type === 'dm' ? c.participants.find(p => p.id !== a).id : null;
  ms.forEach((m, k) => {
    const t = m.text.trim(), prev = ms[k - 1], next = ms[k + 1];
    const isPromise = PROMISE.test(t) && (!/\?/.test(t) || /^제가/.test(t));
    if (NOT_TODO.test(t) && !isPromise) return;
    // reply to a preceding request (open, or addressed to me) -> the requester's message is the source
    const req = prev && prev.authorId !== m.authorId && (REQUEST.test(prev.text) || /누가/.test(prev.text)) ? prev : null;
    if (req && (ACCEPT.test(t) || isPromise) && !DECLINE.test(t)) {
      const todos = requestOf[req.id] || [];
      const mine = todos.find(o => o.assignee === m.authorId);
      if (mine) return;                                                   // named request already captured
      const open = todos.find(o => o.assignee === null);
      if (open) { open.assignee = m.authorId; open.sources.push(m.id); open.due = open.due || dueOf(t, next && next.text); return; }
      if (!todos.length) { const o = {assignee: m.authorId, task: req.text, due: dueOf(req.text, t, next && next.text), sources: [req.id, m.id]}; out.push(o); requestOf[req.id] = [o]; return; }
      if (t.length <= 14) return;
    }
    if (isPromise) { const cl = clauses(t).find(x => PROMISE.test(x)) || t; out.push({assignee: m.authorId, task: t, due: dueOf(cl, t), sources: [m.id]}); return; }
    if (REQUEST.test(t) || /누가/.test(t)) {
      for (const cl of clauses(t).filter(x => REQUEST.test(x) || /누가/.test(x))) {
        let who = named(cl) || other(m.authorId);
        if (who === m.authorId) continue;
        const reply = who && ms.slice(k + 1).find(x => x.authorId === who);
        if (reply && DECLINE.test(reply.text)) continue;
        const o = {assignee: who || null, task: cl, due: dueOf(cl, t, reply && reply.text), sources: [m.id]};
        (requestOf[m.id] = requestOf[m.id] || []).push(o); out.push(o);
      }
    }
  });
  return out.filter(o => o.assignee);                                     // unclaimed open requests are not todos
}
if (typeof module !== 'undefined') module.exports = {extractTodos};
