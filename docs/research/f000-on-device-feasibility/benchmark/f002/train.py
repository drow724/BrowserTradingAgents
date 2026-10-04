# Trains the frozen F002 gate (and 9-way ablation) on all dev data; exports weights for in-browser inference.
import json, numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from devdata import load
d, _ = load(); X = [it['command'] for it in d]
CFG = dict(analyzer='char', ngram_range=(1, 3), min_df=2, sublinear_tf=True)  # chosen by 5-fold CV (cv.py)
def fit_export(y, path):
    vec = TfidfVectorizer(**CFG); Xv = vec.fit_transform(X)
    clf = LogisticRegression(C=2, class_weight='balanced', max_iter=3000).fit(Xv, y)
    vocab = {k: int(v) for k, v in vec.vocabulary_.items()}
    json.dump(dict(cfg=dict(ngram=[1, 3], lowercase=True, sublinear_tf=True), vocab=vocab, idf=vec.idf_.round(6).tolist(),
                   classes=clf.classes_.tolist(), coef=clf.coef_.round(6).tolist(), intercept=clf.intercept_.round(6).tolist()),
              open(path, 'w'), ensure_ascii=False)
    return vec, clf
for name, y in (('gate', [it['gate'] for it in d]), ('intent9', [it['gold'] for it in d])):
    vec, clf = fit_export(y, f'f002/{name}.json')
    json.dump(clf.predict(vec.transform(X)).tolist(), open(f'f002/{name}_py_preds.json', 'w'))
    print(name, 'classes', clf.classes_.tolist(), 'features', len(vec.vocabulary_))
