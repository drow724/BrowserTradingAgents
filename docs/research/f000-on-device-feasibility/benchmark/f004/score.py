# Scores F004 per preregistration.md from blind judge outputs + key. Run inside f004/.
import json, random, re
test = {s['id']: s for s in json.load(open('test.json'))}
key = json.load(open('results/judge_key.json'))
J = {**json.load(open('results/judge_out_1.json')), **json.load(open('results/judge_out_2.json'))}
cands = {'A': json.load(open('results/test_template.json')), 'C': json.load(open('results/test_haiku.json'))}
for r in (1, 2, 3): cands[f'B{r}'] = json.load(open(f'../results/f004-test-nano-r{r}.json'))
lat = {f'B{r}': sorted(x['ms'] for x in cands[f'B{r}']['timing'] if 'ms' in x) for r in (1, 2, 3)}
for r in (1, 2, 3): cands[f'B{r}'] = cands[f'B{r}']['drafts']
per = {c: {} for c in cands}                                  # condition -> scenario -> judge record
for sid, labels in key['main'].items():
    for lab, cond in labels.items(): per[cond][sid] = J[sid][lab]
EXACT = re.compile(r'https?://\S+|[\w.]+@[\w.]+|\d')
def exact_ok(c, sid):
    items = [m for m in test[sid]['must_include'] if EXACT.search(m)]
    toks = [t for m in items for t in re.findall(r'https?://[^\s,]+|[\w.]+@[\w.]+\.\w+|\d[\d,./~:]*\d|\d', m)]
    return [t in cands[c][sid] for t in toks]
def summ(c):
    rs = per[c]; n = len(rs)
    ex = [x for sid in rs for x in exact_ok(c, sid)]
    out = dict(usable=sum(r['usable'] for r in rs.values()) / n, hallucination=sum(r['hallucination'] for r in rs.values()) / n,
               intent2=sum(r['intent'] == 2 for r in rs.values()) / n, register2=sum(r['register'] == 2 for r in rs.values()) / n,
               natural=sum(r['natural'] for r in rs.values()) / n, exact_fact_ok=f"{sum(ex)}/{len(ex)}")
    if c in lat: L = lat[c]; out.update(p50_ms=round(L[len(L) // 2]), p95_ms=round(L[int(.95 * (len(L) - 1))]))
    return out
def boot(a, b, n=2000):
    ids = list(test); rnd = random.Random(0); ds = []
    for _ in range(n):
        smp = [rnd.choice(ids) for _ in ids]
        ds.append(sum(per[b][i]['usable'] for i in smp) / len(smp) - sum(per[a][i]['usable'] for i in smp) / len(smp))
    ds.sort(); return round(ds[50], 3), round(ds[1949], 3)
res = {c: summ(c) for c in ['A', 'B1', 'B2', 'B3', 'C']}
for c in ['B1', 'B2', 'B3', 'C']: res[c]['usable_minus_A'] = round(res[c]['usable'] - res['A']['usable'], 3); res[c]['ci95'] = boot('A', c)
by_cat = {c: {} for c in res}
for c in res:
    for cat in sorted({s['category'] for s in test.values()}):
        ids = [i for i in test if test[i]['category'] == cat]; by_cat[c][cat] = f"{sum(per[c][i]['usable'] for i in ids)}/{len(ids)}"
# judge consistency on re-judged subset
R = json.load(open('results/judge_out_re.json')); agree = []; 
for sid, labels in key['re'].items():
    for lab, cond in labels.items(): agree.append((per[cond][sid]['usable'], R[sid][lab]['usable']))
po = sum(a == b for a, b in agree) / len(agree); p1 = sum(a for a, _ in agree) / len(agree); p2 = sum(b for _, b in agree) / len(agree)
pe = p1 * p2 + (1 - p1) * (1 - p2); kappa = (po - pe) / (1 - pe) if pe < 1 else 1
B = [res[f'B{r}'] for r in (1, 2, 3)]
practical = all(b['usable'] >= .8 and b['hallucination'] <= .05 and b['p95_ms'] <= 6000 for b in B)
incremental = all(b['usable_minus_A'] >= .2 and b['ci95'][0] > 0 for b in B)
verdict = '쓸 만함' if practical and incremental else '템플릿보다는 낫지만 그대로 쓰기 어려움' if incremental else '증분 가치 없음'
out = dict(verdict=verdict, practical=practical, incremental=incremental, judge_consistency=dict(n=len(agree), agreement=round(po, 3), kappa=round(kappa, 3)), results=res, usable_by_category=by_cat)
json.dump(out, open('results/f004_scored.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(out, ensure_ascii=False, indent=1))
