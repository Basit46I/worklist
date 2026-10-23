# ADR-0001: Team Membership and Worklist Permissions

**Status:** Proposed — requires Adeel/product-owner approval  
**Date:** 2026-10-14  
**Decision owner:** Adeel  
**Related docs:** `../system-design/01-list-data-and-ownership.md`, `../system-design/06-auth-and-permissions.md`, `../product/06-features.md`

## Context

The product vision describes team-shared work. The current implementation creates one team per registering account and scopes every item operation to that team. This prevents cross-team access, but two users cannot currently collaborate on the same team. F-19 is P0 while its role/action matrix is still open. Implementing membership without explicit roles would risk either granting too much access or making the advertised collaboration unusable.

## Decision

**Proposed only; not approved.** Adopt team membership with three roles and enforce the matrix below in the API. Keep saved views private to their creator for v1. Resolve invitations through expiring, single-use email links whose stored token is hashed; never accept a client-supplied team ID or role as proof of access. Require a verified email before accepting an invitation. Assign work items to a team member identity rather than arbitrary display text.

| Capability                                | Owner | Editor | Viewer |
| ----------------------------------------- | ----: | -----: | -----: |
| Read team items                           |   Yes |    Yes |    Yes |
| Create, edit, delete items                |   Yes |    Yes |     No |
| Bulk update or delete items               |   Yes |    Yes |     No |
| Manage team membership and roles          |   Yes |     No |     No |
| Create and delete own private views       |   Yes |    Yes |    Yes |
| Read or edit another user's private views |    No |     No |     No |

Only the owner may change roles or remove members. A team must retain at least one owner. The initial account creator becomes its owner. Removing a member prevents future access immediately; existing items remain in the team. Assignment to a removed member becomes unassigned during membership cleanup, subject to owner approval of that lifecycle rule.

## Options Considered

| Option                                       | Benefits                                                     | Costs / risks                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Keep one isolated team per account           | No membership attack surface; matches current code           | Fails the shared-team product goal and F-19 collaboration intent                                           |
| Owner/editor/viewer membership (recommended) | Supports collaboration with least-privilege read-only access | Requires invitations, verified email, membership checks, role-aware UI, and a data migration for assignees |
| Every member gets full edit access           | Smallest collaboration policy                                | No read-only access; any member can destroy team data; weaker least privilege                              |

## Consequences

- Every item and saved-view operation must derive team access from the authenticated user's active membership on the server.
- Route-level identity alone is insufficient: mutation routes need an action-specific permission check, including each bulk operation.
- The UI must hide or disable unavailable actions, while the API remains authoritative.
- `assignee` currently stores free-form text; changing it to a user reference needs a migration and display-name resolution policy.
- Email invitation/verification requires a provider, sender configuration, and production-domain setup supplied by the owner.
- User removal, pending invites, owner transfer, and account deletion need explicit lifecycle handling.

## Security and Data Validation

Before acceptance, demonstrate that a user from Team B cannot read or mutate Team A items or saved views by guessing IDs; viewer requests receive a stable denied response for every item mutation and bulk route; expired/replayed invitations fail; invite tokens are stored only as digests; role changes take effect on the next request; and each operation is scoped to an active membership before repository access.

## Validation

- Review the action matrix with Adeel and confirm whether viewer access and private views match the product.
- Verify cross-team denial and each role/action combination at the API boundary.
- Validate invitation expiry, single-use behavior, email ownership, member removal, and owner-retention invariants.
- Migrate existing single-owner teams and free-form assignees without losing items.

## References

- Current single-account team ownership: `../system-design/06-auth-and-permissions.md`
- Membership and role matrix: `../system-design/01-list-data-and-ownership.md`
- Feature priority and unresolved scope: `../product/06-features.md`

## Implementation update

The private-view-only proposal above predates ADR-0002. The current implementation supports creator-owned private or team-shared views, with creator-only updates/deletes. ADR-0002 records this as provisional; this does not imply that the product owner has approved the policy.
