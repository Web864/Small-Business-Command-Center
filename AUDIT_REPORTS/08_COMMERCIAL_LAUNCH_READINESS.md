# 08 — Commercial Launch Readiness
- **SaaS (hosted by you):** closest fit. Needs the P0/P1 items in `09`.
- **Customer-hosted:** possible but source (PHP, built JS) is delivered; licence checks live in editable PHP, so they can be removed. Weak IP protection.
- **Windows installer:** NOT IMPLEMENTED. React + Laravel does not become a protected desktop app by itself; it would need a bundled PHP/PostgreSQL runtime or a rewrite. Obfuscation does not protect IP in a customer-held PHP app.
- **Onboarding/payments:** no payment integration, no trial, no email, manual licence issue. Support, ToS, Privacy Policy, EULA, data deletion and export of profile/images are absent; get jurisdiction-specific legal and tax advice (not provided here).
- **International:** USD default, float money, UTC only, English only, FX from a free third-party API.
- Third-party licences NOT REVIEWED.
