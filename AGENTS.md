# iShop Agent Guide

These instructions apply to the entire repository. More specific `AGENTS.md` files may add stricter rules for their directory.

## Project baseline

- iShop is a React 19 and Vite application backed by Supabase.
- The current release line is `15.5.x`. Do not change the major or minor version unless the issue explicitly requires it.
- Use Node.js 20 and install dependencies with `npm ci`.
- Keep changes narrow and traceable to the assigned issue.

## Non-negotiable safety rules

- Do not change business rules, pricing, inventory, accounting, permissions, customer flows, or persistence behavior unless the issue explicitly requests it.
- Do not create, edit, reorder, or delete Supabase migrations, SQL, schema objects, functions, triggers, policies, RLS rules, seed data, or generated types unless the issue explicitly requests a database change.
- Never weaken authentication, authorization, branch isolation, tenant isolation, or RLS protections.
- Never commit credentials, tokens, service-role keys, production data, or local `.env` files.
- Preserve backward compatibility for stored data, public routes, exported functions, settings keys, browser storage, API payloads, and existing integrations.
- Prefer additive, reversible changes. Document any unavoidable breaking change and migration path before implementation.

## Implementation rules

- Read the affected call sites and tests before editing.
- Preserve the existing JavaScript/JSX conventions and repository structure.
- Do not perform unrelated refactors, dependency upgrades, formatting sweeps, or generated-file changes.
- Keep UI changes responsive, accessible, RTL-safe, and consistent with existing components and design tokens.
- Handle loading, empty, error, permission-denied, and success states where relevant.
- Add or update focused tests for changed behavior. A test must fail when the behavior regresses.
- Do not suppress failures with `|| true`, ignored exit codes, broad exception handling, disabled tests, or reduced validation.

## Required validation

Run the following before requesting review:

```bash
npm ci
npm run build
npm run lint
npm run test
npm run type-check
```

If a command fails because of a pre-existing repository problem, report the exact failure in the pull request; do not hide it or claim success.

## Releases and documentation

- Follow the existing `15.5.x` version line and semantic versioning intent.
- Do not bump the version for agent/tooling-only changes unless maintainers request it.
- Update `CHANGELOG.md` when a change affects users, behavior, compatibility, deployment, security, or release contents. Pure repository-governance changes may use the PR description instead.
- Pull requests must explain scope, risk, validation, Supabase/database impact, backward-compatibility impact, and whether the changelog/version changed.

## Git and review

- Use an `agent/<short-description>` branch.
- Keep commits focused and use a concise imperative message.
- Open a draft pull request against `main`; agents must not merge it.
- Request review from the code owner for changes to protected or sensitive areas.
