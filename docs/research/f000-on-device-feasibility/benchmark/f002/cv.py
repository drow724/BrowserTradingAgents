# 5-fold CV on dev to choose the gate classifier config (and report a 9-way text-only classifier as an ablation).
import re, numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from devdata import load
d, states = load()
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
def pipeline_score(gate_pred, v2=True):
    acc = n = over = rec = 0
    for it, g in zip(d, gate_pred):
        p = g if g != 'PASS' else (guard(it['model'], it, v2) if it['model'] else None)
        if p is None: continue
        n += 1; acc += ok(it, p); over += group(it) == 'clear' and p == 'CLARIFY'; rec += group(it) == 'under' and p == 'CLARIFY'
    nu = sum(group(it) == 'under' for it in d); nc = sum(group(it) == 'clear' for it in d)
    return f"pipeline acc {acc}/{n}={acc/n:.1%} recall {rec}/{nu} over {over}/{nc}={over/nc:.1%}"
X = [it['command'] for it in d]; y = [it['gate'] for it in d]
cv = StratifiedKFold(5, shuffle=True, random_state=0)
configs = {f"{an}{lo}-{hi} C={C} {cw}": (an, lo, hi, C, cw) for an in ('char_wb', 'char') for lo, hi in ((1, 3), (2, 4)) for C in (2, 8, 32) for cw in (None, 'balanced')}
best = None
for name, (an, lo, hi, C, cw) in configs.items():
    m = make_pipeline(TfidfVectorizer(analyzer=an, ngram_range=(lo, hi), min_df=2, sublinear_tf=True), LogisticRegression(C=C, class_weight=cw, max_iter=3000))
    oof = cross_val_predict(m, X, y, cv=cv)
    gacc = np.mean(np.array(oof) == np.array(y)); s = pipeline_score(oof)
    a = float(re.search(r'=(\d+\.\d)%', s).group(1))
    print(f"{name:32} gate {gacc:.1%} | {s}")
    if best is None or a > best[0]: best = (a, name, oof)
print('\nBEST', best[1]); print('  guard v1 (no thread fix):', pipeline_score(best[2], v2=False)); print('  guard v2:', pipeline_score(best[2]))
from collections import Counter
print('  keyword v3 reference on same dev is in dev_eval_v2 (dev-tuned).')
# 9-way text-only ablation (no LLM): label = gold except insufficient items get excluded from training targets via their gold (NO_ACTION) — guard handles state.
y9 = [it['gold'] for it in d]
an, lo, hi, C, cw = configs[best[1]]
m9 = make_pipeline(TfidfVectorizer(analyzer=an, ngram_range=(lo, hi), min_df=2, sublinear_tf=True), LogisticRegression(C=C, class_weight=cw, max_iter=3000))
oof9 = cross_val_predict(m9, X, y9, cv=cv)
acc9 = sum(ok(it, guard(p, it) if p != 'CLARIFY' else p) for it, p in zip(d, oof9))
print(f"\n9-way text-only classifier (no LLM) + guard v2: {acc9}/{len(d)} = {acc9/len(d):.1%}")
