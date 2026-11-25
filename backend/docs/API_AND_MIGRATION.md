# Migration notes

| Previous Python QA URL | Laravel route | Behavior |
|---|---|---|
| POST /api/register | same | customer registration |
| POST /api/login /logout | same | Laravel session |
| GET /api/session | same | account role |
| GET /api/license | same | account entitlement |
| POST /api/license/redeem | same | buyer email / key validation |
| POST /api/license/activate /release | same | installation claim/release |
| GET, POST /api/workspace | same | owner/user scoped workspace + revision CAS |
| GET /api/export | same | tenant JSON export |
| GET /api/admin/licenses | same | management only |
| POST /api/admin/issue | same | issue once and display plaintext only once |
| POST /api/admin/license-action | same | reset or revoke |

Original AppDeploy API uses different URLs/data models, so migrating **original React frontend** requires mapping and revising API calls. Never directly move production session tokens or hashed license identifiers without documented migration logic.

Security review before production: verify email ownership, same-origin CSRF, mutation validation, JSON row type validation, rate limits/abuse, server-side permissions, secrets/backup encryption, data retention, and payment lifecycle. Add tests for password reset, role abuse, license concurrency, refund reconciliations and all supported browsers.
