# Production Readiness and Recovery Runbook

**Version:** 0.2  
**Status:** Draft; deployment provider and recovery targets not selected  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-14  
**Related Docs:** `../system-design/06-auth-and-permissions.md`, `../system-design/07-performance-and-operations.md`

---

## 1. Purpose

Prepare Worklist for a controlled production release and document the actions that require access to the hosting provider and MongoDB Atlas account. This runbook is provider-neutral; it does not claim that a production deployment or backup has been configured.

## 2. Before Deployment

- Choose a web host and an API host; record region, owner, deployment URL, and rollback process.
- Choose the production web origin. Set `WEB_ORIGIN` on the API to that exact origin and `NEXT_PUBLIC_API_BASE_URL` on the web app to the API URL.
- Set `NODE_ENV=production`, `API_HOST`, `API_PORT`, `WEB_ORIGIN`, and `MONGODB_URI` in the API host's secret manager. Set the web API base URL in the web host's environment settings.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` together in the API secret manager. Never place live values in Git, this document, logs, or browser variables.
- Use HTTPS on both public endpoints. Production session cookies are marked `Secure`; verify sign-in, sign-out, verification, reset, invite, and cross-origin credential behavior on the deployed domains.
- Restrict MongoDB Atlas network access to the API host's stable egress addresses where possible. Use a least-privilege database user and do not expose the database URI to the browser.
- Confirm `/health` returns liveness and `/ready` returns HTTP 200 only when MongoDB is available. Alert if readiness fails or the API exits.
- Keep the previous release available until the smoke checks below pass; document the rollback command in the host-specific deployment notes.
- Before running more than one API instance, configure `REDIS_URL` for shared rate-limit storage, set `API_TRUST_PROXY_HOPS` to the exact trusted proxy count, and configure cross-instance event delivery; real-time events remain process-local. The local load stress profile does not verify multi-instance coordination.

### 2.1 Email delivery setup (owner action)

1. Choose an SMTP provider and verify a sending domain/address with that provider.
2. Create SMTP credentials with permission to send mail. Do not use a personal mailbox password unless the provider explicitly supports that method.
3. Add all five values together to the API host's secret manager: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`. The API rejects partial SMTP configuration. Port `465` uses implicit TLS; other configured ports use the provider's SMTP transport mode.
4. Deploy/restart the API so it loads the secrets. Keep credentials server-side; never use a `NEXT_PUBLIC_` variable for them.
5. Register a test account with an inbox you control. Confirm verification email delivery and link use; then test password reset and a team invitation. Review provider delivery/bounce logs if a message is missing.
6. Record the provider, verified sender, and test result here or in the deployment notes. Do not record the SMTP password.

If SMTP is not configured, the local app can still run, but email verification, password recovery, and invitations cannot deliver their messages.

### 2.2 Hosting and deployment setup (owner action)

1. Select a host for the Next.js web app and a host/runtime for the Express API. Confirm both support the repository's Node.js engine requirement (`>=20.19.0`) and pnpm workspace build.
2. Connect the repository and configure the repository root as the monorepo root. Install with `pnpm install --frozen-lockfile`; build with `pnpm run build`.
3. Configure API start command `pnpm --dir servers/api start` and web start command `pnpm --dir apps/web start`, unless the chosen host requires an equivalent process configuration.
4. Add API secrets: `NODE_ENV=production`, `API_HOST`, `API_PORT`, `WEB_ORIGIN`, `MONGODB_URI`, and all SMTP values. Configure `NEXT_PUBLIC_API_BASE_URL` on the web build to the public API URL.
5. Use the provider's required network bind address and assigned port. The local `127.0.0.1` setting may only accept local traffic; do not expose MongoDB or SMTP secrets to the browser.
6. Enable HTTPS and set `WEB_ORIGIN` to the exact web origin (scheme + host, no path). Check cross-origin cookie behavior and both `/health` and `/ready` after deployment.
7. Configure deployment logs, readiness/exit alerts, log access controls, retention, and a rollback to the previous release. Keep the first release at one API instance until shared rate-limit storage and cross-instance event delivery are configured.

Provider names and account creation are intentionally left to the owner; this runbook does not claim any host has been selected or configured.

## 3. Release Smoke Checks

Run these checks against a staging deployment first, then repeat critical paths after production release. Record the date, environment, build/commit, tester, and pass/fail result. Use separate test accounts and non-sensitive sample tasks.

| #   | Check                                                        | Expected result                                                             | Result / evidence |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------- |
| 1   | Register with an email address you control                   | Account creation succeeds and verification email arrives                    | [ ]               |
| 2   | Use verification link, sign in, and open the worklist        | Verified account reaches its own list                                       | [ ]               |
| 3   | Create, edit, sort, filter, group, and search sample tasks   | Changes persist after refresh and controls return expected rows             | [ ]               |
| 4   | Save a private view and a team-shared view                   | Private view is creator-only; shared view is available to the team          | [ ]               |
| 5   | Invite a separate address as Viewer and attempt a mutation   | Viewer can read but is denied mutations                                     | [ ]               |
| 6   | Invite a separate address as Editor and create/update a task | Editor can perform permitted task actions                                   | [ ]               |
| 7   | Change a member role, then remove a non-owner                | New role applies; removed member's next protected request is denied         | [ ]               |
| 8   | Request password reset and use the one-time link             | New password works, old password fails, previous sessions are revoked       | [ ]               |
| 9   | Check `/health` and `/ready` with database connected         | Health reports liveness; readiness reports database available               | [ ]               |
| 10  | Run an approved staging load profile against representative data | p50/p95/p99, errors, database load, and thresholds are recorded         | [ ]               |
| 11  | Review browser bundle, repository changes, and API telemetry | No credentials/tokens leak; request telemetry excludes query/body/identity  | [ ]               |
| 12  | Confirm current and previous release deployment/rollback     | Rollback is documented and prior version can connect to current schema      | [ ]               |
| 13  | Restore an Atlas backup to an isolated target                | Sample records/counts match; restore time and data-loss window are recorded | [ ]               |

| Run metadata                      | Value |
| --------------------------------- | ----- |
| Date / environment                | [ ]   |
| Build or commit                   | [ ]   |
| Tester                            | [ ]   |
| Overall result / follow-up issues | [ ]   |

## 4. MongoDB Atlas Backup and Restore

The application code does not configure Atlas backups. The account owner must review the Atlas plan's available backup capabilities and configure them in the Atlas project that owns the production cluster.

### Atlas owner setup steps

1. In Atlas, identify the cluster and database used by production. Create a dedicated application database user with only the required read/write access to that database; keep the password in the API host's secret manager as `MONGODB_URI`.
2. In Network Access, allow the API host's stable outbound IP addresses where the host provides them. Avoid a global `0.0.0.0/0` rule for a production cluster. Add a temporary development IP only when local testing requires it, then remove it when no longer needed.
3. Open the cluster's backup configuration and check which snapshot/point-in-time options the selected Atlas tier supports. Choose retention and recovery targets before enabling the policy; record those values below.
4. Confirm the API reports `/ready` only when it can connect, and verify a sign-up/task create/read cycle against the production-like database before inviting real users.
5. Restore a recent backup into a separate test cluster/database. Compare sample accounts, teams, work items, saved views, and comments; record restore duration and the newest recoverable data time. Keep the live cluster untouched during the drill.

Do not paste the URI, username/password, or recovery credentials into chat or commit them to the repository.

Before launch, record and approve:

| Control                                                 | Decision / evidence                        |
| ------------------------------------------------------- | ------------------------------------------ |
| Recovery point objective (maximum acceptable data loss) | [Owner to decide]                          |
| Recovery time objective (maximum acceptable outage)     | [Owner to decide]                          |
| Snapshot frequency and retention                        | [Configure in Atlas; record result]        |
| Point-in-time recovery availability                     | [Verify for the selected cluster/plan]     |
| Backup access owner and break-glass process             | [Owner to decide]                          |
| Last restore drill                                      | [Date, restored cluster/database, outcome] |

Run a restore drill before launch and after material changes to the backup policy. Restore to an isolated cluster or database first; verify account, team, item, and saved-view counts and sample records; only then approve a production recovery. Record the restore duration and data-loss window. Never test restore by overwriting the live production database.

## 5. Telemetry and Privacy

The API emits one structured `API request completed` event after each response. It contains the HTTP method, matched route template (or `unmatched`), response status, and elapsed milliseconds. It deliberately excludes query strings, request bodies, email addresses, account IDs, IP addresses, and work-item content. Telemetry is local structured logging; no third-party product analytics provider is configured.

The hosting/logging provider must set access controls and a retention period that the owner approves. Do not enable request-body capture or raw URL logging without a privacy review. Current process-local invitation/login throttles and server-sent-event connections require a shared store/event broker before horizontal API scaling.

## 6. Owner Actions Still Required

- Select and configure hosting providers and their secret stores.
- Configure Atlas network access, least-privilege database credentials, backup frequency, retention, and recovery targets.
- Configure SMTP and verify domain/sender deliverability.
- Choose monitoring alert recipients and log retention.
- Run and record the restore and release smoke checks.

---

**End of Document**
