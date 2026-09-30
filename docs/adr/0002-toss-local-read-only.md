# ADR 0002 — Toss Securities as a local, read-only provider

- **Status**: Accepted (maintainer decision, 2026-09-30)
- **Amends**: roadmap MD-1 ("Paper trading only: no broker API, no real or simulated order placement")
- **Applies**: constitution Principle IX (external data only in a separate application Feature) through Feature 015
- **Affects**: Feature 015 (`specs/015-toss-local-provider`)

## Context

- The maintainer holds a real KR/US stock portfolio at Toss Securities and wants to analyse it without typing it in.
- The Toss Securities Open API (opened to all customers in August 2026) offers account and holdings queries, market
  data including daily candles, and orders. Credentials are issued by the user; calls are accepted only from
  registered IP addresses.
- Secondary sources report that the Toss terms limit use to personal investment and forbid providing the data to
  third parties. The original terms were not readable by the implementer; the maintainer reads them.
- MD-1 forbids broker APIs; Principle IX forbids them in the initial phase unless a separate, approved Feature
  introduces them.

## Decision

- Within Feature 015 only, the app may call these Toss endpoints and no others:
  `POST /oauth2/token`, `GET /api/v1/accounts`, `GET /api/v1/holdings`, `GET /api/v1/candles`.
- **Never**: order creation, modification, cancellation, order queries, conditional orders, WebSocket. No such path
  exists in the code; a test enforces the allowlist.
- **Local only, own key only**: the provider is available only when the user's own credentials are configured on
  the local server (and never on a hosted deployment). Secrets, tokens and the account identifier stay on the server.
- Paper trading stays the only trading mode (MD-1's intent is unchanged): the app never places a real or simulated
  order at a broker.

## Rationale

- Reading holdings and quotes is what the maintainer needs; orders are the risk, so they are made impossible by
  construction, not by configuration.
- Keeping Toss local and personal matches the reported terms and the registered-IP model.

## Not a legal conclusion

This is a scope decision of the project. It does not state that the use complies with the Toss terms or any law.
