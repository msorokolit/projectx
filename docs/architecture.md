# Architecture Overview

## Core idea

The platform follows a simplified 1C-style model:

1. **Metadata** defines business objects.
2. **Runtime** creates object stores and enforces field contracts.
3. **Documents** are posted/unposted.
4. **Registers** hold movement history and balances.
5. **JavaScript hooks** implement business logic.

## Components

- `src/types.ts`: metadata contracts and shared types.
- `src/metadata.ts`: metadata parser/validator.
- `src/platform.ts`: in-memory platform kernel.
- `src/scriptingEngine.ts`: VM-based JavaScript hook execution.
- `src/app.ts`: Fastify composition root (plugins + module route wiring).
- `apps/server/src/modules/*`: route/service modules (auth, metadata, catalogs, documents, registers, scripting, audit).
- `apps/server/src/plugins/security.ts`: baseline security headers.
- `src/bootstrap.ts`: loads example metadata/scripts.
- `packages/core/*`, `packages/db/*`, `packages/sdk/*`: reusable package entry points.

## Runtime flow for posting

1. Read document by type and ID.
2. Run `beforePost` script with safe API:
   - `document`
   - `setField`
   - `addMovement`
   - `getBalance`
   - `reject`
3. Persist generated register movements.
4. Mark document as posted.
5. Run `onPost`.

Unposting removes movements for the document and runs `onUnpost`.
