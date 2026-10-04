# Scores results/b5.json per preregistration-b5.md, plus B4 rescored under B5 rules (baseline).
import json, sys
def group(r): return 'under' if r['tag'] == 'underspecified' else 'leaning' if r['tag'] == 'ambiguous' else 'clear'
def ok(r, key='pred'):
    p, g = r.get(key), group(r)
    return p == 'CLARIFY' if g == 'under' else p in (r['gold'], 'CLARIFY') if g == 'leaning' else p == r['gold']
def pct(xs, q): xs = sorted(xs); return xs[min(len(xs) - 1, int(round(q / 100 * (len(xs) - 1))))]
def report(rs, name):
    G = {g: [r for r in rs if group(r) == g] for g in ('clear', 'leaning', 'under')}
    n = len(rs); acc = sum(ok(r) for r in rs)
    over = sum(r.get('pred') == 'CLARIFY' for r in G['clear'])
    cl = [r for r in rs if r.get('pred') == 'CLARIFY']
    warm = [r['ms'] for r in rs if 'ms' in r and not r['first']]
    out = dict(name=name, n=n, accuracy=f"{acc}/{n} = {acc/n:.1%}",
        model_only=f"{sum(ok(r, 'predModel') for r in rs)}/{n}",
        groups={g: f"{sum(ok(r) for r in v)}/{len(v)}" for g, v in G.items() if v},
        clarify_recall=f"{sum(r.get('pred') == 'CLARIFY' for r in G['under'])}/{len(G['under'])}" if G['under'] else None,
        over_clarify=f"{over}/{len(G['clear'])} = {over/len(G['clear']):.1%}",
        clarify_precision=f"{sum(group(r) != 'clear' for r in cl)}/{len(cl)}" if cl else None,
        invalid=sum('raw' in r and r.get('pred') is None for r in rs), errors=[(r['id'], r['error']) for r in rs if r.get('error')],
        structured_ok=f"{sum(bool(r.get('structuredOk')) for r in rs)}/{n}",
        p50_ms=round(pct(warm, 50)) if warm else None, p95_ms=round(pct(warm, 95)) if warm else None)
    return out, {r['id']: ok(r) for r in G['clear']}
b5, c5 = report(json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'results/b5.json'))['B5']['items'], 'B5')
b4d = json.load(open('results/b4.json')); b4, c4 = report(b4d['B4']['items'] + b4d['B4h']['items'], 'B4 rescored (no CLARIFY possible)')
b5['clear_vs_B4'] = dict(regressed=sorted(i for i in c5 if c4.get(i) and not c5[i]), fixed=sorted(i for i in c5 if c5[i] and c4.get(i) is False))
res = dict(B5=b5, B4_baseline=b4)
json.dump(res, open('results/b5_scored.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(res, ensure_ascii=False, indent=1))
