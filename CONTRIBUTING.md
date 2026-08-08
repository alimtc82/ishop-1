# Contributing to iShop

## Workflow

1. Start from an up-to-date `main` branch.
2. Create a focused branch such as `agent/short-description`, `fix/short-description`, or `feat/short-description`.
3. Keep the change limited to one issue and avoid unrelated cleanup.
4. Add or update focused tests when behavior changes.
5. Run all required validation locally.
6. Open a draft pull request and complete every section of the template.
7. Do not merge until CI passes and the code owner approves.

## Local validation

Use Node.js 20 and the committed lockfile:

```bash
npm ci
npm run build
npm run lint
npm run test
npm run type-check
```

Failures must remain visible. Do not bypass checks, ignore exit codes, disable tests, or use `continue-on-error`.

## Protected behavior

Business logic, permissions, pricing, inventory, accounting, customer data, and Supabase behavior require explicit issue scope and careful review. Database migrations, SQL, schema, authentication, and RLS changes must never be bundled into an unrelated change.

Maintain backward compatibility for persisted data, routes, APIs, exports, settings, and integrations. Explain any compatibility risk in the pull request.

## Versioning and changelog

The active release series is `15.5.x`. Use patch increments only when a release bump is explicitly requested. Do not bump the application version for repository-governance-only work.

Update `CHANGELOG.md` for user-visible, security, compatibility, deployment, or release-relevant changes. Documentation and workflow-only changes can be documented in the pull request without a version bump.

## Commit and pull request quality

- Use concise, imperative commit messages.
- Explain what changed, why, risks, validation, and rollback considerations.
- State explicitly whether Supabase, the database, RLS, business logic, backward compatibility, the version, and the changelog were affected.
- Never include secrets or production data.
