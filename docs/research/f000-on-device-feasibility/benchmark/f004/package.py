# Builds blind judge packages: candidates shuffled per scenario (seeded); the condition key is written to a separate file the judges never read.
import json, random
test = json.load(open('test.json'))
cands = {'A': json.load(open('results/test_template.json')), 'C': json.load(open('results/test_haiku.json'))}
for r in (1, 2, 3): cands[f'B{r}'] = json.load(open(f'../results/f004-test-nano-r{r}.json'))['drafts']
def build(ids, seed):
    rnd, pkg, key = random.Random(seed), [], {}
    for s in test:
        if s['id'] not in ids: continue
        conds = list(cands); rnd.shuffle(conds)
        key[s['id']] = {f'X{i+1}': c for i, c in enumerate(conds)}
        pkg.append(dict(s, candidates={f'X{i+1}': cands[c][s['id']] for i, c in enumerate(conds)}))
    return pkg, key
ids = [s['id'] for s in test]
main, key = build(set(ids), 1004)
json.dump(main[:30], open('results/judge_in_1.json', 'w'), ensure_ascii=False, indent=1)
json.dump(main[30:], open('results/judge_in_2.json', 'w'), ensure_ascii=False, indent=1)
re_ids = set(random.Random(7).sample(ids, 12))
re_pkg, re_key = build(re_ids, 2026)
json.dump(re_pkg, open('results/judge_in_re.json', 'w'), ensure_ascii=False, indent=1)
json.dump({'main': key, 're': re_key}, open('results/judge_key.json', 'w'), indent=1)
print(len(main), len(re_pkg))
