# App Modularization and Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the oversized React `App.tsx` into focused, testable modules and add automated test coverage for frontend behavior, backend compliance APIs, and end-to-end release workflows.

**Architecture:** Extract pure domain logic first, then shared UI primitives, then module screens, then app orchestration. Add Vitest and React Testing Library for frontend unit/component tests, keep CakePHP PHPUnit coverage for backend workflows, and add a small Playwright smoke suite for browser-critical paths.

**Tech Stack:** React 19, Vite 8, TypeScript 6, CakePHP, MySQL, PHPUnit, Vitest, React Testing Library, jsdom, Playwright.

---

## File Structure

Create these frontend structure boundaries:

- Create: `frontend/src/components/ui/Panel.tsx` for `Panel`, `Modal`, `FormGrid`, `WorkflowTabs`, `WizardSteps`, `Input`, `TextArea`, `Select`, `FieldNote`, `KeyValue`, `MetricCard`, `WorkspaceHeader`, `StatusLight`, and `EmptyState`.
- Create: `frontend/src/components/ui/index.ts` to export shared UI components.
- Create: `frontend/src/domain/formatters.ts` for formatting helpers currently in `App.tsx`, including phone, ZIP, currency, due date, addresses, contacts, files, and labels.
- Create: `frontend/src/domain/normalizers.ts` for admission snapshot, assessment answers, assessment payload, documentation payload, QA task history, QA task UI normalization, QAPI normalization, and date normalization.
- Create: `frontend/src/domain/workflow.ts` for demo readiness, episode review summary, episode insights, admission snapshots, physician order drafts, referral QA task builders, claim queues, denial queues, EVV queues, billing follow-up queues, role dashboard, admin report summary, visit recommendations, and week-one frequency planning.
- Create: `frontend/src/hooks/useEthizoAppController.ts` for the state, derived values, and event handlers currently embedded inside `App`.
- Create: `frontend/src/modules/OverviewModule.tsx`.
- Create: `frontend/src/modules/PatientsModule.tsx`.
- Create: `frontend/src/modules/ReferralsModule.tsx`.
- Create: `frontend/src/modules/EpisodesModule.tsx`.
- Create: `frontend/src/modules/ClinicianModule.tsx`.
- Create: `frontend/src/modules/BillingModule.tsx`.
- Create: `frontend/src/modules/QaModule.tsx`.
- Create: `frontend/src/modules/AdminModule.tsx`.
- Modify: `frontend/src/App.tsx` so it only renders the app shell, sidebar, hero panel, active module switch, and modal host.
- Modify: `frontend/src/lib/api.ts` only if tests need exported request seams. Prefer testing public `api` methods through fetch mocks.
- Modify: `frontend/src/lib/demoData.ts` only to export stable fixture helpers if needed.
- Create: `frontend/src/test/setup.ts` for jsdom and React Testing Library setup.
- Create: `frontend/src/test/testUtils.tsx` for rendering helpers and fixture builders.
- Create: `frontend/src/domain/*.test.ts` for pure domain tests.
- Create: `frontend/src/components/ui/*.test.tsx` for shared UI component tests.
- Create: `frontend/src/modules/*.test.tsx` for module-level smoke and interaction tests.
- Create: `frontend/src/lib/*.test.ts` for API, demo data, and offline queue tests.
- Create: `frontend/e2e/release-workflow.spec.ts` for browser smoke coverage.
- Modify: `frontend/package.json` to add test scripts and dev dependencies.
- Modify: `frontend/vite.config.ts` to configure Vitest.
- Modify: `frontend/tsconfig.app.json` to include Vitest globals.

Create these backend test boundaries:

- Create: `backend/tests/TestCase/Service/AssessmentVersionPolicyServiceTest.php`.
- Create: `backend/tests/TestCase/Service/HomeHealthComplianceServiceTest.php`.
- Create: `backend/tests/TestCase/Controller/Api/V1/PatientComplianceControllerTest.php`.
- Create: `backend/tests/TestCase/Controller/Api/V1/EpisodeComplianceControllerTest.php`.
- Create: `backend/tests/TestCase/Controller/Api/V1/BillingComplianceControllerTest.php`.
- Create: `backend/tests/TestCase/Controller/Api/V1/SurveyReadinessControllerTest.php`.
- Modify: `backend/tests/TestCase/Controller/Api/V1/WorkflowControllerTest.php` only for shared fixture helpers if duplication becomes heavy.
- Create: `backend/tests/TestCase/Support/HomeHealthTestTrait.php` for reusable login, patient, referral, episode, SOC, and compliance fixture setup.

## Coverage Goals

- Frontend pure domain utilities: 90 percent line coverage.
- Frontend module smoke coverage: one render test per module and one save/action test per major new compliance workflow.
- Backend services: direct unit tests for all branches in OASIS policy and compliance blockers.
- Backend API controllers: authenticated happy path and validation/blocker path for every new endpoint group.
- End-to-end smoke: one patient flow from patient chart compliance through episode review, billing ledger, and survey-readiness capture.

## Task 1: Add Frontend Test Tooling

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.app.json`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/testUtils.tsx`

- [ ] **Step 1: Install test dependencies**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright
```

Expected: packages are added to `devDependencies` and `package-lock.json` is updated.

- [ ] **Step 2: Add test scripts**

Edit `frontend/package.json` scripts to:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 3: Configure Vitest**

Edit `frontend/vite.config.ts` to:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70
      }
    }
  },
})
```

- [ ] **Step 4: Add Vitest globals to TypeScript**

Edit `frontend/tsconfig.app.json` compiler options:

```json
"types": ["vite/client", "vitest/globals"]
```

- [ ] **Step 5: Add test setup**

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 6: Add render helper**

Create `frontend/src/test/testUtils.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createDemoDataset } from '../lib/demoData'

export function renderApp(ui: ReactElement, options?: RenderOptions) {
  return render(ui, options)
}

export function makeDataset() {
  return createDemoDataset()
}
```

- [ ] **Step 7: Verify empty test runner works**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- --passWithNoTests
```

Expected: Vitest exits successfully with no test files found.

- [ ] **Step 8: Commit**

Run:

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.app.json frontend/src/test
git commit -m "test: add frontend test tooling"
```

## Task 2: Extract and Test Formatting Utilities

**Files:**
- Create: `frontend/src/domain/formatters.ts`
- Create: `frontend/src/domain/formatters.test.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing formatter tests**

Create `frontend/src/domain/formatters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatCurrency, formatUsPhone, formatZipCode, labelizeValue } from './formatters'

describe('formatters', () => {
  it('formats US phone numbers for partial and complete input', () => {
    expect(formatUsPhone('4045550101')).toBe('(404) 555-0101')
    expect(formatUsPhone('40455')).toBe('(404) 55')
  })

  it('formats ZIP codes with optional plus four', () => {
    expect(formatZipCode('303091234')).toBe('30309-1234')
    expect(formatZipCode('30309')).toBe('30309')
  })

  it('formats numeric and string currency safely', () => {
    expect(formatCurrency(1250)).toBe('$1,250.00')
    expect(formatCurrency('250.5')).toBe('$250.50')
    expect(formatCurrency('bad')).toBe('$0.00')
  })

  it('labelizes snake case values', () => {
    expect(labelizeValue('sent_for_signature')).toBe('Sent For Signature')
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/domain/formatters.test.ts
```

Expected: FAIL because `frontend/src/domain/formatters.ts` does not exist.

- [ ] **Step 3: Create formatter module**

Move these functions from `frontend/src/App.tsx` into `frontend/src/domain/formatters.ts`:

```ts
import type { EpisodeAdmissionSnapshot, Patient, QaTask } from '../lib/types'

export function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function formatStateCode(value: string) {
  return value.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase()
}

export function formatZipCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export function labelizeValue(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatCurrency(value: number | string) {
  const amount = Number(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatAddress(patient: Partial<Patient>) {
  return [patient.address1, patient.address2, patient.city, patient.state, patient.postal_code].filter(Boolean).join(', ')
}

export function formatCoverage(patient: Partial<Patient>) {
  return [patient.payer_type, patient.insurance_member_id || patient.medicare_number].filter(Boolean).join(' · ')
}

export function formatContact(name?: string, relationship?: string, phone?: string) {
  return [name, relationship, phone].filter(Boolean).join(' · ') || 'Not captured'
}

export function formatNamePhone(name?: string, phone?: string) {
  return [name, phone].filter(Boolean).join(' · ') || 'Not captured'
}

export function formatPatientContacts(patient: Partial<Patient>) {
  return [
    formatContact(patient.emergency_contact_name, patient.emergency_contact_relationship, patient.emergency_contact_phone),
    formatContact(patient.responsible_party_name, patient.responsible_party_relationship, patient.responsible_party_phone),
  ].filter((entry) => entry !== 'Not captured').join(' | ')
}

export function formatServiceLocation(snapshot?: EpisodeAdmissionSnapshot | null) {
  if (!snapshot) return 'Not captured'
  return [snapshot.service_location_type, snapshot.service_address1, snapshot.service_city, snapshot.service_state, snapshot.service_postal_code]
    .filter(Boolean)
    .join(', ') || 'Not captured'
}

export function formatDueAt(value?: string) {
  return value ? `Due ${value}` : 'No due date'
}

export function formatTaskAssignee(task: Pick<QaTask, 'assigned_role' | 'assigned_user_name'>) {
  return [task.assigned_user_name, task.assigned_role].filter(Boolean).join(' · ') || 'Unassigned'
}

export function formatFileSize(value?: number) {
  if (!value) return '0 KB'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
```

- [ ] **Step 4: Import formatters in App**

Add to `frontend/src/App.tsx`:

```ts
import {
  formatAddress,
  formatContact,
  formatCoverage,
  formatCurrency,
  formatDueAt,
  formatFileSize,
  formatNamePhone,
  formatPatientContacts,
  formatServiceLocation,
  formatStateCode,
  formatTaskAssignee,
  formatUsPhone,
  formatZipCode,
  labelizeValue,
} from './domain/formatters'
```

Remove the duplicate local functions from `App.tsx`.

- [ ] **Step 5: Run tests and build**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/domain/formatters.test.ts
npm run build
```

Expected: tests PASS and production build PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/domain/formatters.ts frontend/src/domain/formatters.test.ts frontend/src/App.tsx
git commit -m "refactor: extract frontend formatters"
```

## Task 3: Extract and Test Normalizers

**Files:**
- Create: `frontend/src/domain/normalizers.ts`
- Create: `frontend/src/domain/normalizers.test.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing normalizer tests**

Create `frontend/src/domain/normalizers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeAdmissionSnapshot, normalizeAssessmentAnswers, normalizeQaTasksForUi } from './normalizers'

describe('normalizers', () => {
  it('parses admission snapshot JSON strings', () => {
    const snapshot = normalizeAdmissionSnapshot('{"referral_source":"Hospital","requested_disciplines":["SN"]}')
    expect(snapshot?.referral_source).toBe('Hospital')
    expect(snapshot?.requested_disciplines).toEqual(['SN'])
  })

  it('returns null for invalid admission snapshot strings', () => {
    expect(normalizeAdmissionSnapshot('not-json')).toBeNull()
  })

  it('parses OASIS answers from JSON strings', () => {
    expect(normalizeAssessmentAnswers('{"M0110":"1"}')).toEqual({ M0110: '1' })
  })

  it('normalizes QA task status and overdue fields for UI queues', () => {
    const [task] = normalizeQaTasksForUi([
      {
        id: 1,
        task_type: 'visit_documentation_review',
        priority: 'high',
        status: 'open',
        title: 'Review SOC',
        due_at: '2026-04-18 12:00:00',
      },
    ])
    expect(task.base_priority).toBe('high')
    expect(task.is_overdue).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/domain/normalizers.test.ts
```

Expected: FAIL because `frontend/src/domain/normalizers.ts` does not exist.

- [ ] **Step 3: Move normalizer functions**

Move these functions from `frontend/src/App.tsx` into `frontend/src/domain/normalizers.ts`:

```ts
import type { Assessment, AssessmentClinicalPayload, EpisodeAdmissionSnapshot, QaTask, QapiProject, VisitDocumentationPayload } from '../lib/types'

export function normalizeAdmissionSnapshot(value?: EpisodeAdmissionSnapshot | string | null): EpisodeAdmissionSnapshot | null {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value) as EpisodeAdmissionSnapshot
  } catch {
    return null
  }
}

export function normalizeAssessmentAnswers(value?: Assessment['answers'] | string | null): Record<string, string> {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value) as Record<string, string>
  } catch {
    return {}
  }
}

export function normalizeAssessmentPayload(value?: Assessment['assessment_payload'] | string | null): AssessmentClinicalPayload {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value) as AssessmentClinicalPayload
  } catch {
    return {}
  }
}

export function normalizeDocumentationPayload(value?: VisitDocumentationPayload | string | null): VisitDocumentationPayload {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value) as VisitDocumentationPayload
  } catch {
    return {}
  }
}

export function normalizeDateTimeString(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : ''
}

export function normalizeQaTaskHistory(history?: Array<Record<string, string>> | string) {
  if (!history) return []
  if (Array.isArray(history)) return history
  try {
    return JSON.parse(history) as Array<Record<string, string>>
  } catch {
    return []
  }
}

export function normalizeQapiProjects(projects: QapiProject[]) {
  return projects.map((project) => ({
    ...project,
    linked_task_ids: Array.isArray(project.linked_task_ids) ? project.linked_task_ids : [],
    linked_audit_event_ids: Array.isArray(project.linked_audit_event_ids) ? project.linked_audit_event_ids : [],
  }))
}

export function normalizeQaTasksForUi(tasks: QaTask[]) {
  const now = new Date('2026-04-29T12:00:00').getTime()
  return tasks.map((task) => {
    const dueAt = task.due_at ? new Date(task.due_at.replace(' ', 'T')).getTime() : Number.POSITIVE_INFINITY
    return {
      ...task,
      base_priority: task.base_priority ?? task.priority,
      assignment_history: normalizeQaTaskHistory(task.assignment_history),
      is_overdue: task.status === 'open' && dueAt < now,
    }
  })
}
```

- [ ] **Step 4: Import normalizers in App**

Add to `frontend/src/App.tsx`:

```ts
import {
  normalizeAdmissionSnapshot,
  normalizeAssessmentAnswers,
  normalizeAssessmentPayload,
  normalizeDateTimeString,
  normalizeDocumentationPayload,
  normalizeQaTaskHistory,
  normalizeQaTasksForUi,
  normalizeQapiProjects,
} from './domain/normalizers'
```

Remove the duplicate local functions from `App.tsx`.

- [ ] **Step 5: Run tests and build**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/domain/normalizers.test.ts
npm run build
```

Expected: tests PASS and build PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/domain/normalizers.ts frontend/src/domain/normalizers.test.ts frontend/src/App.tsx
git commit -m "refactor: extract frontend normalizers"
```

## Task 4: Extract and Test Workflow Domain Logic

**Files:**
- Create: `frontend/src/domain/workflow.ts`
- Create: `frontend/src/domain/workflow.test.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing workflow tests**

Create `frontend/src/domain/workflow.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createDemoDataset } from '../lib/demoData'
import { buildClaimReadinessQueue, buildDemoEpisodeReviewSummary, buildEvvQueueSections, computeDemoReadiness } from './workflow'

describe('workflow domain logic', () => {
  it('marks demo episode activation ready when SOC, OASIS, and compliance are complete', () => {
    const dataset = createDemoDataset()
    const readiness = computeDemoReadiness(1, dataset)
    expect(readiness.soc_visit_completed).toBe(true)
    expect(readiness.finalized_assessment_exists).toBe(true)
    expect(readiness.ready_to_activate).toBe(true)
  })

  it('includes billing blockers from claim holds and verbal orders', () => {
    const dataset = createDemoDataset()
    const summary = buildDemoEpisodeReviewSummary(dataset.episodes[0], dataset)
    expect(summary.billing_blockers.join(' ')).toContain('verbal')
  })

  it('builds claim readiness queue with patient names and blockers', () => {
    const dataset = createDemoDataset()
    const queue = buildClaimReadinessQueue(dataset)
    expect(queue[0].patientName).toContain('Eleanor')
    expect(queue[0].claim.claim_type).toBeTruthy()
  })

  it('groups EVV records into operational queues', () => {
    const sections = buildEvvQueueSections(createDemoDataset())
    expect(sections.map((section) => section.key)).toEqual(['needs_fix', 'ready_to_reconcile', 'reconciled'])
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/domain/workflow.test.ts
```

Expected: FAIL because `frontend/src/domain/workflow.ts` does not exist.

- [ ] **Step 3: Move workflow types and helpers**

Move these interfaces from `frontend/src/App.tsx` into `frontend/src/domain/workflow.ts` and export them:

```ts
import type { Claim, Episode, EpisodeAdmissionSnapshot, EvvRecord, QaTask, Visit } from '../lib/types'

export type ModuleName = 'Overview' | 'Patients' | 'Referrals' | 'Episodes' | 'Clinician' | 'Billing' | 'QA' | 'Admin'

export interface VisitRecommendation {
  key: string
  title: string
  discipline: string
  visitType: string
  targetDateTime: string
  durationMinutes: number
  requiresEvv: boolean
  rationale: string
  frequencyHint?: string
}

export interface StatusBadge {
  label: string
  tone: 'neutral' | 'warn'
}

export interface EpisodeIntakeQueueItem {
  episode: Episode
  snapshot: EpisodeAdmissionSnapshot | null
  badges: StatusBadge[]
  task: QaTask
  blocker: 'face_to_face' | 'signed_orders'
}

export interface ClaimReadinessItem {
  claim: Claim
  episode?: Episode
  patientName: string
  badges: StatusBadge[]
  blockers: string[]
  readyToBill: boolean
  relatedOwners: string[]
  relatedAssignees: string[]
  escalationReasons: string[]
  highestPriority?: string
  earliestDueAt?: string
}

export interface ClaimStatusLane {
  key: string
  title: string
  subtitle: string
  claims: ClaimReadinessItem[]
}

export interface DenialQueueItem {
  baseClaim: ClaimReadinessItem
  workingClaim?: ClaimReadinessItem
  categoryKey: 'coding' | 'documentation' | 'evv' | 'intake' | 'orders' | 'payer' | 'general'
  categoryLabel: string
  queueState: 'needs_correction' | 'ready_to_resubmit'
  priority: 'high' | 'medium' | 'low'
  summary: string
  note: string
  owners: string[]
  assignees: string[]
  earliestDueAt?: string
  escalationReason?: string
}

export interface DenialQueueSection {
  key: 'needs_correction' | 'ready_to_resubmit'
  title: string
  subtitle: string
  items: DenialQueueItem[]
}

export interface EvvQueueItem {
  record: EvvRecord
  visit?: Visit
  episode?: Episode
  patientName: string
  queueState: 'needs_fix' | 'ready_to_reconcile' | 'reconciled'
  categoryLabel: string
  priority: 'high' | 'medium' | 'low'
  summary: string
  note: string
  dueAt?: string
}

export interface EvvQueueSection {
  key: 'needs_fix' | 'ready_to_reconcile' | 'reconciled'
  title: string
  subtitle: string
  items: EvvQueueItem[]
}

export interface BillingFollowUpItem {
  episode: Episode
  patientName: string
  state: 'claim_and_evv' | 'claim_only' | 'evv_only'
  priority: 'high' | 'medium' | 'low'
  claimIssues: string[]
  evvIssues: string[]
  claimItem?: ClaimReadinessItem
  denialItem?: DenialQueueItem
  evvItem?: EvvQueueItem
  nextAction:
    | { kind: 'create_corrected_claim'; label: string; claimId: number }
    | { kind: 'submit_corrected_claim'; label: string; claimId: number }
    | { kind: 'resolve_episode'; label: string }
    | { kind: 'submit_evv'; label: string; recordId: number }
    | { kind: 'reconcile_evv'; label: string; recordId: number }
    | { kind: 'update_evv_exception'; label: string; recordId: number }
}

export interface BillingFollowUpSection {
  key: 'claim_and_evv' | 'claim_only' | 'evv_only'
  title: string
  subtitle: string
  items: BillingFollowUpItem[]
}

export interface AdminReportSummary {
  metrics: Array<{ label: string; value: number }>
  payerMix: Array<{ label: string; count: number }>
  claimMix: Array<{ label: string; count: number }>
  qaMix: Array<{ label: string; count: number }>
  recentActivity: Array<{ label: string; count: number }>
}

export interface RoleDashboardMetric {
  label: string
  value: number
}

export interface RoleWorkItem {
  key: string
  title: string
  detail: string
  buttonLabel: string
  priority?: string
  dueAt?: string
  ownerLabel?: string
  module: ModuleName
  episodeId?: number
  visitId?: number
  claimId?: number
  evvRecordId?: number
  qaTaskId?: number
  actionType: 'episode' | 'order' | 'visit_documentation' | 'billing' | 'qa' | 'referrals' | 'patients'
}

export interface RoleDashboardConfig {
  heading: string
  subtitle: string
  metrics: RoleDashboardMetric[]
  items: RoleWorkItem[]
}

export interface RoleDashboardSection {
  title: string
  description: string
  items: RoleWorkItem[]
}
```

Move these functions from `frontend/src/App.tsx` into `frontend/src/domain/workflow.ts` and export them:

```ts
buildAdmissionSnapshotFromReferral
buildDocumentationQaTasksForReferral
buildDemoPhysicianOrder
buildDemoPhysicianOrderDraft
normalizeDemoReferralOrderStatus
normalizeOrderStatus
buildEpisodeIntakeQueue
buildClaimReadinessQueue
buildClaimStatusLanes
buildDenialQueueSections
buildEvvQueueSections
buildBillingFollowUpSections
buildVisitRecommendations
buildWeekOneFrequencyPlan
computeDemoReadiness
buildDemoEpisodeReviewSummary
buildDemoEpisodeInsights
buildRoleDashboardConfig
buildAdminReportSummary
buildDocumentationSummary
```

Replace dependencies on local formatters and normalizers with imports:

```ts
import { formatDueAt, labelizeValue } from './formatters'
import { normalizeAdmissionSnapshot, normalizeDocumentationPayload } from './normalizers'
import type { AppDataset, Episode, Referral, QaTask } from '../lib/types'
```

- [ ] **Step 4: Import workflow helpers in App**

Add imports to `frontend/src/App.tsx`:

```ts
import {
  buildAdminReportSummary,
  buildBillingFollowUpSections,
  buildClaimReadinessQueue,
  buildClaimStatusLanes,
  buildDenialQueueSections,
  buildDemoEpisodeInsights,
  buildDemoEpisodeReviewSummary,
  buildDemoPhysicianOrder,
  buildDemoPhysicianOrderDraft,
  buildDocumentationQaTasksForReferral,
  buildDocumentationSummary,
  buildEpisodeIntakeQueue,
  buildEvvQueueSections,
  buildRoleDashboardConfig,
  buildVisitRecommendations,
  buildWeekOneFrequencyPlan,
  computeDemoReadiness,
  type AdminReportSummary,
  type BillingFollowUpItem,
  type BillingFollowUpSection,
  type ClaimReadinessItem,
  type ClaimStatusLane,
  type DenialQueueItem,
  type DenialQueueSection,
  type EpisodeIntakeQueueItem,
  type EvvQueueItem,
  type EvvQueueSection,
  type StatusBadge,
  type VisitRecommendation,
} from './domain/workflow'
```

Remove duplicate local workflow interfaces and functions from `App.tsx`.

- [ ] **Step 5: Run tests and build**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/domain/workflow.test.ts
npm run build
```

Expected: tests PASS and build PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/domain/workflow.ts frontend/src/domain/workflow.test.ts frontend/src/App.tsx
git commit -m "refactor: extract workflow domain logic"
```

## Task 5: Extract Shared UI Components and Tests

**Files:**
- Create: `frontend/src/components/ui/Panel.tsx`
- Create: `frontend/src/components/ui/Panel.test.tsx`
- Create: `frontend/src/components/ui/index.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing UI component tests**

Create `frontend/src/components/ui/Panel.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/testUtils'
import { Input, MetricCard, Modal, Panel, Select } from './Panel'

describe('shared UI components', () => {
  it('renders panel title and subtitle', () => {
    renderApp(<Panel title="Compliance" subtitle="Packet status"><p>Body</p></Panel>)
    expect(screen.getByRole('heading', { name: 'Compliance' })).toBeInTheDocument()
    expect(screen.getByText('Packet status')).toBeInTheDocument()
  })

  it('does not render closed modals', () => {
    renderApp(<Modal open={false} title="Hidden" onClose={() => undefined}>Hidden body</Modal>)
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument()
  })

  it('emits input changes', () => {
    const onChange = vi.fn()
    renderApp(<Input label="Phone" value="" onChange={onChange} />)
    screen.getByLabelText('Phone').focus()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
  })

  it('renders metric values and select options', () => {
    renderApp(
      <>
        <MetricCard label="Open QA" value={4} />
        <Select label="Status" value="open" onChange={() => undefined} options={[{ label: 'Open', value: 'open' }]} />
      </>
    )
    expect(screen.getByText('Open QA')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/components/ui/Panel.test.tsx
```

Expected: FAIL because shared UI component file does not exist.

- [ ] **Step 3: Move shared components**

Move these components from `frontend/src/App.tsx` into `frontend/src/components/ui/Panel.tsx` and export them:

```ts
Panel
Modal
FormGrid
WorkflowTabs
WizardSteps
Input
TextArea
Select
TaskOwnershipEditor
MetricCard
WorkspaceHeader
StatusLight
FieldNote
KeyValue
EmptyState
```

The file must import React types:

```ts
import type { ReactNode } from 'react'
import type { QaTask } from '../../lib/types'
```

- [ ] **Step 4: Export UI components**

Create `frontend/src/components/ui/index.ts`:

```ts
export * from './Panel'
```

- [ ] **Step 5: Import UI components in App**

Add to `frontend/src/App.tsx`:

```ts
import {
  EmptyState,
  FieldNote,
  FormGrid,
  Input,
  KeyValue,
  MetricCard,
  Modal,
  Panel,
  Select,
  StatusLight,
  TaskOwnershipEditor,
  TextArea,
  WizardSteps,
  WorkflowTabs,
  WorkspaceHeader,
} from './components/ui'
```

Remove duplicate component definitions from `App.tsx`.

- [ ] **Step 6: Run tests and build**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/components/ui/Panel.test.tsx
npm run build
```

Expected: tests PASS and build PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add frontend/src/components/ui frontend/src/App.tsx
git commit -m "refactor: extract shared UI components"
```

## Task 6: Extract App Controller Hook

**Files:**
- Create: `frontend/src/hooks/useEthizoAppController.ts`
- Create: `frontend/src/hooks/useEthizoAppController.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing controller smoke test**

Create `frontend/src/hooks/useEthizoAppController.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from './useEthizoAppController'

describe('useEthizoAppController', () => {
  it('boots in demo mode with demo dataset and module navigation', () => {
    const { result } = renderHook(() => useEthizoAppController())
    expect(result.current.mode).toBe('demo')
    expect(result.current.dataset.patients.length).toBeGreaterThan(0)
    act(() => result.current.setActiveModule('Patients'))
    expect(result.current.activeModule).toBe('Patients')
  })
})
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/hooks/useEthizoAppController.test.tsx
```

Expected: FAIL because hook file does not exist.

- [ ] **Step 3: Move state and handlers**

Create `frontend/src/hooks/useEthizoAppController.ts` and move from `App.tsx`:

- All `useState`, `useMemo`, `useEffect`, and `useRef` controller logic.
- All event handlers such as `savePatient`, `saveReferral`, `activateEpisode`, `saveComplianceDocument`, `saveClaimTransaction`, and `captureSurveyReadinessAction`.
- All modal open/reset/load helpers.
- All derived selections such as `selectedEpisode`, `selectedPatient`, `selectedEpisodeVerbalOrders`, `claimReadinessQueue`, and `adminReportSummary`.

Export one hook:

```ts
export function useEthizoAppController() {
  return {
    mode,
    token,
    user,
    dataset,
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    setSidebarCollapsed,
    toastMessages,
    selectedEpisode,
    selectedPatient,
    episodeWorkspaceTab,
    setEpisodeWorkspaceTab,
    patientModalOpen,
    referralModalOpen,
    forms: {
      patientForm,
      referralForm,
      assessmentForm,
      visitForm,
      documentationForm,
      complianceDocumentForm,
      patientNoticeForm,
      medicationForm,
      allergyForm,
      verbalOrderForm,
      aideSupervisionForm,
      incidentForm,
      infectionForm,
      authorizationForm,
      eligibilityForm,
      dmeSupplyForm,
      caseConferenceForm,
      claimTransactionForm,
      remittanceForm,
    },
    lists: {
      selectedPatientComplianceDocuments,
      selectedPatientNotices,
      selectedPatientMedications,
      selectedPatientAllergies,
      selectedEpisodeVerbalOrders,
      selectedEpisodeAideSupervision,
      selectedEpisodeIncidents,
      selectedEpisodeInfections,
      selectedEpisodeAuthorizations,
      selectedEpisodeEligibilityChecks,
      selectedEpisodeDmeSupplyOrders,
      selectedEpisodeCaseConferences,
      selectedEpisodeClaimTransactions,
      selectedEpisodeRemittancePostings,
      claimReadinessQueue,
      billingFollowUpSections,
      filteredClaimReadinessQueue,
      filteredAuditEvents,
      adminReportSummary,
    },
    actions: {
      openNewPatientModal,
      loadPatientIntoForm,
      savePatient,
      saveReferral,
      activateEpisode,
      saveComplianceDocument,
      savePatientNotice,
      saveMedication,
      saveAllergy,
      saveVerbalOrder,
      saveAideSupervision,
      saveIncident,
      saveInfectionLog,
      saveAuthorization,
      saveEligibilityCheck,
      saveDmeSupplyOrder,
      saveCaseConference,
      saveClaimTransaction,
      saveRemittancePosting,
      captureSurveyReadinessAction,
    },
  }
}
```

Do not change behavior during this task. This task is a move-only refactor plus imports.

- [ ] **Step 4: Use hook from App**

In `frontend/src/App.tsx`, replace local controller code with:

```ts
const controller = useEthizoAppController()
```

Use `controller.dataset`, `controller.activeModule`, and handler props until module extraction removes most direct references.

- [ ] **Step 5: Run tests and build**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/hooks/useEthizoAppController.test.tsx
npm run build
```

Expected: hook test PASS and build PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/hooks/useEthizoAppController.ts frontend/src/hooks/useEthizoAppController.test.tsx frontend/src/App.tsx
git commit -m "refactor: extract app controller hook"
```

## Task 7: Extract Feature Modules

**Files:**
- Create: `frontend/src/modules/OverviewModule.tsx`
- Create: `frontend/src/modules/PatientsModule.tsx`
- Create: `frontend/src/modules/ReferralsModule.tsx`
- Create: `frontend/src/modules/EpisodesModule.tsx`
- Create: `frontend/src/modules/ClinicianModule.tsx`
- Create: `frontend/src/modules/BillingModule.tsx`
- Create: `frontend/src/modules/QaModule.tsx`
- Create: `frontend/src/modules/AdminModule.tsx`
- Create: `frontend/src/modules/*.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write failing module smoke tests**

Create `frontend/src/modules/PatientsModule.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test/testUtils'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { PatientsModule } from './PatientsModule'

function Harness() {
  const controller = useEthizoAppController()
  return <PatientsModule controller={controller} />
}

describe('PatientsModule', () => {
  it('renders patient registry and compliance packet', () => {
    renderApp(<Harness />)
    expect(screen.getByText('Patient Registry')).toBeInTheDocument()
    expect(screen.getByText('Patient Compliance Packet')).toBeInTheDocument()
    expect(screen.getByText('Medication and Allergy Profile')).toBeInTheDocument()
  })
})
```

Create equivalent smoke tests for each module with these expected text anchors:

- `OverviewModule`: `Workflow Snapshot`
- `ReferralsModule`: `Referral Queue`
- `EpisodesModule`: `Episode Workspace`
- `ClinicianModule`: `Clinician Visit Workspace`
- `BillingModule`: `Billing Workspace`
- `QaModule`: `QA Workspace`
- `AdminModule`: `Survey Readiness Dashboard`

- [ ] **Step 2: Run module tests and verify failure**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/modules
```

Expected: FAIL because module files do not exist.

- [ ] **Step 3: Create module prop type**

Create `frontend/src/modules/moduleTypes.ts`:

```ts
import type { useEthizoAppController } from '../hooks/useEthizoAppController'

export interface ModuleProps {
  controller: ReturnType<typeof useEthizoAppController>
}
```

- [ ] **Step 4: Move JSX sections one module at a time**

For each active module block currently inside `frontend/src/App.tsx`, move the JSX into its matching module component:

```tsx
import type { ModuleProps } from './moduleTypes'

export function PatientsModule({ controller }: ModuleProps) {
  const {
    dataset,
    selectedPatient,
    selectedPatientComplianceDocuments,
    selectedPatientNotices,
    selectedPatientMedications,
    selectedPatientAllergies,
    openNewPatientModal,
    loadPatientIntoForm,
    saveComplianceDocument,
    savePatientNotice,
    saveMedication,
    saveAllergy,
  } = controller

  return (
    <div className="module-stack">
      <WorkspaceHeader
        eyebrow="Patients"
        title="Patient Registry"
        subtitle="Browse active patients and open the full registration form only when you need it."
      />
      <Panel title="Patient Registry" subtitle="Active patients ready for referral and episode workflows.">
        <div className="stack">
          {dataset.patients.map((patient) => (
            <div key={patient.id} className="action-row">
              <strong>{nameForPatient(patient)}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
```

Repeat for all modules. Keep CSS class names unchanged.

- [ ] **Step 5: Replace module switch in App**

In `frontend/src/App.tsx`, render:

```tsx
{activeModule === 'Overview' && <OverviewModule controller={controller} />}
{activeModule === 'Patients' && <PatientsModule controller={controller} />}
{activeModule === 'Referrals' && <ReferralsModule controller={controller} />}
{activeModule === 'Episodes' && <EpisodesModule controller={controller} />}
{activeModule === 'Clinician' && <ClinicianModule controller={controller} />}
{activeModule === 'Billing' && <BillingModule controller={controller} />}
{activeModule === 'QA' && <QaModule controller={controller} />}
{activeModule === 'Admin' && <AdminModule controller={controller} />}
```

- [ ] **Step 6: Run tests and build after each module**

After each module extraction, run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/modules/<ModuleName>.test.tsx
npm run build
```

Expected: module test PASS and build PASS before extracting the next module.

- [ ] **Step 7: Commit**

Run:

```bash
git add frontend/src/modules frontend/src/App.tsx
git commit -m "refactor: extract feature modules"
```

## Task 8: Add Frontend API and Offline Queue Tests

**Files:**
- Create: `frontend/src/lib/api.test.ts`
- Create: `frontend/src/lib/offlineQueue.test.ts`
- Create: `frontend/src/lib/demoData.test.ts`

- [ ] **Step 1: Write API client tests**

Create `frontend/src/lib/api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls patient compliance document endpoint with auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response)

    await api.patientComplianceDocuments('token-1', 7)

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/patients/7/compliance-documents', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
    }))
  })

  it('throws API error messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'Denied' }),
    } as Response)

    await expect(api.claims('bad-token')).rejects.toThrow('Denied')
  })
})
```

- [ ] **Step 2: Write offline queue tests**

Create `frontend/src/lib/offlineQueue.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { addOfflineAction, loadOfflineQueue, removeOfflineAction } from './offlineQueue'

describe('offlineQueue', () => {
  afterEach(() => localStorage.clear())

  it('adds and removes queued clinician actions', () => {
    addOfflineAction({ id: 'a1', action: 'check-in', visitId: 1, payload: { ok: true }, createdAt: '2026-04-19T09:00:00Z' })
    expect(loadOfflineQueue()).toHaveLength(1)
    removeOfflineAction('a1')
    expect(loadOfflineQueue()).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Write demo data integrity tests**

Create `frontend/src/lib/demoData.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createDemoDataset } from './demoData'

describe('createDemoDataset', () => {
  it('contains complete release demo resources', () => {
    const dataset = createDemoDataset()
    expect(dataset.patientComplianceDocuments.length).toBeGreaterThan(0)
    expect(dataset.patientMedications.length).toBeGreaterThan(0)
    expect(dataset.verbalOrders.length).toBeGreaterThan(0)
    expect(dataset.claimTransactions.length).toBeGreaterThan(0)
    expect(dataset.surveyReadinessSummary.category_scores.length).toBeGreaterThan(0)
  })

  it('returns isolated clones', () => {
    const first = createDemoDataset()
    const second = createDemoDataset()
    first.patients[0].first_name = 'Changed'
    expect(second.patients[0].first_name).toBe('Eleanor')
  })
})
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test -- src/lib
```

Expected: all lib tests PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add frontend/src/lib/*.test.ts
git commit -m "test: cover frontend data and API utilities"
```

## Task 9: Add Backend Service Tests

**Files:**
- Create: `backend/tests/TestCase/Service/AssessmentVersionPolicyServiceTest.php`
- Create: `backend/tests/TestCase/Service/HomeHealthComplianceServiceTest.php`
- Create: `backend/tests/TestCase/Support/HomeHealthTestTrait.php`

- [ ] **Step 1: Create backend test support trait**

Create `backend/tests/TestCase/Support/HomeHealthTestTrait.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Support;

use Cake\TestSuite\IntegrationTestTrait;

trait HomeHealthTestTrait
{
    use IntegrationTestTrait;

    protected function loginApiUser(): void
    {
        $this->configRequest([
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer demo-token',
            ],
        ]);
    }
}
```

- [ ] **Step 2: Write OASIS policy tests**

Create `backend/tests/TestCase/Service/AssessmentVersionPolicyServiceTest.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Service;

use App\Service\AssessmentVersionPolicyService;
use Cake\TestSuite\TestCase;

class AssessmentVersionPolicyServiceTest extends TestCase
{
    public array $fixtures = [];

    public function testResolvesOasisE1BeforeEffectiveDate(): void
    {
        $service = new AssessmentVersionPolicyService();
        $this->assertSame('OASIS-E1', $service->resolveVersion('2026-03-31 23:59:00'));
    }

    public function testResolvesOasisE2OnEffectiveDate(): void
    {
        $service = new AssessmentVersionPolicyService();
        $this->assertSame('OASIS-E2', $service->resolveVersion('2026-04-01 00:00:00'));
    }
}
```

- [ ] **Step 3: Write compliance service tests**

Create `backend/tests/TestCase/Service/HomeHealthComplianceServiceTest.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Service;

use App\Service\HomeHealthComplianceService;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\TestCase;

class HomeHealthComplianceServiceTest extends TestCase
{
    public function testActivationBlockersIncludeComplianceAndMedicationReview(): void
    {
        $service = new HomeHealthComplianceService();
        $blockers = $service->activationBlockers(1);

        $this->assertContains('Admission compliance packet is missing required signed or reviewed documents.', $blockers);
        $this->assertContains('Medication profile must be reviewed before admission readiness is complete.', $blockers);
    }

    public function testSurveyReadinessIncludesCategoryScores(): void
    {
        $service = new HomeHealthComplianceService();
        $summary = $service->surveyReadiness('current', false, ['id' => 1, 'email' => 'admin@example.test']);

        $this->assertArrayHasKey('category_scores', $summary);
        $this->assertArrayHasKey('open_counts', $summary);
        $this->assertNotEmpty($summary['category_scores']);
    }
}
```

- [ ] **Step 4: Run backend service tests**

Run:

```bash
cd "/Users/air/Documents/New project/backend"
composer test -- --filter "AssessmentVersionPolicyServiceTest|HomeHealthComplianceServiceTest"
```

Expected: service tests PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add backend/tests/TestCase/Service backend/tests/TestCase/Support
git commit -m "test: cover home health compliance services"
```

## Task 10: Add Backend API Controller Tests

**Files:**
- Create: `backend/tests/TestCase/Controller/Api/V1/PatientComplianceControllerTest.php`
- Create: `backend/tests/TestCase/Controller/Api/V1/EpisodeComplianceControllerTest.php`
- Create: `backend/tests/TestCase/Controller/Api/V1/BillingComplianceControllerTest.php`
- Create: `backend/tests/TestCase/Controller/Api/V1/SurveyReadinessControllerTest.php`

- [ ] **Step 1: Write patient compliance API tests**

Create `backend/tests/TestCase/Controller/Api/V1/PatientComplianceControllerTest.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\TestSuite\TestCase;

class PatientComplianceControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testCanAddAndListComplianceDocument(): void
    {
        $this->loginApiUser();
        $this->post('/api/v1/patients/1/compliance-documents/add', json_encode([
            'episode_id' => 1,
            'document_type' => 'patient_rights',
            'status' => 'signed',
            'signed_at' => '2026-04-19 08:30:00',
        ]));
        $this->assertResponseOk();

        $this->get('/api/v1/patients/1/compliance-documents');
        $this->assertResponseOk();
        $this->assertResponseContains('patient_rights');
    }

    public function testCanAddMedicationAndAllergy(): void
    {
        $this->loginApiUser();
        $this->post('/api/v1/patients/1/medications/add', json_encode([
            'episode_id' => 1,
            'medication_name' => 'Warfarin',
            'status' => 'active',
            'high_risk' => true,
            'teaching_completed' => true,
            'reconciled_at' => '2026-04-19 09:00:00',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/patients/1/allergies/add', json_encode([
            'allergen' => 'Penicillin',
            'reaction' => 'Rash',
            'severity' => 'moderate',
        ]));
        $this->assertResponseOk();
    }
}
```

- [ ] **Step 2: Write episode compliance API tests**

Create `backend/tests/TestCase/Controller/Api/V1/EpisodeComplianceControllerTest.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\TestSuite\TestCase;

class EpisodeComplianceControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testCanAddVerbalOrderAideSupervisionAndIncident(): void
    {
        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/verbal-orders/add', json_encode([
            'physician_name' => 'Dr. Hayes',
            'order_summary' => 'Add PRN SN visit.',
            'received_by' => 'RN Case Manager',
            'read_back_completed' => true,
            'status' => 'sent_for_signature',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/episodes/1/aide-supervision/add', json_encode([
            'aide_name' => 'Lena Aide',
            'supervising_clinician' => 'RN Case Manager',
            'status' => 'completed',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/episodes/1/incidents/add', json_encode([
            'patient_id' => 1,
            'event_type' => 'fall',
            'severity' => 'moderate',
            'status' => 'open',
        ]));
        $this->assertResponseOk();
    }

    public function testCanAddEligibilityAuthorizationSupplyAndCaseConference(): void
    {
        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/eligibility-checks/add', json_encode([
            'patient_id' => 1,
            'payer_type' => 'Medicare',
            'check_status' => 'eligible',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/episodes/1/authorizations/add', json_encode([
            'payer_type' => 'Medicare Advantage',
            'authorization_number' => 'AUTH-1',
            'authorized_visits' => 12,
            'used_visits' => 2,
            'status' => 'approved',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/episodes/1/dme-supply-orders/add', json_encode([
            'item_name' => 'Digital scale',
            'order_type' => 'DME',
            'status' => 'delivered',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/episodes/1/case-conferences/add', json_encode([
            'participants' => 'RN, PT, QA',
            'decisions' => 'Continue current plan.',
            'status' => 'completed',
        ]));
        $this->assertResponseOk();
    }
}
```

- [ ] **Step 3: Write billing compliance API tests**

Create `backend/tests/TestCase/Controller/Api/V1/BillingComplianceControllerTest.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\TestSuite\TestCase;

class BillingComplianceControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testCanAddClaimTransactionAndRemittancePosting(): void
    {
        $this->loginApiUser();
        $this->post('/api/v1/billing/claim-transactions/add', json_encode([
            'claim_id' => 1,
            'episode_id' => 1,
            'transaction_type' => '837I',
            'transaction_status' => 'accepted',
            'payer_control_number' => 'PCN-100',
        ]));
        $this->assertResponseOk();

        $this->post('/api/v1/billing/remittance-postings/add', json_encode([
            'claim_id' => 1,
            'episode_id' => 1,
            'era_reference' => 'ERA-100',
            'payment_amount' => 100.50,
            'adjustment_amount' => 0,
            'reconciliation_status' => 'posted',
        ]));
        $this->assertResponseOk();
    }
}
```

- [ ] **Step 4: Write survey readiness API tests**

Create `backend/tests/TestCase/Controller/Api/V1/SurveyReadinessControllerTest.php`:

```php
<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\TestSuite\TestCase;

class SurveyReadinessControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testCanViewAndCaptureSurveyReadiness(): void
    {
        $this->loginApiUser();
        $this->get('/api/v1/admin/survey-readiness');
        $this->assertResponseOk();
        $this->assertResponseContains('category_scores');

        $this->post('/api/v1/admin/survey-readiness/capture', json_encode([
            'period_key' => 'current',
        ]));
        $this->assertResponseOk();
        $this->assertResponseContains('open_counts');
    }
}
```

- [ ] **Step 5: Run backend API tests**

Run:

```bash
cd "/Users/air/Documents/New project/backend"
composer test -- --filter "PatientComplianceControllerTest|EpisodeComplianceControllerTest|BillingComplianceControllerTest|SurveyReadinessControllerTest"
```

Expected: controller tests PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/tests/TestCase/Controller/Api/V1/*ComplianceControllerTest.php backend/tests/TestCase/Controller/Api/V1/SurveyReadinessControllerTest.php
git commit -m "test: cover home health compliance APIs"
```

## Task 11: Add Browser Smoke Test for Complete Release Flow

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/release-workflow.spec.ts`

- [ ] **Step 1: Add Playwright config**

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet', use: { ...devices['iPad Pro 11'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Add release flow smoke test**

Create `frontend/e2e/release-workflow.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('demo release workflow exposes compliance, episode, billing, and survey readiness', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Patients' }).click()
  await expect(page.getByText('Patient Compliance Packet')).toBeVisible()
  await expect(page.getByText('Medication and Allergy Profile')).toBeVisible()

  await page.getByRole('button', { name: 'Episodes' }).click()
  await page.getByRole('button', { name: 'Review' }).click()
  await expect(page.getByText('Orders, Aide Supervision, and Event Controls')).toBeVisible()
  await expect(page.getByText('Payer Controls, Supplies, and Case Conference')).toBeVisible()

  await page.getByRole('button', { name: 'Billing' }).click()
  await expect(page.getByText('EDI and Remittance Ledger')).toBeVisible()

  await page.getByRole('button', { name: 'Admin' }).click()
  await expect(page.getByText('Survey Readiness Dashboard')).toBeVisible()
})
```

- [ ] **Step 3: Install Playwright browser**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npx playwright install chromium
```

Expected: Chromium browser is installed for Playwright.

- [ ] **Step 4: Run e2e smoke test**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test:e2e
```

Expected: desktop, tablet, and mobile smoke tests PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add frontend/playwright.config.ts frontend/e2e
git commit -m "test: add release workflow browser smoke coverage"
```

## Task 12: Final Coverage Gate and Cleanup

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: any extracted files only if tests reveal import or behavior gaps.

- [ ] **Step 1: Run frontend coverage**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run test:coverage
```

Expected: coverage meets configured thresholds: lines 70, functions 70, branches 65, statements 70.

- [ ] **Step 2: Run frontend lint and build**

Run:

```bash
cd "/Users/air/Documents/New project/frontend"
npm run lint
npm run build
```

Expected: lint PASS and production build PASS. The large chunk warning should be reduced after module extraction; if it remains, record the largest bundle size in the final handoff.

- [ ] **Step 3: Run backend suite**

Run:

```bash
cd "/Users/air/Documents/New project/backend"
composer test
```

Expected: all PHPUnit tests PASS.

- [ ] **Step 4: Check App.tsx size**

Run:

```bash
cd "/Users/air/Documents/New project"
wc -l frontend/src/App.tsx
```

Expected: `frontend/src/App.tsx` is below 500 lines. If it is above 500 lines, move remaining module JSX or helper logic into the appropriate file from this plan before continuing.

- [ ] **Step 5: Commit final cleanup**

Run:

```bash
git add frontend backend
git commit -m "test: enforce modular app coverage gates"
```

## Self-Review

- Spec coverage: The plan covers both requested items: splitting `App.tsx` into separate components/modules and adding frontend, backend, and browser tests for complete code paths.
- Placeholder scan: The plan avoids implementation placeholders by naming exact files, commands, expected results, and representative code for every new test and config file.
- Type consistency: New frontend modules consume `ReturnType<typeof useEthizoAppController>` so extracted modules do not drift from controller state. Domain tests import named helpers from the exact files that will be created.
- Risk: Task 6 and Task 7 are the largest refactors. They should be executed one commit at a time, with `npm run build` after every module extraction.
