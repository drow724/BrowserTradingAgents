# Scores F002-E1 runs per f002/preregistration.md. Run from benchmark/: python3 f002/score.py
import json, re, sys
sys.path.insert(0, 'f002')
from devdata import load
dev_items, states = load()
train = {it['command'] for it in dev_items}
test = {t['id']: t for t in json.load(open('f002/testset.json'))}
THREAD_REF = re.compile(r'스레드|쓰레드|답글|댓글')
def thread_exists(st): return st['conversationType'] == 'thread' or any(m['hasReplies'] for m in st['messages']) or 'selectedMessageId' in st
def guard(a, it, v2=True):
    st = states[it['state']]
    if a in ('SUMMARIZE','EXTRACT_TODOS','FIND_DECISIONS','DRAFT_REPLY','REMIND_LATER') and not st['messages']: return 'NO_ACTION'
    if a == 'READ_THREAD' and not thread_exists(st): return 'NO_ACTION'
    if v2 and a not in ('SEARCH_MESSAGES','NO_ACTION','CLARIFY') and THREAD_REF.search(it['command']) and not thread_exists(st): return 'NO_ACTION'
    return a
group = lambda it: 'under' if it['tag'] == 'underspecified' else 'leaning' if it['tag'] == 'ambiguous' else 'clear'
def ok(it, p): g = group(it); return p == 'CLARIFY' if g == 'under' else p in (it['gold'], 'CLARIFY') if g == 'leaning' else p == it['gold']
pct = lambda xs, q: sorted(xs)[min(len(xs) - 1, int(round(q / 100 * (len(xs) - 1))))]
def wilson(k, n, z=1.96):
    p = k / n; c = (p + z*z/(2*n)) / (1 + z*z/n); h = z * ((p*(1-p)/n + z*z/(4*n*n)) ** .5) / (1 + z*z/n); return f"{c-h:.1%}–{c+h:.1%}"
def variants(r, it):
    m = r.get('predModel')
    return dict(P=r['gate'] if r['gate'] != 'PASS' else (guard(m, it) if m else None),
                P_guardv1=r['gate'] if r['gate'] != 'PASS' else (guard(m, it, False) if m else None),
                keyword_v3=r['v3'] if r['v3'] else (guard(m, it) if m else None),
                intent9_only=r['i9'] if r['i9'] == 'CLARIFY' else guard(r['i9'], it))
def score_run(k):
    d = json.load(open(f'results/f002-r{k}.json'))['M']['items']
    rs = [(r, dict(r, **test[r['id']])) for r in d if test[r['id']]['command'] not in train]
    out = dict(n=len(rs), dropped=len(d) - len(rs))
    for v in ('P', 'P_guardv1', 'keyword_v3', 'intent9_only'):
        preds = [(variants(r, it)[v], it) for r, it in rs]
        acc = sum(ok(it, p) for p, it in preds); nc = sum(group(it) == 'clear' for _, it in preds); nu = sum(group(it) == 'under' for _, it in preds)
        over = sum(group(it) == 'clear' and p == 'CLARIFY' for p, it in preds); rec = sum(group(it) == 'under' and p == 'CLARIFY' for p, it in preds)
        out[v] = dict(accuracy=f"{acc}/{len(rs)} = {acc/len(rs):.1%}", wilson95=wilson(acc, len(rs)), recall=f"{rec}/{nu} = {rec/nu:.1%}", over=f"{over}/{nc} = {over/nc:.1%}",
                      _acc=acc/len(rs), _rec=rec/nu, _over=over/nc)
    called = [r for r, it in rs if r['gate'] == 'PASS']
    lat = [r['ms'] for r in called if 'ms' in r and not r['first']]
    out.update(model_called=len(called), p95=round(pct(lat, 95)), invalid=sum(r.get('predModel') is None and 'raw' in r for r in called),
               errors=[r['error'] for r in called if r.get('error')], structured=sum(bool(r.get('structuredOk')) for r in called) / len(called))
    P = out['P']; out['criteria'] = dict(accuracy=P['_acc'] >= .9, recall=P['_rec'] >= .8, over=P['_over'] <= .05, p95=out['p95'] <= 1000,
                                         invalid=out['invalid'] / len(called) < .01, structured=out['structured'] >= .99)
    out['PASS'] = all(out['criteria'].values())
    out['errors_P'] = [f"{'GATE' if r['gate'] != 'PASS' else 'MODEL'} {it['id']} [{it['tag']}] {it['command']} gold={it['gold']} pred={variants(r, it)['P']}" for r, it in rs if not ok(it, variants(r, it)['P'])]
    return out, {r['id']: variants(r, it)['P'] for r, it in rs}
runs = [score_run(k) for k in (1, 2, 3)]
passes = sum(o['PASS'] for o, _ in runs)
ids = runs[0][1].keys(); disagree = sum(len({runs[j][1][i] for j in range(3)}) > 1 for i in ids)
res = dict(verdict='PASS' if passes == 3 else 'PARTIAL' if passes else 'FAIL', passes=f'{passes}/3', P_run_disagreement=f'{disagree}/{len(ids)}',
           runs=[{k: v for k, v in o.items() if not k.startswith('_')} for o, _ in runs])
for o in res['runs']:
    for v in ('P', 'P_guardv1', 'keyword_v3', 'intent9_only'): o[v] = {k: x for k, x in o[v].items() if not k.startswith('_')}
json.dump(res, open('results/f002_scored.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'runs'}, ensure_ascii=False))
for i, o in enumerate(res['runs'], 1):
    print(f"r{i}: n={o['n']} dropped={o['dropped']} PASS={o['PASS']} p95={o['p95']} invalid={o['invalid']} structured={o['structured']:.3f} failed={[k for k, v in o['criteria'].items() if not v]}")
    for v in ('P', 'P_guardv1', 'keyword_v3', 'intent9_only'): print(f"   {v:13} {o[v]}")
