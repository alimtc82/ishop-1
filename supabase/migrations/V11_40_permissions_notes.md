# V11.40 Permissions migration

Applied to Supabase project during V11.40:

- Added independent role permissions for every Admin/settings section.
- Added customer permissions: create, open card, view phone, call, WhatsApp.
- Added `customers.branch` and index.
- Backfilled existing purchase customers from their linked archived device branch when available.
- Staff customer SELECT is restricted by RLS to `customers.branch = current_branch()`; admins remain global and a Facebook customer can still access their own row.
- New manual/purchase customers receive the current staff branch automatically through a database trigger.
- Archive-staff customer updates are restricted to the current branch.
- `role_perm(text)` was expanded to understand all V11.40 permission keys.

The SQL was applied through managed Supabase migrations; this file is documentation for the project package, not an instruction to re-run it blindly.
