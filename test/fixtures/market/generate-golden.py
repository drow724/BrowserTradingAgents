"""Feature 007 T004: golden indicator values for test/market-bundle.test.ts. Offline, no network.

Run once with the frozen TradingAgents checkout's venv (observed stockstats 0.6.8):
    ~/git/TradingAgents/.venv/bin/python test/fixtures/market/generate-golden.py
Writes history.json (synthetic sessions) and golden.json (the 12 indicators at rows 30, 250, last).
"""
import importlib.metadata
import json, math, os, sys

import pandas as pd
from stockstats import wrap

NAMES = ['close_10_ema', 'close_50_sma', 'close_200_sma', 'macd', 'macds', 'macdh', 'rsi',
         'boll', 'boll_ub', 'boll_lb', 'atr', 'vwma']
N = 1300
dates = pd.bdate_range('2021-01-04', periods=N)  # weekdays only
rows = []
for i, d in enumerate(dates):
    close = 100 + 10 * math.sin(i / 37) + i * 0.02
    rows.append({'date': d.strftime('%Y-%m-%d'), 'open': close - 0.4 * math.cos(i / 5),
                 'high': close + 1.1 + 0.3 * math.sin(i / 3), 'low': close - 1.2 - 0.2 * math.cos(i / 7),
                 'close': close, 'volume': 1_000_000 + (i * 7919) % 250_000})

df = pd.DataFrame(rows).set_index('date')
full = wrap(df.copy())
for n in NAMES:
    full[n]

golden = {'stockstats': importlib.metadata.version('stockstats'),
          'pandas': importlib.metadata.version('pandas'), 'rows': {}}
for r in (30, 250, N - 1):
    pre = wrap(df.iloc[:r + 1].copy())  # causal: prefix up to r
    vals = {}
    for n in NAMES:
        v = float(pre[n].iloc[r])
        assert math.isfinite(v), (n, r)
        assert v == float(full[n].iloc[r]), f'non-causal {n} at {r}'
        vals[n] = v
    golden['rows'][str(r)] = vals

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, 'history.json'), 'w') as f:
    json.dump(rows, f, indent=0)
    f.write('\n')
with open(os.path.join(here, 'golden.json'), 'w') as f:
    json.dump(golden, f, indent=2)
    f.write('\n')
print('ok', N, sys.version.split()[0])
