// Feature 009: the same-origin symbol directory (specs/009-…/contracts/directory-api.md). No request input is
// read: sources, base URLs and the key come from the server environment only.
import { directory } from '../../../src/directory/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // already the Next 16 default for Route Handlers; explicit on purpose

export async function GET() {
  const d = await directory();
  const ok = d.entries.length > 0;
  return Response.json(ok ? d : { kind: 'unavailable', sources: d.sources }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
