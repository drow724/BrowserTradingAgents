// Feature 007: the same-origin market boundary (specs/007-…/contracts/market-data-api.md). Deterministic
// data preparation only; no inference. The Yahoo base URL comes from the server environment, never from
// the request.
import { fail, isFailure, LIVE_INSTRUMENT, sessionDate, symbolInstrument, type MarketDataFailure } from '../../../src/market-bundle.ts';
import { acquireYahoo, ADAPTER_ID, quote, YAHOO_ORIGIN } from '../../../src/server/market-provider.ts';

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
  const instrument = symbolInstrument(new URL(request.url).searchParams.get('symbol') ?? '');
  const acquire = instrument?.symbol === LIVE_INSTRUMENT.symbol ? acquireYahoo : quote;
  const result = !instrument
    ? fail('request', 'invalid-request')
    : await acquire(instrument, sessionDate(Date.now() / 1000, instrument.timeZone), {
      signal: request.signal, baseUrl: process.env.BTA_YAHOO_BASE_URL ?? YAHOO_ORIGIN,
    });
  const status = isFailure(result) ? STATUS[result.kind] : 200;
  console.info(JSON.stringify({ adapter: ADAPTER_ID, ms: Math.round(performance.now() - t0),
    status: `${String(status)[0]}xx`, kind: isFailure(result) ? result.kind : null }));
  return Response.json(result, { status, headers: NO_STORE });
}
