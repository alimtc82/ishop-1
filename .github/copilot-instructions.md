# GitHub Copilot instructions for iShop

Follow the repository-root `AGENTS.md` for every task.

- Make the smallest change that fully satisfies the issue acceptance criteria.
- Treat business logic and every file under `supabase/` as protected. Do not alter them unless the issue explicitly authorizes that exact scope.
- Never change Supabase schema, migrations, SQL functions, triggers, grants, authentication, or RLS policies implicitly.
- Preserve compatibility with existing data, routes, APIs, exports, settings keys, and browser storage.
- Stay on the `15.5.x` release line. Do not bump the version for documentation, CI, templates, or agent configuration alone.
- Update `CHANGELOG.md` for user-visible or release-relevant changes; otherwise explain why no changelog entry is needed in the PR.
- Do not mask build, lint, test, or type-check failures. Do not add `|| true`, `continue-on-error`, skipped tests, or equivalent bypasses.
- Run `npm ci`, `npm run build`, `npm run lint`, `npm run test`, and `npm run type-check` before requesting review.
- Do not merge pull requests. Open work as a draft against `main` and include risk, validation, database/RLS impact, and backward-compatibility impact.
