// Feature 007: the same-origin market boundary (specs/007-…/contracts/market-data-api.md). Deterministic
// data preparation only; no inference. The Yahoo base URL comes from the server environment, never from
// the request.
import { fail, isFailure, LIVE_INSTRUMENT, sessionDate, symbolInstrument, type MarketDataFailure } from '../../../src/market-bundle.ts';
import { acquireYahoo, ADAPTER_ID, quote, YAHOO_ORIGIN } from '../../../src/server/market-provider.ts';
import { tossAvailable } from '../../../src/server/toss.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // already the Next 16 default for Route Handlers; explicit on purpose

const STATUS: Record<MarketDataFailure['kind'], number> = {
  'invalid-request': 400, 'credential-missing': 503, network: 502, unauthorized: 502, 'rate-limited': 503,
  'provider-error': 502, timeout: 504, unavailable: 502, 'invalid-data': 502, cancelled: 499,
};
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const t0 = performance.now();
  // Feature 014: holding symbols by form only (allowlist, before any outbound call); the log never names them.
  // The demo instrument keeps Feature 007's uncached contract; holding symbols are cached per trading day (R7).
  // Feature 015: `source=toss` (local provider, research R4) is available only with the user's own Toss key.
  const params = new URL(request.url).searchParams;
  const instrument = symbolInstrument(params.get('symbol') ?? '');
  const source = params.get('source') === 'toss' ? 'toss' : 'yahoo';
  const options = { signal: request.signal, baseUrl: process.env.BTA_YAHOO_BASE_URL ?? YAHOO_ORIGIN };
  const result = !instrument ? fail('request', 'invalid-request')
    : source === 'toss' && !tossAvailable() ? fail('request', 'credential-missing')
    : source === 'yahoo' && instrument.symbol === LIVE_INSTRUMENT.symbol
      ? await acquireYahoo(instrument, sessionDate(Date.now() / 1000, instrument.timeZone), options)
      : await quote(instrument, sessionDate(Date.now() / 1000, instrument.timeZone), options, source);
  const status = isFailure(result) ? STATUS[result.kind] : 200;
  console.info(JSON.stringify({ adapter: ADAPTER_ID, ms: Math.round(performance.now() - t0),
    status: `${String(status)[0]}xx`, kind: isFailure(result) ? result.kind : null }));
  return Response.json(result, { status, headers: NO_STORE });
}
