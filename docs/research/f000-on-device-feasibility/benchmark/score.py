# Scores results/b1.json per preregistration.md. Usage: python3 score.py [results/b1.json]
import json, sys, csv, statistics as st
from collections import Counter, defaultdict
src = sys.argv[1] if len(sys.argv) > 1 else 'results/b1.json'
d = json.load(open(src))
CONDS = [k for k in d if k != 'meta']

def pct(xs, q):
    xs = sorted(xs); return xs[min(len(xs) - 1, int(round(q / 100 * (len(xs) - 1))))] if xs else None

rnd = lambda v: round(v) if v is not None else None

def failure(r, cond):
    if r.get('error'): return 'timeout' if r['error'] == 'timeout' else 'model-error'
    if r['pred'] == r['gold']: return None
    if r['pred'] is None: return 'structured-output-failure' if cond == 'B' else 'invalid-action'
    if r.get('tag', 'extraction') == 'insufficient_context': return 'insufficient-context'
    if r.get('tag', 'extraction') == 'ambiguous': return 'ambiguous-command'
    return 'wrong-action'

def score(cond):
    rs = d[cond]['items']; n = len(rs)
    ok = [r for r in rs if r.get('pred') == r['gold']]
    warm = [r['ms'] for r in rs if 'ms' in r and not r['first']]
    first = [r['ms'] for r in rs if 'ms' in r and r['first']]
    tp = sum(1 for r in rs if r.get('pred') == 'NO_ACTION' and r['gold'] == 'NO_ACTION')
    pp = sum(1 for r in rs if r.get('pred') == 'NO_ACTION'); gp = sum(1 for r in rs if r['gold'] == 'NO_ACTION')
    tags = defaultdict(list)
    for r in rs: tags[r.get('tag', 'extraction')].append(r.get('pred') == r['gold'])
    out = dict(n=n, accuracy=len(ok) / n,
        invalid_rate=sum(1 for r in rs if 'raw' in r and r.get('pred') is None) / n,
        structured_ok=(sum(1 for r in rs if r.get('structuredOk')) / n) if cond != 'A' else None,
        no_action_precision=tp / pp if pp else None, no_action_recall=tp / gp if gp else None,
        tag_accuracy={t: f"{sum(v)}/{len(v)}" for t, v in tags.items()},
        failures=dict(Counter(f for f in (failure(r, cond) for r in rs) if f)),
        create_ms=round(d[cond]['createMs']), first_ms=round(first[0]) if first else None,
        warm_p50_ms=rnd(pct(warm, 50)), warm_p95_ms=rnd(pct(warm, 95)), warm_mean_ms=rnd(st.mean(warm) if warm else None),
        clone_p50_ms=round(pct([r['cloneMs'] for r in rs if 'cloneMs' in r], 50)))
    ex = [r for r in rs if r.get('tag') != 'insufficient_context']
    out['accuracy_excl_insufficient'] = f"{sum(r.get('pred') == r['gold'] for r in ex)}/{len(ex)}"
    if any('predModel' in r for r in rs):
        out['accuracy_model_only'] = sum(r.get('predModel') == r['gold'] for r in rs) / n
        ins = [r for r in rs if r.get('tag') == 'insufficient_context']; out['insufficient_model_only'] = f"{sum(r.get('predModel') == r['gold'] for r in ins)}/{len(ins)}"
    if cond != 'X':
        conf = Counter((r['gold'], r.get('pred')) for r in rs if r.get('pred') != r['gold'])
        out['top_confusions'] = [f"{g}->{p}: {c}" for (g, p), c in conf.most_common(8)]
    return out

res = {c: score(c) for c in CONDS}
# resources: samples between run start/end
try:
    rows = list(csv.DictReader(open(sys.argv[2] if len(sys.argv) > 2 else 'results/resources.csv')))
    num = lambda k: [float(r[k]) for r in rows if r[k] not in ('', None)]
    res['resources'] = dict(samples=len(rows), model_rss_mb_max=max(num('model_rss_mb')), model_rss_mb_p50=pct(num('model_rss_mb'), 50),
        model_cpu_p50=pct(num('model_cpu'), 50), gpu_proc_cpu_p50=pct(num('gpu_proc_cpu'), 50),
        gpu_util_p50=pct(num('gpu_util'), 50), gpu_util_p95=pct(num('gpu_util'), 95))
except FileNotFoundError: pass
res['meta'] = d['meta']
json.dump(res, open(src.replace('.json', '_scored.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
