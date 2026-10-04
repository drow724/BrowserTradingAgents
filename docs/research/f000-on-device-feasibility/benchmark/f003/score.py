# Scores TODO-extraction predictions against gold. Usage: python3 score.py <gold.json> <pred_A.json> [<pred_B.json> ...]
# pred file: {"<convId>": [{"assignee": "u_x", "task": "...", "due": "금요일"|null, "sources": ["m3"]}, ...], ...}
import json, sys, random
gold = {c['id']: c for c in json.load(open(sys.argv[1]))}

def match(preds, golds):
    """Greedy one-to-one matching by source-message overlap (ties prefer same assignee)."""
    pairs = sorted(((len(set(p['sources']) & set(g['sources'])), p.get('assignee') == g['assignee'], i, j)
                    for i, p in enumerate(preds) for j, g in enumerate(golds)), reverse=True)
    used_p, used_g, out = set(), set(), []
    for ov, _, i, j in pairs:
        if ov and i not in used_p and j not in used_g: used_p.add(i); used_g.add(j); out.append((i, j))
    return out

def conv_stats(cid, preds):
    c = gold[cid]; g = c['gold']; m = match(preds, g)
    st = dict(tp=len(m), np=len(preds), ng=len(g),
              strict=sum(preds[i].get('assignee') == g[j]['assignee'] and preds[i].get('due') == g[j]['due'] for i, j in m),
              assignee=sum(preds[i].get('assignee') == g[j]['assignee'] for i, j in m),
              due=sum(preds[i].get('due') == g[j]['due'] for i, j in m),
              xt_g=sum(x['cross_turn'] for x in g), xt_tp=sum(g[j]['cross_turn'] for _, j in m),
              distr_fp=sum(1 for i, p in enumerate(preds) if i not in {a for a, _ in m} and set(p['sources']) & set(c['distractors'])))
    return st

def agg(stats):
    s = {k: sum(x[k] for x in stats) for k in stats[0]}
    P = s['tp'] / s['np'] if s['np'] else 0; R = s['tp'] / s['ng'] if s['ng'] else 0
    sP = s['strict'] / s['np'] if s['np'] else 0; sR = s['strict'] / s['ng'] if s['ng'] else 0
    f = lambda p, r: 2 * p * r / (p + r) if p + r else 0
    return dict(P=P, R=R, F1=f(P, R), strictF1=f(sP, sR), assignee_acc=s['assignee'] / s['tp'] if s['tp'] else 0,
                due_acc=s['due'] / s['tp'] if s['tp'] else 0, cross_turn_recall=s['xt_tp'] / s['xt_g'] if s['xt_g'] else 0,
                distractor_fp=s['distr_fp'], n_pred=s['np'], n_gold=s['ng'])

def load_pred(path):
    p = json.load(open(path)); return {cid: p.get(cid, []) for cid in gold}

def report(path):
    pred = load_pred(path); per = {cid: conv_stats(cid, pred[cid]) for cid in gold}
    out = dict(overall=agg(list(per.values())))
    cats = sorted({c['category'] for c in gold.values()})
    out['by_category'] = {k: round(agg([per[cid] for cid in gold if gold[cid]['category'] == k])['F1'], 3) for k in cats}
    out['no_todo_fp'] = sum(len(pred[cid]) for cid in gold if gold[cid]['category'] == 'no_todo')
    return out, per

def boot_diff(perA, perB, key='F1', n=2000, seed=0):
    ids = list(gold); rnd = random.Random(seed); ds = []
    for _ in range(n):
        smp = [rnd.choice(ids) for _ in ids]
        ds.append(agg([perB[i] for i in smp])[key] - agg([perA[i] for i in smp])[key])
    ds.sort(); return round(ds[int(.025 * n)], 3), round(ds[int(.975 * n)], 3)

if __name__ == '__main__':
    res = {p: report(p) for p in sys.argv[2:]}
    for p, (o, _) in res.items():
        print(p); print('  ', {k: (round(v, 3) if isinstance(v, float) else v) for k, v in o['overall'].items()})
        print('   by_category F1', o['by_category'], 'no_todo_fp', o['no_todo_fp'])
    base = sys.argv[2]
    for p in sys.argv[3:]:
        for key in ('F1', 'strictF1'):
            print(f'  {key} diff {p} - {base}: {res[p][0]["overall"][key] - res[base][0]["overall"][key]:+.3f}  95% bootstrap CI {boot_diff(res[base][1], res[p][1], key)}')
