# Multiple Oppositions · clinician workspace

**Application:** [Open the clinician workspace](https://whizkidal.github.io/Therapy-Games/speech-language/speech-sounds/multiple-oppositions.html)  
**Code:** `multiple-oppositions.html`  
**Data backend:** existing Supabase project `fplfahemudvbeqqcmvbe` (Track @ Whiz Kids), Sydney.  
**Current status:** Deployed clinician pilot. Live email-link sign-in requires a real approved user test before clinical release.

## Product boundary

This is a generic *therapy program* with embedded response measurement, **not** the Track participation/regulation application. GitHub stores reusable code only. No identifiable child records, session notes or clinical measurements may be committed here.

## Sign-in

Approved clinician identities use the same Supabase Auth project as Track. Email sign-in links open the existing Track website; return to this page and choose **Continue**. This works across these two repositories because both currently publish on the same `whizkidal.github.io` origin. **If either site moves to a custom domain, this shared browser-session mechanism must be retested or replaced with an explicit cross-domain authentication flow.**

The frontend checks the clinician's existing `participant_access` role before showing records. Each therapy data table also has restrictive clinician-only RLS plus owner-only access. Parent/school accounts are not authorised for this console.

## Data model

- `therapy_children`: pseudonymous code and owning clinician.
- `therapy_programs`: active and untreated contrast targets, trained word sets, generalisation probes and program version.
- `therapy_sessions`: session number/date and target-version snapshot.
- `therapy_trials`: separate response/condition/score per attempt, onset, vowel, other errors, transitions, task level, cueing and associated activity.

The database currently restricts **each clinician to their own child records**; collaborating SP/TA permissions have not been implemented. Do not weaken RLS to enable sharing.

## Session flow

1. Sign in; create a pseudonymous client code.
2. Create a program. Choose an entirely blank Multiple Oppositions configuration or the **illustrative**, editable [b] example. Confirm intended contrasts; never assume the example is suitable for another child.
3. Select **Targets** and edit the phoneme/cluster contrasts, matched practice word sets and wholly separate untreated probes. Save the program version.
4. Start a session. The program definition is copied into its snapshot.
5. Capture a cold initial picture-naming attempt once per word, without a model. If the clinician models afterwards, record a **supported probe** separately.
6. Record trained productions and the actual cue level; five-attempt entry offers individual onset/vowel/cue/error scores. Use listening, PA, repair, vowels and connected speech tabs with distinct task-level scoring.
7. **Save response**; the app reads the inserted record back from Supabase and reports a confirmed save. Refresh records; reopen the client, program and session; check longitudinal progress. Export CSV/JSON as needed.
8. Print parent practice instructions, which use only approved training words—not withheld probes.

## Verification

- Chromium automation (mocked Supabase HTTP responses): **PASS** for shared session detection, client/program/session creation, untreated cold response, duplicate cold-probe safeguard, modelled response, auditory discrimination/PA, five-attempt entry, read-back, refresh and JSON export.
- Supabase authenticated SQL transaction (real database, rollback): **PASS** for clinician create/read/update/delete, separate owner-scoped records, and parent-account non-visibility.
- GitHub Pages deployment: check latest Pages Actions run for the matching commit.
- **Not yet verified:** live email delivery and a real user signing in on the published website, followed by saving/reopening a real browser-origin test record. The application remains a **pilot** until that test succeeds.

## Do not publish clinical data

The site is public *code*, not public clinical records. Data go via authenticated Supabase REST with RLS. Use only pseudonymous codes within the application until privacy/governance arrangements are reviewed.

## Next engineering work

- Complete live clinician login and one-session smoke test on the published URL.
- Decide how SP oversight and delegated TA record entry should work without undermining owner-only confidentiality.
- Add immutable amendment/audit tracking, clearer version lifecycle and planned parent handover output.
- Enable Supabase Auth leaked-password protection (project security advisory).
- Confirm formal clinical record transfer/archival with SharePoint/Halaxy practices.

See [platform operating rules](../../PLATFORM_OPERATING_RULES.md).
