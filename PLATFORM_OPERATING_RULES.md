# Whiz Kids digital platform — architecture and operating rules

**Status:** Working architecture / operational governance  
**Last reviewed:** 11 November 2026  
**Purpose:** One dependable reference for the Whiz Kids web tools and their shared Supabase backend. This file is **not** a clinical therapy plan or a claim that every listed module is released.

## Deployment update — 11 November 2026 (evening)

- The **generic Multiple Oppositions clinician workspace** is deployed at [Therapy-Games / Speech & Language / Speech Sounds](https://whizkidal.github.io/Therapy-Games/speech-language/speech-sounds/multiple-oppositions.html), separate from Track. The Therapy-Games homepage links to it.
- GitHub Actions successfully verified the **actual published HTML address**, HTTP 200, `text/html`, clinician sign-in controls, response entry and absence of real child names.
- A Chromium browser test using **simulated** Supabase Auth/PostgREST responses passed client, program, session, cold probe, modelled response, listening and PA, five-attempt treatment, refresh and export.
- The **actual Supabase database** passed authenticated clinician create/read/update/delete, and an existing parent account could not view clinician-owned therapy records. These tests were run in transactions and rolled back.
- All four therapy tables now have **restrictive clinician-role** policies in addition to owner-only policies. Existing Track data/tables were not changed.
- **Outstanding:** A genuine email-link login on the live Therapy-Games website followed by a persisted and reopened synthetic clinical session. Until then, this is a deployed **clinician pilot**, not a fully accepted clinical production system.
- Obsolete Track and Edge Function therapy-console URLs have been changed to redirect to the Therapy-Games address; the existing Track homepage remains the tracking product.

The older snapshot under section 4 below is retained for change history; this deployment update is the current status.

## 1. Decisions already made

- **Track @ Whiz Kids** is the browser application for shared tracking workflows (e.g. whole-day participation and regulation). Its code repository is `WhizkidAl/Track-WhizKids`.
- **Therapy-Games** is the independent library of reusable therapy activities and tools. Its repository is `WhizkidAl/Therapy-Games`. Generic, clinician-operated therapy programs should belong on the **therapy side**, not be inserted into Track merely because they collect scores.
- **Supabase** is a shared *backend service*, not a website, treatment approach or permission to combine unrelated front ends. The existing project is currently named `Track @ Whiz Kids`, in Sydney (`ap-southeast-2`), with project reference `fplfahemudvbeqqcmvbe`.
- **SharePoint / Halaxy** remain the designated locations for formal clinical documentation according to Whiz Kids procedures. A new software pilot should not quietly replace those records.
- **Canva** holds editable illustrations, printable activities and parent resources; keep participant-identifiable information out of generic public templates.

A project name is not an app boundary. Multiple independent websites can connect to one Supabase project while using separate, access-controlled tables.

## 2. System map

| Layer | Responsible for | Never use it for |
| --- | --- | --- |
| Track frontend | Participation/regulation tracking experience | Generic speech-treatment planning merely because it logs responses |
| Therapy frontend | Reusable intervention instructions, assessment probes, activity playbooks and in-session entry | Embedding a named child's personal clinical record in public code |
| Supabase Auth | Approved user identities and sign-in | Confusing dashboard login with an application-user account |
| Supabase Postgres / RLS | Private client, program, session and response data with longitudinal retrieval | Publishing clinical data as static website files |
| GitHub and GitHub Pages | Versioned HTML, JavaScript, CSS and documentation only | Patient names, individual assessment scores, clinical notes or passwords |
| SharePoint / Halaxy | Formal documents, report sign-off and handover records | Unreviewed assumptions about a prototype's data completeness |

**Authentication:** Shared Supabase *users* do not necessarily have a shared *browser session* across different web origins/domains. Each frontend must explicitly implement and test its sign-in flow. The existing Track experience uses emailed sign-in links. Do not require a separate unknown password in a new tool without establishing why.

## 3. What the Multiple Oppositions tool actually is

**Classification:** Clinician-operated, reusable **Multiple Oppositions therapy program and response-capture tool** with integrated baseline/generalisation probes, progress review, brief phonological-awareness and communication-repair teaching.

It is **not** the Track product, and it is **not** a child-specific program hard-coded for one participant.

### Generic configuration

- Clinician selects an existing client or creates an access-controlled client record.
- Clinician creates a *program instance* from a reusable Multiple Oppositions template.
- Clinician defines the collapse/substitute phoneme and active contrast targets (e.g. a set that happens to include clusters), with versioning.
- Clinician adds *trained contrast word sets* and separate *untrained generalisation probe words*. All words are editable; no fixed /b/ set in the general template.
- Session instructions, 2–3 rotating activity games, target words and data capture appear in **one interface**.
- Distinct measures record: cold independent response; supported/modelled production; onset transcription and quality; vowels; other consonant errors; syllable transitions; connected speech; auditory identification; PA; repair; and parent coaching.
- The first uncued probe response is never silently overwritten by an improved modelled response. Repeated-word consistency and multiple therapy attempts are separate task types.
- Sessions retain a snapshot of the target configuration used on the day.
- Authorized clinicians can later retrieve, compare and export the longitudinal record. Clinician-to-clinician access and immutable audit history require explicit design and tests; they are **not** assumed from owner-only RLS.

Parent practice cards and instructions remain separate from the clinician's authenticated view.

## 4. Current implementation status (11 November 2026)

| Item | Observed state | Confidence |
| --- | --- | --- |
| Track frontend and repository | Already established; **must remain unaffected** by this therapy prototype | Existing product |
| Therapy-Games frontend and repository | Existing separate generic therapy resource library | Existing product |
| Supabase therapy tables | `therapy_children`, `therapy_programs`, `therapy_sessions`, `therapy_trials` created | Verified by database query |
| RLS on those four tables | Enabled with four policies per table | Verified by database query |
| Stored live therapy records | **0** clients, **0** programs, **0** sessions, **0** trials | Verified by database query |
| Existing therapy-console prototype | Placed at `Track-WhizKids/therapy-console.html` during troubleshooting; incorrect long-term placement | Prototype only, not clinical release |
| Supabase Edge Function `whiz-kids-therapy-console` | Exists but is **not** a supported HTML-hosting solution without appropriate hosting configuration | Do not use as the therapy app's public address |
| Live browser sign-in, create/save/reload/export | **Not end-to-end verified** with a real authorised browser account | Blocked/unreleased |
| Clinical suitability, target flexibility and handover | Design intentions; require clinician acceptance test | Unreleased |
| Security advisory | Leaked-password protection disabled in existing project | Review before wider rollout |

**Important:** Code committed to GitHub, a successful Pages build or a successful SQL insert test is **not** proof that the whole application works in a clinician's browser.

## 5. Hosting / ownership decision for this tool

The clinic has previously preferred two separate website surfaces: tracking under the Track product, therapy under the therapy library, with a **single shared Supabase backend**. The Multiple Oppositions tool belongs with **clinician-facing therapy tools**. Choose its permanent therapy path and navigation before publishing again; for example, a separate clinician section alongside the Therapy-Games library.

The existing therapy prototype should first be isolated from Track navigation (without erasing its Git history) and then redesigned/tested in the correct location. Do not promise that an existing Track login will automatically carry between separate domains.

## 6. Standard change workflow — mandatory for new tools

1. **Classify:** Is this a tracker, clinical program, therapy game, parent resource or formal record? Confirm the code repository and intended user group.
2. **Specify:** Write the purpose, child-independent template, target configurability, essential data fields, privacy needs, user permissions and sample workflow.
3. **Protect:** Keep individual identifiers out of GitHub/Canva public resources; define RLS, role access, audit expectations and retention/export requirements before clinical data entry.
4. **Build privately / in a branch:** Avoid direct production changes to a working Track homepage just to make another project accessible.
5. **Verify at the public address:** Confirm HTTP delivery and rendered page, JavaScript startup, sign-in using an actual authorised *app* account, and error messages.
6. **Use synthetic records:** Create a fake client, program, session and trial; refresh; retrieve exact saved values; edit if supported; export; confirm permissions; delete synthetic records. Verify no other user can read them.
7. **Clinical acceptance:** Confirm the wording, probes, measurement conditions, cue distinctions, summary interpretation and next-session retrieval with a speech pathologist.
8. **Release and hand over:** Record tested URL, version/commit, scope of tests, known limitations, date and rollback path. Only then mark it **Released**.

The same checklist is required before stating that the tool “works.” Any failure is **Blocked**, not “successfully deployed.”

## 7. Short status report format

Every change reported to the owner should say:

- **Product and purpose:** Which application and what clinical workflow?
- **Changed:** What actually changed, in which repository/database table?
- **Confirmed working:** Exact tests completed and where.
- **Not tested / blocked:** Honest limitations, including authentication and saving.
- **Data impact:** New/changed/deleted records; whether a migration was performed.
- **Next action:** One practical next step; no need to repeat previous information.

Use **Planned → Built → Technically tested → Clinically reviewed → Released**. Never equate “built” with “working.”

## 8. Immediate repair plan

1. Restore Track's homepage navigation to the tracking product alone.
2. Retain the old therapy-console prototype for analysis, but do not use it for clinical data while validation remains incomplete.
3. Define the generic Multiple Oppositions protocol and the target-word schema independent of any single child.
4. Put the clinician tool on the therapy product's own website surface, while keeping its sensitive records in RLS-protected Supabase tables.
5. Test a full user flow in the **real browser**: sign in, select client, create program, record cold probe, record modelled response, save, reload, edit/append, export and return next week.
6. Document its exact version and acceptance result in this file before calling it ready.

## 9. Clinical data and security safeguards

- The new therapy tables currently enforce **owner-only access**; that is not yet a designed multi-clinician supervision/handover model. Do not create a shared clinician view by weakening RLS.
- Treat the current tool as a prototype, **not** the authoritative clinical record, until completeness, access control, auditability and operational backup are verified.
- Preserve the difference between **first uncued response** and **supported response**. A verbal model changes task conditions; it does not merely fix a word retrieval problem.
- Record each change of target sets in a program version, rather than retroactively reclassifying old responses.
- Keep exported clinical data in approved restricted workspaces.
- No service-role or secret database key in a browser or repository. Browser code may use a publishable key alongside appropriate RLS.
- Complete a separate governance review before parent access, external clinical handover access or sensitive audio/video storage is introduced.

## 10. Source documents

- [Track-WhizKids README](https://github.com/WhizkidAl/Track-WhizKids/blob/main/README.md)
- [Therapy-Games README](https://github.com/WhizkidAl/Therapy-Games/blob/main/README.md)
- [Therapy-Games shared-tools README](https://github.com/WhizkidAl/Therapy-Games/blob/main/shared-tools/README.md)
- [Supabase project dashboard](https://supabase.com/dashboard/project/fplfahemudvbeqqcmvbe)

**Governing principle:** Reusable clinical tools are configured by clinician decisions; Supabase stores the private longitudinal evidence; a successful deployment must be *demonstrated*, never inferred.
