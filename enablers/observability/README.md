# Operational Observability

This enabler owns deployment and operations concerns for metrics, traces, log shipping,
dashboards, alerts, and runtime telemetry infrastructure.

## API metrics and operations page

The API records request counts and duration histograms by normalized Express route,
method, and status code. It also exports Prometheus' Node.js default process metrics.
Route labels use route patterns rather than task IDs, user IDs, or other request values
to keep metric cardinality bounded.

- `/operations` is the custom monitoring page. Its API data endpoint requires an active
  owner session; editor and viewer accounts cannot read it.
- `/api/metrics` (proxied to the API's `/metrics`) is a Prometheus text scrape endpoint. It returns `404` until
  `METRICS_BEARER_TOKEN` is configured, then requires `Authorization: Bearer <token>`.
  Use a randomly generated secret of at least 32 characters in local API environment
  settings and Vercel's API service environment variables. Never commit the token.
- The page refreshes metrics and centralized request logs every 15 seconds and shows request counts, errors, average latency,
  process memory, runtime health, and per-route activity.
- The Attention panel raises current-instance warnings when the database is unavailable,
  at least 20 requests have a 5% or higher 5xx rate, or a route averages at least one
  second after 10 requests. Configure `ALERT_WEBHOOK_URL` to send active alerts as JSON
  webhook notifications. Each alert is rate-limited to one notification per 10 minutes
  per API process; the notification is best-effort and webhook delivery failures are logged.

## Traces and fleet telemetry

Set `OTEL_EXPORTER_OTLP_ENDPOINT` on the API service to an OTLP/HTTP-compatible collector
or hosted telemetry backend. The API exports HTTP server spans and request count/duration
metrics to `/v1/traces` and `/v1/metrics` below that base URL every 15 seconds. Configure
`OTEL_EXPORTER_OTLP_HEADERS` for credentials using comma-separated, URL-encoded
`key=value` pairs. Keep secrets in Vercel environment settings or local ignored `.env` files.

Inbound W3C `traceparent` is accepted; each request log includes `traceId` and `spanId`
when tracing is configured, and the response includes `x-trace-id`. Span attributes use
normalized route patterns and status codes. Request bodies, cookies, emails and task text
are not exported. The initial trace covers the API HTTP request; database query spans and
cross-service web-to-API propagation are not instrumented yet.

The OpenTelemetry alert panel and local Prometheus registry are instance-scoped. For
durable fleet-wide graphs and alerts across Vercel instances, point OTLP export at a
hosted collector/backend that stores and aggregates telemetry. Setting an endpoint only
enables export; it does not provision that collector or its dashboards/notification rules.
Vercel may freeze short-lived functions, so exports and webhook delivery are best-effort;
use a serverless-aware collector/export route or a long-running API host when delivery
guarantees matter.

The current metrics registry lives inside one API process/function instance. On Vercel,
separate instances keep separate registries, and an instance may be retired at any time.
Therefore `/operations` is a live instance snapshot, not a durable or fleet-wide history.
Prometheus/Grafana needs a reachable scraper and aggregation/storage setup to provide
fleet-wide graphs; that deployment configuration is not included here.

Request summaries are also stored in the shared MongoDB `OperationsLog` collection with
a 14-day TTL and can be searched by route, request ID, trace ID, user ID, and level from
the owner-only `/operations` page. Search results are scoped to the signed-in owner's team.
This provides centralized recent logs across API instances sharing the same MongoDB, but
the post-response database write is best-effort and is not an audit log or durable log
delivery system. This repository currently exports traces and metrics over OTLP, not log
records; use a Vercel log integration or a dedicated log shipper for stronger retention
and delivery.

Request logs include a validated `requestId`, normalized route, duration, status, and
authenticated user/team IDs when session auth has run. They intentionally omit emails,
cookies, request bodies, and task contents. Error logs use the URL path without query
parameters so reset/invitation tokens are not copied from a query string into logs.

Reusable application and HTTP logging implementation belongs to `packages/logging`.
Workspace runtimes consume that package and do not duplicate logging under local
`observability/` directories.
