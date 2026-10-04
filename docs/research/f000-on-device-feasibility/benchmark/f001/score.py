# Scores results/f001.json per f001/preregistration.md. Run from benchmark/.
import json, sys
RES, TEST = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ('results/f001.json', 'f001/testset.json')
from collections import Counter
d = json.load(open(RES)); ds = json.load(open('dataset.json'))
dev = {i['command'] for k in ('items', 'heldout', 'b5_underspecified') for i in ds[k]}
ORDER = ['f001/testset.json', 'f001/testset-e2.json', 'f001/testset-e3.json']  # each test set is deduped against earlier ones only
for f in ORDER[:ORDER.index(TEST)]: dev |= {t['command'] for t in json.load(open(f))}
test = {t['id']: t for t in json.load(open(TEST))}
rs = [r for r in d['M']['items'] if test[r['id']]['command'] not in dev]
dropped = len(d['M']['items']) - len(rs)
group = lambda r: 'under' if r['tag'] == 'underspecified' else 'leaning' if r['tag'] == 'ambiguous' else 'clear'
def ok(r, p): g = group(r); return p == 'CLARIFY' if g == 'under' else p in (r['gold'], 'CLARIFY') if g == 'leaning' else p == r['gold']
pct = lambda xs, q: sorted(xs)[min(len(xs) - 1, int(round(q / 100 * (len(xs) - 1))))]
def summary(key):
    G = {g: [r for r in rs if group(r) == g] for g in ('clear', 'leaning', 'under')}
    acc = sum(ok(r, r.get(key)) for r in rs); over = sum(r.get(key) == 'CLARIFY' for r in G['clear'])
    tags = {}
    for r in rs: tags.setdefault(r['tag'], [0, 0]); tags[r['tag']][0] += ok(r, r.get(key)); tags[r['tag']][1] += 1
    return dict(accuracy=f"{acc}/{len(rs)} = {acc/len(rs):.1%}", groups={g: f"{sum(ok(r, r.get(key)) for r in v)}/{len(v)}" for g, v in G.items()},
        clarify_recall=f"{sum(r.get(key) == 'CLARIFY' for r in G['under'])}/{len(G['under'])}", over_clarify=f"{over}/{len(G['clear'])} = {over/len(G['clear']):.1%}",
        tags={t: f"{a}/{b}" for t, (a, b) in tags.items()})
called = [r for r in rs if r['pre'] is None]
lat = [r['ms'] for r in called if 'ms' in r and not r['first']]
latall = [r['ms'] if r['pre'] is None else 0 for r in rs if 'ms' in r and not r['first']]
fired = [r for r in rs if r['pre']]
def wilson(k, n, z=1.96):
    p = k / n; c = (p + z*z/(2*n)) / (1 + z*z/n); h = z * ((p*(1-p)/n + z*z/(4*n*n)) ** .5) / (1 + z*z/n); return f"{c-h:.1%}–{c+h:.1%}"
accP = sum(ok(r, r['predP']) for r in rs)
res = dict(n=len(rs), accuracy_P_wilson95=wilson(accP, len(rs)), dropped_exact_dev_duplicates=dropped, P=summary('predP'), M=summary('pred'),
    model_called=len(called), p95_model_called_ms=round(pct(lat, 95)), p50_model_called_ms=round(pct(lat, 50)), p95_all_ms_reference=round(pct(latall, 95)),
    invalid=sum(r.get('predModel') is None for r in called), errors=[(r['id'], r['error']) for r in rs if r.get('error')],
    structured_ok_called=f"{sum(bool(r.get('structuredOk')) for r in called)}/{len(called)}",
    rule_fired={k: f"{sum(ok(r, r['pre']) for r in fired if r['pre'] == k)}/{sum(r['pre'] == k for r in fired)} correct" for k in ('NO_ACTION', 'CLARIFY')},
    errors_P=[f"{'RULE' if r['pre'] else 'MODEL'} {r['id']} [{r['tag']}] {test[r['id']]['command']} gold={r['gold']} pred={r['predP']}" for r in rs if not ok(r, r['predP'])])
json.dump(res, open(RES.replace('.json', '_scored.json'), 'w'), ensure_ascii=False, indent=1); print(json.dumps(res, ensure_ascii=False, indent=1))
