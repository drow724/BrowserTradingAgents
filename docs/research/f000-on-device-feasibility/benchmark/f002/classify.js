// In-browser/Node inference for the exported TF-IDF(char 1-3, sublinear) + logistic-regression models (f002/*.json).
function makeClassifier(m) {
  const [lo, hi] = m.cfg.ngram;
  return text => {
    // sklearn 'char' analyzer: lowercase, collapse whitespace, all n-grams over the whole string.
    const s = text.toLowerCase().replace(/\s\s+/g, ' '), chars = [...s], tf = new Map();
    for (let n = lo; n <= hi; n++) for (let i = 0; i + n <= chars.length; i++) {
      const j = m.vocab[chars.slice(i, i + n).join('')]; if (j !== undefined) tf.set(j, (tf.get(j) || 0) + 1);
    }
    let norm = 0; const feats = [];
    for (const [j, c] of tf) { const v = (1 + Math.log(c)) * m.idf[j]; feats.push([j, v]); norm += v * v; }
    norm = Math.sqrt(norm) || 1;
    let best = -Infinity, arg = 0;
    m.classes.forEach((_, k) => { let z = m.intercept[k]; for (const [j, v] of feats) z += m.coef[k][j] * v / norm; if (z > best) { best = z; arg = k; } });
    return m.classes[arg];
  };
}
if (typeof module !== 'undefined') module.exports = {makeClassifier};
