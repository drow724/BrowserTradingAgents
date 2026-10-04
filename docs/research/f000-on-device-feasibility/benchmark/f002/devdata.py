# Builds the F002 dev corpus (all 1,110 labeled items seen so far, deduped by command) with prior model predictions.
import json
ds = json.load(open('dataset.json'))
src = [(ds['items'] + ds['heldout'] + ds['b5_underspecified'], None)]
b4 = json.load(open('results/b4.json')); pm = {r['id']: r.get('predModel') for r in b4['B4']['items'] + b4['B4h']['items']}
for ts, res in [('f001/testset.json', 'results/f001.json'), ('f001/testset-e2.json', 'results/f001-e2.json'), ('f001/testset-e3.json', 'results/f001-e3-r1.json')]:
    for r in json.load(open(res))['M']['items']: pm[r['id']] = r.get('predModel')
    src.append((json.load(open(ts)), None))
def gate(it):
    if it['gold'] == 'CLARIFY': return 'CLARIFY'
    if it['gold'] == 'NO_ACTION' and it['tag'] != 'insufficient_context': return 'NO_ACTION'
    return 'PASS'
def load():
    seen, out = set(), []
    for items, _ in src:
        for it in items:
            if it['command'] in seen: continue
            seen.add(it['command']); out.append(dict(it, gate=gate(it), model=pm.get(it['id'])))
    return out, ds['states']
if __name__ == '__main__':
    from collections import Counter
    d, _ = load(); print(len(d), Counter(x['gate'] for x in d), 'missing model pred', sum(x['model'] is None for x in d))
