// Feature 015 (ADR 0002, contracts/toss.md): the only Toss Securities client. Read-only by construction — the
// allowlist below is every request this module can make; order paths do not exist here. Local only: available when
// the user's own credentials are in the local server environment. Secrets, the token and the account seq never leave
// this module; the log line carries no data.
const ALLOWED = ['POST /oauth2/token', 'GET /api/v1/accounts', 'GET /api/v1/holdings', 'GET /api/v1/candles'] as const;
export const TOSS_ALLOWLIST: readonly string[] = ALLOWED;

export type TossKind = 'not-configured' | 'unauthorized' | 'forbidden-ip' | 'rate-limited' | 'provider-error'
  | 'invalid-data' | 'timeout' | 'network' | 'cancelled' | 'ambiguous-account';
export type TossFailure = { boundary: 'toss'; kind: TossKind };
export const isTossFailure = (x: unknown): x is TossFailure => (x as TossFailure | null)?.boundary === 'toss';
const failure = (kind: TossKind): TossFailure => ({ boundary: 'toss', kind });

// The fields the app keeps from a Toss holding (spike S1); decimal strings as Toss reports them.
export type TossPosition = { code: string; country: string; name: string; quantity: string; averagePrice: string; currency: string };
export type TossRow = { date: string; open: number; high: number; low: number; close: number; volume: number; adjclose: number };

const config = () => {
  const e = process.env;
  return e.BTA_TOSS_CLIENT_ID && e.BTA_TOSS_CLIENT_SECRET && !e.VERCEL
    ? { id: e.BTA_TOSS_CLIENT_ID, secret: e.BTA_TOSS_CLIENT_SECRET, seq: e.BTA_TOSS_ACCOUNT_SEQ || undefined,
      base: e.BTA_TOSS_BASE_URL || 'https://openapi.tossinvest.com' }
    : null;
};
export const tossAvailable = () => config() !== null;

let token: Promise<{ value: string; until: number } | TossFailure> | undefined;
export const resetToss = () => { token = undefined; };

async function request(method: 'GET' | 'POST', path: string, o: { signal: AbortSignal; query?: Record<string, string>;
  headers?: Record<string, string>; body?: URLSearchParams }): Promise<unknown> {
  if (!ALLOWED.includes(`${method} ${path}` as (typeof ALLOWED)[number])) throw new Error(`Toss request not allowed: ${method} ${path}`);
  const c = config();
  if (!c) return failure('not-configured');
  const t0 = performance.now(), limit = AbortSignal.timeout(15_000);
  let result: unknown, status = 0;
  try {
    const res = await fetch(`${c.base}${path}${o.query ? `?${new URLSearchParams(o.query)}` : ''}`, { method, body: o.body,
      headers: o.headers, cache: 'no-store', redirect: 'manual', signal: AbortSignal.any([o.signal, limit]) });
    status = res.status;
    result = res.status === 401 ? failure('unauthorized') : res.status === 403 ? failure('forbidden-ip')
      : res.status === 429 ? failure('rate-limited') : !res.ok ? failure('provider-error')
      : await res.json().catch(() => failure('invalid-data'));
  } catch {
    result = failure(o.signal.aborted ? 'cancelled' : limit.aborted ? 'timeout' : 'network');
  }
  console.info(JSON.stringify({ provider: 'toss', ms: Math.round(performance.now() - t0), status: `${String(status)[0]}xx`,
    kind: isTossFailure(result) ? result.kind : null }));
  return result;
}

// One token per server, shared by concurrent callers, renewed a minute before it expires (24 h, spike S1).
async function bearer(signal: AbortSignal): Promise<Record<string, string> | TossFailure> {
  const c = config();
  if (!c) return failure('not-configured');
  const current = await token;
  if (!current || isTossFailure(current) || current.until < Date.now()) {
    token = request('POST', '/oauth2/token', { signal, headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.id, client_secret: c.secret }) })
      .then((b) => {
        if (isTossFailure(b)) return b;
        const { access_token: value, expires_in: ttl } = (b ?? {}) as { access_token?: unknown; expires_in?: unknown };
        return typeof value === 'string' && typeof ttl === 'number' ? { value, until: Date.now() + (ttl - 60) * 1000 } : failure('invalid-data');
      });
  }
  const t = await token!;
  return isTossFailure(t) ? t : { authorization: `Bearer ${t.value}` };
}

async function accountSeq(auth: Record<string, string>, signal: AbortSignal): Promise<string | TossFailure> {
  const own = config()?.seq;
  if (own) return own;
  const b = await request('GET', '/api/v1/accounts', { signal, headers: auth });
  if (isTossFailure(b)) return b;
  const list = (b as { result?: { accountSeq?: unknown }[] } | null)?.result;
  if (!Array.isArray(list)) return failure('invalid-data');
  return list.length === 1 && list[0].accountSeq != null ? String(list[0].accountSeq) : failure('ambiguous-account');
}

export async function tossPositions(signal: AbortSignal): Promise<TossPosition[] | TossFailure> {
  const auth = await bearer(signal);
  if (isTossFailure(auth)) return auth;
  const seq = await accountSeq(auth, signal);
  if (isTossFailure(seq)) return seq;
  const b = await request('GET', '/api/v1/holdings', { signal, headers: { ...auth, 'x-tossinvest-account': seq } });
  if (isTossFailure(b)) return b;
  const items = (b as { result?: { items?: Record<string, unknown>[] } } | null)?.result?.items;
  if (!Array.isArray(items)) return failure('invalid-data');
  return items.map((i) => ({ code: String(i.symbol), country: String(i.marketCountry), name: String(i.name),
    quantity: String(i.quantity), averagePrice: String(i.averagePurchasePrice), currency: String(i.currency) }));
}

// Daily candles, oldest first, at most `pages` × 100 sessions (spike S1: newest first, `nextBefore` pages back).
// Prices as Toss reports them; there is no separate adjusted series (adaptation A-015-1).
export async function tossRows(code: string, timeZone: string, signal: AbortSignal, pages = 3): Promise<TossRow[] | TossFailure> {
  const auth = await bearer(signal);
  if (isTossFailure(auth)) return auth;
  const rows: TossRow[] = [];
  let before: string | undefined;
  for (let p = 0; p < pages; p++) {
    const b = await request('GET', '/api/v1/candles', { signal, headers: auth,
      query: { symbol: code, interval: '1d', ...(before ? { before } : {}) } });
    if (isTossFailure(b)) return b;
    const r = (b as { result?: { candles?: Record<string, unknown>[]; nextBefore?: unknown } } | null)?.result;
    if (!Array.isArray(r?.candles)) return failure('invalid-data');
    for (const c of r.candles) {
      const n = (k: string) => (c[k] == null ? NaN : Number(c[k]));
      const t = Date.parse(String(c.timestamp));
      if (!Number.isFinite(t)) return failure('invalid-data');
      const close = n('closePrice');
      rows.push({ date: new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(t)), open: n('openPrice'), high: n('highPrice'),
        low: n('lowPrice'), close, volume: n('volume'), adjclose: close });
    }
    before = typeof r.nextBefore === 'string' && r.nextBefore ? r.nextBefore : undefined;
    if (!before) break;
  }
  return rows.reverse();
}
