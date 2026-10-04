# Aggregates the three E3 runs (results/f001-e3-r{1,2,3}_scored.json) per preregistration-e3.md.
import json, re
runs = [json.load(open(f'results/f001-e3-r{i}_scored.json')) for i in (1, 2, 3)]
raw = [json.load(open(f'results/f001-e3-r{i}.json'))['M']['items'] for i in (1, 2, 3)]
num = lambda s: int(re.match(r'(\d+)/', s).group(1)); den = lambda s: int(re.match(r'\d+/(\d+)', s).group(1))
def crit(r):
    P = r['P']; called = r['model_called']
    c = dict(accuracy=num(P['accuracy']) / den(P['accuracy']) >= .90, recall=num(P['clarify_recall']) / den(P['clarify_recall']) >= .80,
             over_clarify=num(P['over_clarify']) / den(P['over_clarify']) <= .05, p95=r['p95_model_called_ms'] <= 1000,
             invalid=r['invalid'] / called < .01, structured=num(r['structured_ok_called']) / called >= .99)
    return c, all(c.values())
rows = []
for i, r in enumerate(runs, 1):
    c, allok = crit(r)
    rows.append(dict(run=f'r{i}', accuracy=r['P']['accuracy'], wilson95=r['accuracy_P_wilson95'], recall=r['P']['clarify_recall'], over=r['P']['over_clarify'],
                     p95=r['p95_model_called_ms'], invalid=r['invalid'], structured=r['structured_ok_called'], errors=len(r['errors']), failed=[k for k, v in c.items() if not v], PASS=allok))
passes = sum(x['PASS'] for x in rows)
called = [k for k, it in enumerate(raw[0]) if it['pre'] is None]
disagree = sum(len({raw[j][k].get('pred') for j in range(3)}) > 1 for k in called)
out = dict(runs=rows, verdict='PASS' if passes == 3 else 'PARTIAL' if passes else 'FAIL', passes=f'{passes}/3',
           model_called=len(called), run_disagreement=f'{disagree}/{len(called)} = {disagree/len(called):.1%}',
           rule_vs_model_errors_r1=dict(rule=sum(e.startswith('RULE') for e in runs[0]['errors_P']), model=sum(e.startswith('MODEL') for e in runs[0]['errors_P'])))
json.dump(out, open('results/f001-e3_summary.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(out, ensure_ascii=False, indent=1))
