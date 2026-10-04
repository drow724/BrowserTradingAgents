# Analyzes results/b3.json per preregistration-b3.md.
import json, sys, re, statistics as st
from collections import defaultdict
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'results/b3.json'))
ACTIONS = ['SEARCH_MESSAGES','READ_THREAD','SUMMARIZE','EXTRACT_TODOS','FIND_DECISIONS','DRAFT_REPLY','REMIND_LATER','NO_ACTION']
def pct(xs, q): xs = sorted(xs); return xs[min(len(xs) - 1, int(round(q / 100 * (len(xs) - 1))))]
def pred(r):
    try: a = json.loads(r['raw']).get('action'); return a if a in ACTIONS else None
    except Exception:
        up = r['raw'].upper(); hits = [(up.find(a), a) for a in ACTIONS if a in up]
        return min(hits)[1] if hits else None
by = defaultdict(dict)
for r in d['items']:
    if 'error' not in r: by[r['cond']][r['id']] = r
print('n per cond', {c: len(v) for c, v in sorted(by.items())}, 'errors', sum('error' in r for r in d['items']))
print(f"{'cond':4} {'p50':>6} {'p95':>6} {'ttft50':>7} {'dec50':>6} {'outLen':>6} {'inTok':>6} acc")
for c in sorted(by):
    rs = list(by[c].values()); tot = [r['total'] for r in rs]
    intok = [r['usage1'] - r['usage0'] for r in rs if isinstance(r.get('usage0'), (int, float)) and isinstance(r.get('usage1'), (int, float))]
    acc = sum(pred(r) == r['gold'] for r in rs)
    print(f"{c:4} {pct(tot,50):6.0f} {pct(tot,95):6.0f} {pct([r['ttft'] for r in rs],50):7.0f} {pct([r['decode'] for r in rs],50):6.0f} {st.median(len(r['raw']) for r in rs):6.0f} {st.median(intok) if intok else 'n/a':>6} {acc}/{len(rs)}")
print('\npaired median differences (ms); >=200 = major factor')
for name, a, b in [('schema in input', 'C1', 'C2'), ('constrained decoding', 'C2', 'C3'), ('output length', 'C3', 'C4'), ('system prompt length', 'C3', 'C5')]:
    ids = by[a].keys() & by[b].keys()
    for m in ['total', 'ttft', 'decode']:
        diff = st.median(by[a][i][m] - by[b][i][m] for i in ids)
        print(f"  {name:22} {a}-{b} {m:6} {diff:7.0f}  {'MAJOR' if diff >= 200 else ''}")
print('\nexample outputs', {c: next(iter(by[c].values()))['raw'][:60] for c in sorted(by)})
