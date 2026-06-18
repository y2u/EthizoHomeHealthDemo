# Ethizo Home Health Care Demo Coverage Test Script

This script is dedicated to the newer demo-coverage capabilities added after the core workflow build. Use it to validate:

- OASIS submission readiness
- clinical decision support
- plan of care (485)
- PDGM and utilization/LUPA review
- coder review
- care coordination and communication
- eFax / referral inbox
- QAPI infrastructure
- star rating / VBP-style internal quality tracking

Run this after the normal app setup is working.

## 1. Startup

### Backend
```bash
cd "/Users/air/Documents/New project/backend"
bin/cake migrations migrate
bin/cake server -p 8765
```

### Frontend
```bash
cd "/Users/air/Documents/New project/frontend"
npm run dev
```

Open the Vite URL and confirm the app shows `API connected`.

## 2. Test Patient and Episode Setup

If you already have a clean test patient and episode, you can reuse it. Otherwise create one with this baseline:

### Patient
1. Open `Patients`.
2. Click `Add patient`.
3. Create:
   - First name: `Eleanor`
   - Last name: `Bishop`
   - DOB: `1946-02-14`
   - Gender: `Female`
   - Address: `125 Peachtree View`
   - City: `Atlanta`
   - State: `GA`
   - ZIP: `30309`
   - Phone: `404-555-0101`
   - Insurance: `Medicare`
   - Medicare number: `1EG4TE5MK73`
   - Physician: `Dr. Hayes`

### Referral
1. Open `Referrals`.
2. Click `Add referral`.
3. Create:
   - Patient: `Eleanor Bishop`
   - Source: `Northside Hospital`
   - Admission source: `Hospital discharge`
   - Diagnosis: `I50.32 Chronic diastolic heart failure`
   - Planned SOC: today
   - Requested disciplines: `SN, PT`
   - Referring provider: `Dr. Alexis Monroe`
   - PCP: `Dr. Hayes`
   - Caregiver: `Samuel Bishop`
   - Service location: `Patient home`
   - Intake ready: `Yes`
4. Save the referral.
5. In the referral queue, click `Create episode`.

### Assessment and SOC visit
1. Open `Episodes`.
2. Select the new episode.
3. Open `SOC and OASIS`.
4. Add a finalized SOC assessment with:
   - Principal diagnosis code: `I50.32`
   - Functional score: `14`
   - Comorbidity: `low`
   - Medication reconciliation: `Yes`
   - Homebound status: `homebound`
   - Homebound narrative completed
   - Fall risk: `high`
   - Hospitalization risk: `elevated`
   - Emergency preparedness reviewed: `Yes`
   - Care plan goals completed
   - Clinical summary completed
5. Save the assessment.
6. Open `Clinician`.
7. Schedule and complete a `soc` visit for the episode.
8. Return to `Episodes` and activate the episode.

Expected result:
- episode becomes active
- NOA/claim draft is present
- episode insights can now be generated from live data

## 3. Clinical Decision Support

### Goal
Verify that assessment and visit content drive clinical alerts.

### Steps
1. Open `Episodes`.
2. Select the active episode.
3. Open the `Clinical` tab.
4. In `Clinical Decision Support`, review the alerts.

### Expected results
- you should see clinically meaningful alerts when risk factors are present
- expected alert themes may include:
  - high fall risk without enough intervention evidence
  - hospitalization risk without clear follow-up
  - medication issues without action
  - incomplete homebound support

### Resolution test
1. Open `Clinician`.
2. Edit or add visit documentation for the same episode.
3. Include stronger intervention/follow-up details such as:
   - fall prevention teaching
   - escalation plan
   - medication follow-up
4. Submit the chart to QA.
5. Return to `Episodes`.

### Pass criteria
- the alert set updates based on stronger documentation
- unresolved issues remain visible
- resolved issues reduce or disappear

## 4. Documentation Integrity

### Goal
Verify assessment and visit integrity scoring.

### Steps
1. In `Episodes`, review the `Clinical Decision Support` and `Pre-Bill` related panels.
2. Look for documentation integrity scoring or warnings.
3. In `Clinician`, open a visit and intentionally leave a clinically important section weak or blank.
4. Submit to QA.

### Expected results
- integrity warnings are shown separately from ordinary workflow notes
- QA release should not be appropriate when core sections are inconsistent or incomplete

### Pass criteria
- integrity scoring reacts to missing/inconsistent documentation
- improving the chart content improves readiness

## 5. OASIS Submission Readiness

### Goal
Verify demo iQIES-ready package preparation and queue behavior.

### Steps
1. Open `Episodes`.
2. Select the active episode.
3. In `OASIS Submission Readiness`, click the action to prepare the submission package.
4. Review the prepared submission record.
5. Open `QA`.
6. Review the `OASIS Submission Queue`.

### Expected results
- a new OASIS submission entry is created
- status should be `ready` if the assessment is complete enough
- `iQIES-ready` should show as true when readiness is met
- payload/export notes should be present in the record or status area

### Rejection test
1. In the OASIS submission workflow, change the submission to `rejected`.
2. Enter a rejection note like:
   - `Demo iQIES validation rejected the package for remapping.`
3. Go to `QA`.

### Pass criteria
- the rejected submission shows acknowledgment/rejection state
- a QA follow-up task appears for rejected OASIS submission handling

## 6. Plan of Care (485)

### Goal
Verify auto-generated plan-of-care content from assessment, admission snapshot, and recent charting.

### Steps
1. Open `Episodes`.
2. Select the active episode.
3. In `Plan of Care (485)`, click the action to generate a plan of care.
4. Open the resulting plan entry.
5. Review:
   - summary
   - goals
   - interventions
   - printable/exportable content

### Expected results
- a new plan-of-care version is created
- printable content includes a 485-style summary
- diagnosis, certification dates, goals, and interventions appear in the plan
- if signed physician-order context exists, review status should reflect that

### Versioning test
1. Update physician orders or visit documentation.
2. Generate the plan of care again.

### Pass criteria
- a newer plan version is created
- version history is visible through the list/state
- newer content reflects the latest chart/order context

## 7. PDGM and Utilization / LUPA Protection

### Goal
Verify PDGM explanation and utilization risk visibility.

### PDGM steps
1. Open `Episodes`.
2. Select the episode.
3. Review `PDGM and Utilization Review`.

### PDGM expected results
- PDGM group code is shown
- breakdown includes:
  - admission source
  - clinical grouping
  - timing
  - functional level
  - comorbidity adjustment
- there is a readable explanation, not just a code

### Utilization/LUPA steps
1. Open `Clinician`.
2. Schedule several routine visits for the episode.
3. Then mark one or more planned visits as missed or reschedule them off pattern.
4. Return to `Episodes` and `Billing`.

### Pass criteria
- utilization review reflects visit projection
- low projected utilization surfaces a LUPA-style risk warning
- Billing and/or Episodes show risk visibility
- scheduling changes can increase the risk warning

## 8. Coder Review Queue

### Goal
Verify coder review creation from billing/coding issues.

### Steps
1. Open `Billing`.
2. Review `Coder Review Queue`.
3. If the queue is empty, create a mismatch scenario:
   - edit the assessment diagnosis or relevant coding context
   - or keep a billing blocker unresolved
4. Use the sync action if present for coder review generation.

### Expected results
- coder review items appear when there are coding or claim-edit issues
- categories may include:
  - coding
  - documentation
  - utilization
  - OASIS
  - orders
- recommendations should explain the correction path

### Pass criteria
- coder review items are generated from real episode issues
- items can be updated or resolved through the workflow
- corrected-claim preparation guidance is visible when applicable

## 9. Care Coordination and Communication

### Goal
Verify episode-level communication logging and follow-up ownership.

### Steps
1. Open `Episodes`.
2. Select the active episode.
3. In `Care Coordination and Communication`, add a communication log entry:
   - Contact: `Dr. Alexis Monroe`
   - Role: `Referring provider`
   - Method: `phone`
   - Topic: `Post-SOC follow-up`
   - Outcome: `Continue daily weights and escalate worsening edema.`
   - Follow-up owner: `Nina Clinician`
4. Save the entry.

### Expected results
- the communication entry appears in the episode log
- follow-up state should reflect due/open follow-up when applicable

### Pass criteria
- entries are saved against the episode
- provider/patient/caregiver communications can all be represented
- follow-up ownership is visible and durable

## 10. eFax / Referral Inbox

### Goal
Verify simulated inbound referral packet management.

### Steps
1. Open `Referrals`.
2. In `eFax / Referral Inbox`, add a fax message:
   - Source: `Piedmont Referral Fax`
   - From number: `404-555-0120`
   - Subject: `Referral packet`
   - Packet type: `referral_packet`
   - Received at: current date/time
3. Save the fax item.
4. Route the fax message.

### Routing test A
1. Route it as classification only.

### Expected result
- routing status changes from new to a classified/routed state

### Routing test B
1. Add another fax message.
2. Route it with referral creation enabled.

### Pass criteria
- the fax inbox stores inbound packet metadata
- routing actions update status
- when requested, a new referral is created from the faxed packet
- the referral queue reflects the created referral

## 11. QAPI Infrastructure

### Goal
Verify QAPI project creation and recurring quality tracking support.

### Steps
1. Open `Admin`.
2. Go to `QAPI Infrastructure`.
3. Add a QAPI project with:
   - Title: `Reduce delayed QA release`
   - Measure: `QA closure timeliness`
   - Owner: `QA Supervisor`
   - Review cadence: `Monthly`
   - Status: `Active`
   - Target: `95% within 2 days`
   - Current value: `82%`
   - Intervention plan: `Daily triage and assignment review`
4. Save the project.

### Expected results
- a QAPI project is created
- the project stores owner, measure, target, cadence, and intervention plan

### Pass criteria
- QAPI records are visible and editable
- they can hold operational quality-improvement content for leadership/demo review

## 12. Star Rating / VBP Tracking

### Goal
Verify demo internal quality scorecards and trend summaries.

### Steps
1. Open `Admin`.
2. Review `Star Rating and VBP Tracking`.
3. Trigger the quality metric capture action if present.
4. Review the refreshed metrics.

### Expected results
- quality metrics are grouped into an internal scorecard view
- expected measure themes may include:
  - documentation timeliness
  - QA closure timeliness
  - hospitalization-risk follow-up
  - timely SOC
  - utilization preservation
- metrics should show score-style summaries and trend context where available

### Pass criteria
- quality metric snapshots can be captured
- the admin view shows current internal performance tracking
- this is clearly internal demo tracking, not official CMS output

## 13. Cross-Module Readiness Consistency

### Goal
Verify the same blocker story is visible across modules.

### Steps
1. Create one outstanding issue, for example:
   - rejected OASIS submission
   - coding mismatch
   - utilization/LUPA risk
2. Review the same episode in:
   - `Episodes`
   - `Billing`
   - `QA`
   - `Admin`

### Pass criteria
- relevant risk/blocker status appears in the right module
- OASIS rejection shows in QA and episode review
- coding issues show in Billing coder review
- utilization risk shows in episode/billing context
- quality activity shows in Admin when captured

## 14. Final Pass Criteria

The dedicated demo-coverage implementation passes if all of the following are true:

- OASIS submission package can be prepared from a finalized assessment
- rejected OASIS submission creates actionable QA follow-up
- plan of care can be generated and versioned
- clinical decision-support alerts appear from chart content and change when documentation improves
- documentation integrity warnings are distinguishable from generic workflow blockers
- PDGM review explains why the group was assigned
- utilization/LUPA-style risk appears when projected visits drop
- coder review queue appears from billing/coding issues
- communication log stores follow-up ownership
- fax inbox stores and routes demo referral packets
- QAPI projects can be created and maintained
- internal quality/VBP-style scorecards can be captured and reviewed

## 15. Troubleshooting Notes

- If the app falls back to demo mode unexpectedly, confirm the backend is running and reachable at the configured API base.
- If new backend resources do not appear, rerun:
```bash
cd "/Users/air/Documents/New project/backend"
bin/cake migrations migrate
```
- If a queue appears empty, make sure the base episode is active and has at least one finalized assessment plus claim/QA context.
- For the cleanest results, test these features on one fresh episode before mixing in older test data.
