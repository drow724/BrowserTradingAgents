// Feature 015 (contracts/toss.md): whether the local Toss provider is available — never a secret or account data.
import { tossAvailable } from '../../../../src/server/toss.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(tossAvailable() ? { available: true }
    : { available: false, reason: '토스증권 연동이 설정되지 않았습니다. 이 컴퓨터의 .env.local에 토스증권 Open API 키를 넣고 서버를 다시 시작하세요.' },
  { headers: { 'Cache-Control': 'no-store' } });
}
