# Small Business Command Center — ORIGINAL FRONTEND (UNCHANGED)

This is the exact original React/Vite frontend supplied in the AppDeploy build-manifest ZIP on 2026-11-24.

The original source file contents were preserved byte-for-byte (no redesign, no edits to App.tsx/CSS).

IMPORTANT:
- The frontend currently imports @appdeploy/client and calls AppDeploy auth/API routes.
- It is NOT YET connected to the separately developed Laravel/PostgreSQL backend.
- Do not assume `npm run dev` will work independently until an AppDeploy SDK-compatible transport/auth adapter or Laravel migration is provided.
- The uploaded archive's backend/index.ts is NOT included here; this archive is intentionally frontend-only.
- This is development source, NOT a production-ready app or compiled executable.

FILES:
- src/App.tsx: original application layout and behavior
- src/index.css: original styles
- src/main.tsx: entrypoint
- index.html, package.json, vite.config.ts, tsconfig.json, postcss.config.js, tailwind.config.js
- appdeploy.auth-login.json: AppDeploy authentication settings (configuration, not secrets)

NEXT STEP:
Implement a separate API/auth adapter and Laravel controllers matching the original frontend's endpoint contracts, while leaving the UI code and CSS unchanged. Test login, workspace, licensing and image upload flows with a disposable PostgreSQL database before deploying.
