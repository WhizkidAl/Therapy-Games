# Self-Advocacy | Whiz Kids

Reusable shared support tool, in its own Self-Advocacy library category. This is not a scored game or the Track participation tracker.

## Purpose and workflow

The coordinator creates a private workspace for a child, then explicitly adds agreed supporters by verified email. The speech pathologist or coordinator saves a plan developed with the child. Parents, EA and teacher can see the plan, contribute an agreed next step, add a brief review or comment, and see earlier updates. View-only access is available. Supporters can choose not to adopt a suggestion; there are no automatic assignments or emails.

Template sections: strengths, chosen message/mode, adult response, backup/pause arrangements, child's view, introduction and review date. Additional records: next step and person agreeing to it; review of adult response and perceived usefulness; comments/corrections; optional verified dismissal check. Printable communication cards remain optional.

## Hosting and private storage

- Frontend: `Therapy-Games/self-advocacy/`, public generic code only.
- Backend: existing Track Supabase project `fplfahemudvbeqqcmvbe`.
- Separate private tables: `advocacy_spaces`, `advocacy_members`, `advocacy_entries`.
- Nothing in the existing tracking or therapy tables is modified by this module.
- Browser uses only the public publishable key and pinned Supabase JS 2.119.0.
- Email code sign-in follows the existing Track approach; membership requires a confirmed, non-anonymous identity.

## Access and data review

Only existing Track administrators can create a workspace. The creator is its coordinator. Access is module-specific and does not confer access to other Track records. The coordinator assigns a verified-email membership as clinician, parent, EA or teacher, either contributing or view-only, and can remove it. Pending emails receive no access until verified by Supabase Auth. No emails are automatically sent when adding access.

All active members can read this workspace's entries and basic roster. Only the coordinator sees roster email addresses. Only coordinator or contributing clinician can save plans. Other contributing members can add next steps, reviews, comments and dismissal checks. The screen explicitly explains that saved content is shared with everyone in People; content the child does not want shared should not be entered.

Tables deny direct client access and have RLS enabled with no permissive policies. Public SECURITY INVOKER RPC wrappers call narrowly scoped private SECURITY DEFINER functions. Every function checks the caller's confirmed identity and workspace role. Table contents and auth user details are not exposed. All privileged functions pin an empty search path and revoke PUBLIC/anon execute.

Updates are append-only, with server-recorded author, role, timestamp and workspace revision. Plan revisions retain earlier versions. Expected-revision checks prevent stale writes, and client-generated request IDs make retries idempotent. Corrections are new entries; ordinary contributors cannot erase history. No routine deletion UI or scheduled retention is introduced; authorised administrators handle retention under clinic policy. JSON export includes the full history and should be stored with authorised records. Formal clinical documentation remains in the usual clinic system.

## Verification / status (24 November 2026)

Status: technically tested pilot; not a claim of clinical acceptance.

- JavaScript syntax: passed.
- Actual database, transaction rolled back: save/read, duplicate retry, stale revision conflict, raw-table denial, parent view/contribution, plan-edit restriction, unrelated-user read/write denial, access revocation and anonymous denial.
- Headless Edge with simulated transport: forms, save/read-back/reload, failed-save draft retention, conflict retention and retry, export, HTML injection escaping, view-only controls, mobile width and cards.
- Browser with **real Supabase**, fictional temporary accounts: sign-in, create workspace, save and reopen plan, parent read and review contribution, coordinator sees review, export, access removal and sign-out. Test accounts/records cleaned up after verification.
- Screen layout inspected at desktop and phone sizes.
- Email-code request/delivery and a real user's code entry remain to be checked; synthetic sign-in used a temporary password without sending mail.
- Clinical introduction and real-world usefulness remain to be reviewed by the child's speech pathologist and supporters.

Security advisors report informational no-policy findings on these intentionally RPC-only private tables. Existing project-wide leaked-password protection warning remains unchanged; this application presents email-code sign-in.

## Operations

Apply `schema.sql` once via the Supabase migration tool (already applied as `self_advocacy_private_workspaces`). `test-access.sql` runs in a transaction and rolls back its synthetic fixtures. Production source includes no fixtures or participant names.

Rollback: remove the Self-Advocacy navigation link and revert the frontend commit. Preserve database entries rather than dropping the tables. To suspend API access, a database administrator can revoke authenticated EXECUTE on the five public advocacy RPCs. No other module requires these objects.

User-facing sources are linked inside the resource. They inform the approach; they do not validate this software as a clinical programme.

