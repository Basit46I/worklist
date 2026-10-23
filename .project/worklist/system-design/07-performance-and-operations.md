# Performance and Operations

**Version:** 0.2  
**Status:** Draft for review  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13  
**Related Docs:** `../architecture/02-drivers-and-constraints.md`, `01-list-data-and-ownership.md`, `05-workflows-and-failure-cases.md`

---

## 1. Purpose

Make workload, performance, reliability, and operational assumptions visible before choosing scale mechanisms.

## 2. Workload to Define

Before benchmarking, specify:

- Typical and maximum items per list/account.
- Number and size of fields, descriptions, and other payloads.
- Read/write rates and peak-to-average ratio.
- Number of simultaneous users/editors.
- Common filters, sort fields, grouping, and search terms.
- Retention, deletion, and growth rates.
- Supported browsers, networks, and deployment regions.

The current “10k rows” target lacks these dimensions.

## 3. Performance Targets (Provisional)

| Draft target                 | Missing definition                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| P95 list load under 200 ms   | Is this API latency or user-perceived completion? Which dataset, filters, and network?          |
| Realtime update under 500 ms | Is this server publish, client receipt, or visible UI update? Under what connection conditions? |
| 10k+ rows                    | Per list or total? Which fields and concurrency?                                                |

Do not claim targets as achieved until a repeatable measurement profile and test evidence exist.

## 4. Candidate Design Approach

- Keep API responses bounded with validated pagination.
- Add database indexes only for approved, measured query shapes.
- Use virtualized rendering for large visible collections if browser profiling justifies it; virtualization limits DOM work but does not replace server pagination or query limits.
- Avoid returning unnecessary large fields in list responses; load details when expanded if appropriate.
- Debounce search in the client for usability and protect the server with request limits/rate controls.
- Measure query time, response size, UI render time, and perceived interaction latency separately.
- Do not add caching until invalidation, authorization scope, and consistency behavior are understood.

These are design candidates; benchmark results determine final choices.

## Current Pagination Baseline (2026-10-14)

Each API list response is bounded to at most 100 items; the web client requests 50 and loads subsequent pages on demand. Search, status/rule filters, and sort are applied by the API before cursor pagination; grouping/rendering remain in the client. Each response is bounded and the table virtualizes group/task rows to the scroll viewport plus ten overscan rows; expanded rows are dynamically measured. Client memory still grows as more pages are loaded. Sort-field query plans need workload measurement and any supporting indexes should be added only after that evidence. The 10k-row target is therefore not yet verified.

## 5. Reliability and Recovery

Define before launch:

- Availability target and what user workflows it covers.
- Backup frequency, retention, restore procedure, and recovery-point/time objectives.
- Database and API health checks and readiness behavior.
- Retry/backoff behavior for safe transient failures.
- Realtime reconnect/reconciliation if that capability is approved.
- Incident ownership and operational runbooks.

“Zero data loss” is not an actionable target until tied to failure scenarios and recovery objectives.

## 6. Observability

The API currently logs one structured request event after response completion: HTTP method, matched route template, status, and elapsed milliseconds. It omits query strings, bodies, email addresses, account IDs, IP addresses, and item content. No third-party product analytics is configured. The hosting/logging owner must set access controls and retention; aggregate error rates and latency dashboards remain a deployment concern.

The API exposes `/health` as a liveness check and `/ready` as a persistence-readiness check; `/ready` returns HTTP 503 while MongoDB is unavailable. Shared structured logging now includes privacy-minimized API request telemetry. No production monitoring provider, alert routing, or deployment setup has been configured in source.

## 7. Scaling and Cost

Start with the simplest deployment that meets measured drivers. Evaluate database indexes, query limits, virtual rendering, and horizontal runtime scaling before introducing caches, queues, sharding, or service decomposition. Record operational and financial cost alongside performance benefits.

## 8. Open Questions

- What workload profile defines v1 acceptance?
- What are availability, recovery-time, and recovery-point objectives?
- Which service and product telemetry is allowed and needed?
- What deployment region, backup, and monitoring providers are planned?
- What evidence would justify a cache, queue, or separate runtime?

## Production-Readiness Lens

Turn each target into a repeatable workload and separate user-visible latency, API latency, database time, payload size, and rendering cost. Define service objectives, alert ownership, backup/restore drills, and incident recovery before launch. Collect only operational or approved product telemetry, with redaction, access, retention, and sampling rules. Add caches, queues, or distributed components only when measurements and an operating plan justify them.

## 9. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 0.2     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-13 | 0.1     | Initial operational/performance draft; targets marked provisional                | Codex draft; owner review required |

---

**End of Document**
