import { formatTaskAssignee, labelizeValue } from './formatters'
import { normalizeAdmissionSnapshot, normalizeDateTimeString, normalizeDocumentationPayload } from './normalizers'
import type {
  AppDataset,
  Assessment,
  Claim,
  ClinicalDecisionAlert,
  Episode,
  EpisodeAdmissionSnapshot,
  EpisodeInsightSummary,
  EpisodeReadiness,
  EpisodeReviewSummary,
  EvvRecord,
  PhysicianOrder,
  QaTask,
  Referral,
  User,
  Visit,
} from '../lib/types'

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

export function buildAdmissionSnapshotFromReferral(referral: Referral): EpisodeAdmissionSnapshot {
  return {
    referral_source: referral.source_name,
    admission_source: referral.admission_source,
    planned_soc_date: referral.planned_soc_date,
    face_to_face_date: referral.face_to_face_date,
    primary_diagnosis: referral.primary_diagnosis,
    requested_disciplines: normalizeDisciplines(referral.requested_disciplines),
    order_status: referral.order_status,
    physician_orders_signed: referral.physician_orders_signed,
    physician_orders_signed_at: referral.physician_orders_signed_at,
    referring_provider_name: referral.referring_provider_name,
    referring_provider_phone: referral.referring_provider_phone,
    pcp_name: referral.pcp_name,
    pcp_phone: referral.pcp_phone,
    caregiver_name: referral.caregiver_name,
    caregiver_relationship: referral.caregiver_relationship,
    caregiver_phone: referral.caregiver_phone,
    service_location_type: referral.service_location_type,
    service_address1: referral.service_address1,
    service_city: referral.service_city,
    service_state: referral.service_state,
    service_postal_code: referral.service_postal_code,
    notes: referral.notes,
  }
}

function deriveAdmissionSnapshot(episode: Episode | undefined, referrals: Referral[]) {
  if (!episode?.referral_id) {
    return null
  }

  const referral = referrals.find((item) => item.id === episode.referral_id)
  return referral ? buildAdmissionSnapshotFromReferral(referral) : null
}

function summarizeIntakeReadiness(snapshot: EpisodeAdmissionSnapshot | null) {
  const faceToFaceComplete = Boolean(snapshot?.face_to_face_date)
  const signedOrdersComplete = Boolean(snapshot?.physician_orders_signed && snapshot?.physician_orders_signed_at)
  const orderStatus = normalizeOrderStatus(snapshot?.order_status)
  const blockers: string[] = []

  if (!faceToFaceComplete) {
    blockers.push('Face-to-face documentation is still missing.')
  }
  if (!signedOrdersComplete) {
    blockers.push('Signed physician orders are still missing.')
  }
  if (!snapshot?.order_status) {
    blockers.push('Order status has not been captured on the intake snapshot.')
  }

  return {
    faceToFaceComplete,
    signedOrdersComplete,
    orderStatus,
    blockers,
    badges: [
      { label: faceToFaceComplete ? 'F2F on file' : 'F2F missing', tone: faceToFaceComplete ? 'neutral' : 'warn' },
      { label: signedOrdersComplete ? 'Orders signed' : 'Orders pending', tone: signedOrdersComplete ? 'neutral' : 'warn' },
      { label: `Order status: ${orderStatus}`, tone: signedOrdersComplete ? 'neutral' : 'warn' },
    ] as StatusBadge[],
  }
}

export function buildDocumentationQaTasksForReferral(
  episodeId: number,
  referral: Referral,
  startingId: number,
  certStart: string,
): QaTask[] {
  const tasks: QaTask[] = []

  if (!referral.face_to_face_date) {
    tasks.push({
      id: startingId + tasks.length,
      episode_id: episodeId,
      task_type: 'missing_face_to_face',
      priority: 'high',
      status: 'open',
      title: 'Capture missing face-to-face documentation',
      details: 'Intake must obtain and document the required face-to-face encounter before episode activation and billing release.',
      assigned_role: 'Intake',
      due_at: `${certStart} 09:00:00`,
    })
  }

  if (!referral.physician_orders_signed || !referral.physician_orders_signed_at) {
    tasks.push({
      id: startingId + tasks.length,
      episode_id: episodeId,
      task_type: 'missing_signed_orders',
      priority: 'high',
      status: 'open',
      title: 'Obtain signed physician orders',
      details: 'Clinical intake must secure signed physician orders before episode activation and billing release.',
      assigned_role: 'Clinical',
      due_at: `${certStart} 09:00:00`,
    })
  }

  return tasks
}

export function buildDemoPhysicianOrder(
  dataset: AppDataset,
  episode: Episode,
  payload: {
    order_scope: string
    order_status: string
    signer_name: string
    sent_at: string
    received_at: string
    signed_at: string
    order_summary: string
    order_note: string
  },
  editingOrderId: number | null,
): PhysicianOrder {
  const generatedDraft =
    payload.order_summary.trim() === '' || payload.order_note.trim() === ''
      ? buildDemoPhysicianOrderDraft(dataset, episode, payload.order_scope)
      : null

  if (editingOrderId !== null) {
    const existing = dataset.physicianOrders.find((order) => order.id === editingOrderId)
    if (existing) {
      return {
        ...existing,
        order_scope: payload.order_scope,
        order_status: payload.order_status,
        signer_name: payload.signer_name || undefined,
        sent_at: payload.sent_at || undefined,
        received_at: payload.received_at || undefined,
        signed_at: payload.signed_at || undefined,
        order_summary: payload.order_summary || generatedDraft?.order_summary || undefined,
        order_note: payload.order_note || generatedDraft?.order_note || undefined,
      }
    }
  }

  const versionNumber =
    dataset.physicianOrders
      .filter((order) => order.episode_id === episode.id && order.order_scope === payload.order_scope)
      .map((order) => order.version_number)
      .sort((left, right) => right - left)[0] ?? 0

  return {
    id: dataset.physicianOrders.length + 1,
    referral_id: episode.referral_id,
    episode_id: episode.id,
    order_scope: payload.order_scope,
    version_number: versionNumber + 1,
    order_status: payload.order_status,
    active: true,
    sent_at: payload.sent_at || undefined,
    received_at: payload.received_at || undefined,
    signed_at: payload.signed_at || undefined,
    signer_name: payload.signer_name || undefined,
    order_summary: payload.order_summary || generatedDraft?.order_summary || undefined,
    order_note: payload.order_note || generatedDraft?.order_note || undefined,
  }
}

export function buildDemoPhysicianOrderDraft(dataset: AppDataset, episode: Episode, scope: string) {
  const assessment = dataset.assessments
    .filter((item) => item.episode_id === episode.id && ['final', 'locked'].includes(item.status))
    .sort((left, right) => right.completed_at.localeCompare(left.completed_at))[0]
  const snapshot =
    normalizeAdmissionSnapshot(episode.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
  const recentVisits = dataset.visits
    .filter((visit) => visit.episode_id === episode.id && ['completed', 'qa_review', 'locked'].includes(visit.documentation_status ?? ''))
    .sort((left, right) => (right.actual_end ?? right.scheduled_end).localeCompare(left.actual_end ?? left.scheduled_end))
    .slice(0, 3)

  const summaryParts = [`${labelizeValue(scope)} physician order packet for ${episode.primary_diagnosis}.`]
  if (assessment) {
    summaryParts.push(
      `Finalized ${assessment.oasis_version} on ${assessment.completed_at} with functional score ${assessment.functional_score} and ${assessment.comorbidity_level} comorbidity.`,
    )
    if (assessment.homebound_status) {
      summaryParts.push(`Homebound status: ${assessment.homebound_status}.`)
    }
    if (assessment.care_plan_goals) {
      summaryParts.push(`Goals: ${assessment.care_plan_goals}.`)
    }
  }
  if ((snapshot?.requested_disciplines ?? []).length > 0) {
    summaryParts.push(`Disciplines: ${(snapshot?.requested_disciplines ?? []).join(', ')}.`)
  }
  if (snapshot?.admission_source) {
    summaryParts.push(`Admission source: ${snapshot.admission_source}.`)
  }

  const recentVisitHighlights = recentVisits.map((visit) => {
    const payload = normalizeDocumentationPayload(visit.documentation_payload)
    const base = `${visit.discipline.toUpperCase()} ${visit.visit_type} on ${visit.actual_end ?? visit.scheduled_end}`
    const focus = payload?.visit_focus ? `: ${payload.visit_focus}` : ''
    const next = payload?.next_visit_focus ? ` Next: ${payload.next_visit_focus}` : ''
    return `${base}${focus}${next}.`
  })

  const noteParts = [`Generated from the current clinical chart for ${labelizeValue(scope).toLowerCase()} review.`]
  if (assessment?.clinical_summary) {
    noteParts.push(`Assessment summary: ${assessment.clinical_summary}.`)
  }
  if (assessment?.medication_reconciliation_completed) {
    noteParts.push('Medication reconciliation is documented on the finalized assessment.')
  }
  if (recentVisitHighlights.length > 0) {
    noteParts.push(`Recent documented visits: ${recentVisitHighlights.join(' ')}`)
  }

  return {
    order_summary: summaryParts.join(' ').trim(),
    order_note: noteParts.join(' ').trim(),
    recent_visit_highlights: recentVisitHighlights,
  }
}

export function normalizeDemoReferralOrderStatus(orderStatus?: string, isSigned?: boolean) {
  if (isSigned) {
    return 'signed'
  }

  switch ((orderStatus ?? '').trim().toLowerCase()) {
    case 'signed':
      return 'signed'
    case 'received':
    case 'reviewed':
      return 'received'
    case 'pending_signature':
    case 'sent_for_signature':
      return 'sent_for_signature'
    default:
      return 'draft'
  }
}

export function normalizeOrderStatus(status?: string) {
  if (!status || status.trim() === '') {
    return 'Not captured'
  }

  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function buildEpisodeIntakeQueue(episodes: Episode[], referrals: Referral[], qaTasks: QaTask[]): EpisodeIntakeQueueItem[] {
  return qaTasks
    .filter((task) => task.status === 'open' && ['missing_face_to_face', 'missing_signed_orders'].includes(task.task_type))
    .map((task) => {
      const episode = episodes.find((item) => item.id === task.episode_id)
      if (!episode) {
        return null
      }
      const snapshot = normalizeAdmissionSnapshot(episode.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, referrals)
      const intake = summarizeIntakeReadiness(snapshot)

      return {
        episode,
        snapshot,
        badges: intake.badges,
        task,
        blocker: task.task_type === 'missing_face_to_face' ? 'face_to_face' : 'signed_orders',
      }
    })
    .filter((item): item is EpisodeIntakeQueueItem => item !== null)
    .sort((left, right) => left.episode.patient_name.localeCompare(right.episode.patient_name))
}

export function buildClaimReadinessQueue(dataset: AppDataset): ClaimReadinessItem[] {
  return dataset.claims
    .map((claim) => {
      const episode = dataset.episodes.find((item) => item.id === claim.episode_id)
      const snapshot =
        normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
      const intake = summarizeIntakeReadiness(snapshot)
      const billingReadiness = evaluateDemoBillingReadiness(claim, dataset)
      const billingBadge: StatusBadge = {
        label: billingReadiness.ready_to_bill ? 'Billing ready' : 'Billing blocked',
        tone: billingReadiness.ready_to_bill ? 'neutral' : 'warn',
      }
      const relatedTasks = dataset.qaTasks.filter((task) => task.episode_id === claim.episode_id && task.status === 'open')
      const taskOwners = Array.from(new Set(relatedTasks.map((task) => task.assigned_role).filter(Boolean))) as string[]
      const relatedAssignees = Array.from(
        new Set(
          relatedTasks
            .map((task) => formatTaskAssignee(task))
            .filter((entry) => entry !== 'Unassigned'),
        ),
      )
      const escalationReasons = Array.from(
        new Set(
          relatedTasks
            .map((task) => task.escalation_reason)
            .filter((entry): entry is string => Boolean(entry)),
        ),
      )
      const relatedOwners = Array.from(new Set([...taskOwners, ...ownersForBillingBlockers(billingReadiness.blockers)]))
      const sortedDueDates = relatedTasks.map((task) => task.due_at).filter(Boolean).sort()

      return {
        claim,
        episode,
        patientName: episode?.patient_name ?? `Episode ${claim.episode_id}`,
        badges: [
          ...intake.badges,
          billingBadge,
        ],
        blockers: billingReadiness.blockers,
        readyToBill: billingReadiness.ready_to_bill,
        relatedOwners,
        relatedAssignees,
        escalationReasons,
        highestPriority: highestPriorityForTasks(relatedTasks),
        earliestDueAt: sortedDueDates[0],
      }
    })
    .sort((left, right) => Number(left.readyToBill) - Number(right.readyToBill))
}

function highestPriorityForTasks(tasks: QaTask[]) {
  const priorityRank: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }

  return tasks
    .map((task) => task.priority.toLowerCase())
    .sort((left, right) => (priorityRank[right] ?? 0) - (priorityRank[left] ?? 0))[0]
}

function ownersForBillingBlockers(blockers: string[]) {
  const owners = new Set<string>()

  blockers.forEach((blocker) => {
    const normalized = blocker.toLowerCase()
    if (normalized.includes('face-to-face')) {
      owners.add('Intake')
    }
    if (normalized.includes('signed physician orders')) {
      owners.add('Clinical')
    }
    if (normalized.includes('active physician order')) {
      owners.add('Clinical')
    }
    if (normalized.includes('order packet')) {
      owners.add('Clinical')
    }
    if (
      normalized.includes('oasis') ||
      normalized.includes('diagnosis') ||
      normalized.includes('homebound') ||
      normalized.includes('medication reconciliation') ||
      normalized.includes('care plan goals') ||
      normalized.includes('clinical summary') ||
      normalized.includes('pdgm')
    ) {
      owners.add('QA')
      owners.add('Clinical')
      owners.add('Billing')
    }
    if (normalized.includes('documentation')) {
      owners.add('Clinician')
      owners.add('QA')
    }
    if (normalized.includes('episode must be active')) {
      owners.add('Clinical')
    }
  })

  return Array.from(owners)
}

export function evaluateDemoBillingReadiness(claim: Claim, dataset: AppDataset) {
  const episode = dataset.episodes.find((item) => item.id === claim.episode_id)
  const assessment = dataset.assessments
    .filter((item) => item.episode_id === claim.episode_id && ['final', 'locked'].includes(item.status))
    .sort((left, right) => right.completed_at.localeCompare(left.completed_at))[0]
  const snapshot =
    normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
  const blockers: string[] = []

  if (!episode || episode.episode_status !== 'active') {
    blockers.push('Episode must be active before final billing submission.')
  }
  if (!assessment) {
    blockers.push('Billing requires a finalized OASIS assessment.')
  }
  blockers.push(...assessmentBillingBlockers(assessment))

  const expectedDiagnosis = extractDiagnosisCode(episode?.primary_diagnosis ?? '')
  const assessmentDiagnosis = assessment?.principal_diagnosis_code?.trim().toUpperCase() ?? ''
  if (assessmentDiagnosis === '' || !isValidDiagnosisCode(assessmentDiagnosis)) {
    blockers.push('Billing requires a valid ICD-10 principal diagnosis code on the finalized assessment.')
  }
  if (expectedDiagnosis && assessmentDiagnosis && expectedDiagnosis !== assessmentDiagnosis) {
    blockers.push(`Assessment diagnosis ${assessmentDiagnosis} does not match the episode primary diagnosis ${expectedDiagnosis}.`)
  }
  if (!snapshot?.admission_source) {
    blockers.push('Billing requires an admission source on the episode intake snapshot.')
  }
  if (!snapshot?.face_to_face_date) {
    blockers.push('Billing requires face-to-face documentation on the episode intake snapshot.')
  }
  if (!snapshot?.physician_orders_signed || !snapshot?.physician_orders_signed_at) {
    blockers.push('Billing requires signed physician orders on the episode intake snapshot.')
  }
  const unsignedActiveOrders = dataset.physicianOrders.filter(
    (order) =>
      order.episode_id === claim.episode_id &&
      order.active &&
      ['admission', 'plan_of_care', 'recertification', 'resume_of_care'].includes(order.order_scope) &&
      (order.order_status !== 'signed' || !order.signed_at),
  ).length
  if (unsignedActiveOrders > 0) {
    blockers.push('Billing requires all active physician order packets to be signed.')
  }
  const unsignedVerbalOrders = dataset.verbalOrders.filter(
    (order) =>
      order.episode_id === claim.episode_id &&
      order.status !== 'signed' &&
      order.status !== 'completed' &&
      !order.physician_signed_at,
  ).length
  if (unsignedVerbalOrders > 0) {
    blockers.push('Billing requires all verbal orders to be physician-signed before submission.')
  }
  if (!episode?.pdgm_group_code) {
    blockers.push('Billing requires PDGM grouping before claim submission.')
  }
  const completedVisitsPendingLock = dataset.visits.filter(
    (visit) =>
      visit.episode_id === claim.episode_id &&
      ['completed', 'locked'].includes(visit.status) &&
      visit.documentation_status !== 'locked',
  ).length
  if (completedVisitsPendingLock > 0) {
    blockers.push('Billing requires all completed visit documentation to be QA-locked before submission.')
  }

  return {
    ready_to_bill: blockers.length === 0,
    primary_blocker: blockers[0] ?? 'Billing is ready.',
    blockers,
  }
}

export function buildClaimStatusLanes(items: ClaimReadinessItem[]): ClaimStatusLane[] {
  return [
    {
      key: 'submitted',
      title: 'Submitted',
      subtitle: 'Claims awaiting payer response or internal acceptance posting.',
      claims: items.filter((item) => item.claim.status === 'submitted'),
    },
    {
      key: 'accepted',
      title: 'Accepted',
      subtitle: 'Claims accepted by the payer and waiting for payment posting.',
      claims: items.filter((item) => item.claim.status === 'accepted'),
    },
    {
      key: 'rework',
      title: 'Denied or Rework',
      subtitle: 'Rejected or voided claims that need corrected resubmission.',
      claims: items.filter((item) => ['rejected', 'voided'].includes(item.claim.status)),
    },
    {
      key: 'paid',
      title: 'Paid',
      subtitle: 'Claims with payment posted and remittance captured.',
      claims: items.filter((item) => item.claim.status === 'paid'),
    },
  ]
}

export function buildDenialQueueSections(items: ClaimReadinessItem[]): DenialQueueSection[] {
  const correctedChildren = new Map<number, ClaimReadinessItem[]>()

  items.forEach((item) => {
    if (!item.claim.corrected_from_claim_id) {
      return
    }

    const siblings = correctedChildren.get(item.claim.corrected_from_claim_id) ?? []
    siblings.push(item)
    correctedChildren.set(item.claim.corrected_from_claim_id, siblings)
  })

  const denialItems = items
    .filter((item) => ['rejected', 'voided'].includes(item.claim.status))
    .reduce<DenialQueueItem[]>((queueItems, item) => {
      const children = (correctedChildren.get(item.claim.id) ?? []).sort((left, right) => right.claim.id - left.claim.id)
      const latestChild = children[0]
      if (latestChild && ['submitted', 'accepted', 'paid'].includes(latestChild.claim.status)) {
        return queueItems
      }
      if (latestChild && ['rejected', 'voided'].includes(latestChild.claim.status)) {
        return queueItems
      }

      const reason =
        item.claim.rejection_reason ??
        item.claim.void_reason ??
        item.claim.correction_reason ??
        item.claim.hold_reason ??
        item.blockers[0] ??
        'Billing correction is required before resubmission.'
      const category = categorizeDenialReason(reason)
      const queueState =
        latestChild && latestChild.claim.status === 'draft' && latestChild.readyToBill ? 'ready_to_resubmit' : 'needs_correction'
      const activeClaim = latestChild && latestChild.claim.status === 'draft' ? latestChild : undefined
      const owners = activeClaim?.relatedOwners.length ? activeClaim.relatedOwners : item.relatedOwners
      const assignees = activeClaim?.relatedAssignees.length ? activeClaim.relatedAssignees : item.relatedAssignees
      const earliestDueAt = activeClaim?.earliestDueAt ?? item.earliestDueAt
      const escalationReason = activeClaim?.escalationReasons[0] ?? item.escalationReasons[0]

      queueItems.push({
        baseClaim: item,
        workingClaim: activeClaim,
        categoryKey: category.key,
        categoryLabel: category.label,
        queueState,
        priority: deriveDenialPriority(queueState, category.key),
        summary: latestChild
          ? `Corrected claim #${latestChild.claim.id} is in ${labelizeValue(latestChild.claim.status)} status for this denial.`
          : `No corrected claim exists yet for this ${labelizeValue(item.claim.status)} claim.`,
        note:
          latestChild && latestChild.claim.status === 'draft'
            ? latestChild.readyToBill
              ? latestChild.claim.correction_reason ?? reason
              : latestChild.blockers[0] ?? latestChild.claim.hold_reason ?? reason
            : reason,
        owners,
        assignees,
        earliestDueAt,
        escalationReason,
      })

      return queueItems
    }, [])

  return [
    {
      key: 'needs_correction',
      title: 'Needs Correction',
      subtitle: 'Denied claims that still need coding, documentation, intake, order, EVV, or payer cleanup before a corrected resubmission can be staged.',
      items: denialItems
        .filter((item) => item.queueState === 'needs_correction')
        .sort(compareDenialQueueItems),
    },
    {
      key: 'ready_to_resubmit',
      title: 'Ready to Resubmit',
      subtitle: 'Corrected draft claims that have cleared readiness checks and can be resubmitted to the payer now.',
      items: denialItems
        .filter((item) => item.queueState === 'ready_to_resubmit')
        .sort(compareDenialQueueItems),
    },
  ]
}

export function buildEvvQueueSections(dataset: AppDataset): EvvQueueSection[] {
  const items = dataset.evvRecords
    .map((record) => {
      const visit = dataset.visits.find((item) => item.id === record.visit_id)
      const episode = visit ? dataset.episodes.find((item) => item.id === visit.episode_id) : undefined
      const category = categorizeEvvRecord(record)
      const queueState =
        record.status === 'reconciled'
          ? 'reconciled'
          : record.status === 'submitted'
            ? 'ready_to_reconcile'
            : 'needs_fix'

      return {
        record,
        visit,
        episode,
        patientName: visit?.patient_name ?? episode?.patient_name ?? `Visit ${record.visit_id}`,
        queueState,
        categoryLabel: category.label,
        priority: deriveEvvPriority(record.status),
        summary: summarizeEvvQueueRecord(record, visit),
        note: buildEvvQueueNote(record),
        dueAt: visit?.actual_end ?? visit?.scheduled_end ?? record.submitted_at ?? record.reconciled_at,
      } satisfies EvvQueueItem
    })
    .sort(compareEvvQueueItems)

  return [
    {
      key: 'needs_fix',
      title: 'Needs Fix',
      subtitle: 'Records still waiting on submission or actively carrying an EVV exception.',
      items: items.filter((item) => item.queueState === 'needs_fix'),
    },
    {
      key: 'ready_to_reconcile',
      title: 'Ready to Reconcile',
      subtitle: 'Submitted EVV records waiting on Billing reconciliation after vendor review.',
      items: items.filter((item) => item.queueState === 'ready_to_reconcile'),
    },
    {
      key: 'reconciled',
      title: 'Reconciled',
      subtitle: 'Completed EVV records that have already been reconciled and cleared.',
      items: items.filter((item) => item.queueState === 'reconciled'),
    },
  ]
}

export function buildBillingFollowUpSections(
  dataset: AppDataset,
  claimReadinessQueue: ClaimReadinessItem[],
  denialQueueSections: DenialQueueSection[],
  evvQueueSections: EvvQueueSection[],
): BillingFollowUpSection[] {
  const claimItemsByEpisode = new Map<number, ClaimReadinessItem[]>()
  claimReadinessQueue
    .filter((item) => !item.readyToBill || Boolean(item.claim.hold_reason))
    .forEach((item) => {
      const existing = claimItemsByEpisode.get(item.claim.episode_id) ?? []
      existing.push(item)
      claimItemsByEpisode.set(item.claim.episode_id, existing)
    })

  const denialItems = denialQueueSections.flatMap((section) => section.items)
  const denialItemsByEpisode = new Map<number, DenialQueueItem[]>()
  denialItems.forEach((item) => {
    const episodeId = item.workingClaim?.claim.episode_id ?? item.baseClaim.claim.episode_id
    const existing = denialItemsByEpisode.get(episodeId) ?? []
    existing.push(item)
    denialItemsByEpisode.set(episodeId, existing)
  })

  const evvItems = evvQueueSections
    .filter((section) => section.key !== 'reconciled')
    .flatMap((section) => section.items)
  const evvItemsByEpisode = new Map<number, EvvQueueItem[]>()
  evvItems.forEach((item) => {
    if (!item.episode) {
      return
    }
    const existing = evvItemsByEpisode.get(item.episode.id) ?? []
    existing.push(item)
    evvItemsByEpisode.set(item.episode.id, existing)
  })

  const episodeIds = Array.from(
    new Set([
      ...claimItemsByEpisode.keys(),
      ...denialItemsByEpisode.keys(),
      ...evvItemsByEpisode.keys(),
    ]),
  )

  const items = episodeIds
    .reduce<BillingFollowUpItem[]>((queueItems, episodeId) => {
      const episode = dataset.episodes.find((entry) => entry.id === episodeId)
      if (!episode) {
        return queueItems
      }

      const claimItems = claimItemsByEpisode.get(episodeId) ?? []
      const denialForEpisode = denialItemsByEpisode.get(episodeId) ?? []
      const evvForEpisode = evvItemsByEpisode.get(episodeId) ?? []
      const primaryClaimItem = denialForEpisode[0]?.workingClaim ?? denialForEpisode[0]?.baseClaim ?? claimItems[0]
      const primaryDenialItem = denialForEpisode[0]
      const primaryEvvItem = evvForEpisode.sort(compareEvvQueueItems)[0]

      const claimIssues = [
        ...denialForEpisode.map((item) => `${item.categoryLabel}: ${item.note}`),
        ...claimItems
          .filter((item) => !denialForEpisode.some((denialItem) => denialItem.baseClaim.claim.id === item.claim.id || denialItem.workingClaim?.claim.id === item.claim.id))
          .map((item) => item.claim.hold_reason ?? item.blockers[0] ?? `${labelizeValue(item.claim.claim_type)} claim follow-up required.`),
      ]
      const evvIssues = evvForEpisode.map((item) => `${item.categoryLabel}: ${item.note}`)

      const state =
        claimIssues.length > 0 && evvIssues.length > 0
          ? 'claim_and_evv'
          : claimIssues.length > 0
            ? 'claim_only'
            : 'evv_only'

      const nextAction = primaryDenialItem
        ? primaryDenialItem.workingClaim
          ? primaryDenialItem.queueState === 'ready_to_resubmit'
            ? {
                kind: 'submit_corrected_claim' as const,
                label: 'Submit corrected claim',
                claimId: primaryDenialItem.workingClaim.claim.id,
              }
            : {
                kind: 'resolve_episode' as const,
                label: 'Resolve claim blockers',
              }
          : {
              kind: 'create_corrected_claim' as const,
              label: 'Create corrected claim',
              claimId: primaryDenialItem.baseClaim.claim.id,
            }
        : primaryClaimItem
          ? {
              kind: 'resolve_episode' as const,
              label: 'Resolve claim blockers',
            }
          : primaryEvvItem?.record.status === 'pending_submission'
            ? {
                kind: 'submit_evv' as const,
                label: 'Submit EVV',
                recordId: primaryEvvItem.record.id,
              }
            : primaryEvvItem?.record.status === 'submitted'
              ? {
                  kind: 'reconcile_evv' as const,
                  label: 'Reconcile EVV',
                  recordId: primaryEvvItem.record.id,
                }
              : {
                  kind: 'update_evv_exception' as const,
                  label: 'Update EVV exception',
                  recordId: primaryEvvItem?.record.id ?? 0,
                }

      const priority = deriveBillingFollowUpPriority(primaryDenialItem, primaryClaimItem, primaryEvvItem)

      queueItems.push({
        episode,
        patientName: episode.patient_name,
        state,
        priority,
        claimIssues,
        evvIssues,
        claimItem: primaryClaimItem,
        denialItem: primaryDenialItem,
        evvItem: primaryEvvItem,
        nextAction,
      })

      return queueItems
    }, [])
    .sort(compareBillingFollowUpItems)

  return [
    {
      key: 'claim_and_evv',
      title: 'Claim and EVV Follow-Up',
      subtitle: 'Episodes where Billing still has claim-side work and EVV-side work open at the same time.',
      items: items.filter((item) => item.state === 'claim_and_evv'),
    },
    {
      key: 'claim_only',
      title: 'Claim Follow-Up Only',
      subtitle: 'Episodes where claim correction or billing readiness is still open, but EVV is already clear.',
      items: items.filter((item) => item.state === 'claim_only'),
    },
    {
      key: 'evv_only',
      title: 'EVV Follow-Up Only',
      subtitle: 'Episodes where claims are otherwise clear, but EVV still needs submission, exception cleanup, or reconciliation.',
      items: items.filter((item) => item.state === 'evv_only'),
    },
  ]
}

function deriveBillingFollowUpPriority(
  denialItem?: DenialQueueItem,
  claimItem?: ClaimReadinessItem,
  evvItem?: EvvQueueItem,
): BillingFollowUpItem['priority'] {
  if (denialItem?.priority === 'high' || evvItem?.priority === 'high') {
    return 'high'
  }
  if (claimItem?.highestPriority === 'high') {
    return 'high'
  }
  if (denialItem?.priority === 'medium' || evvItem?.priority === 'medium') {
    return 'medium'
  }
  if (claimItem?.highestPriority === 'medium') {
    return 'medium'
  }
  return 'low'
}

function compareBillingFollowUpItems(left: BillingFollowUpItem, right: BillingFollowUpItem) {
  const stateRank: Record<BillingFollowUpItem['state'], number> = {
    claim_and_evv: 3,
    claim_only: 2,
    evv_only: 1,
  }
  const priorityRank: Record<BillingFollowUpItem['priority'], number> = {
    high: 3,
    medium: 2,
    low: 1,
  }

  return (
    (stateRank[right.state] ?? 0) - (stateRank[left.state] ?? 0) ||
    (priorityRank[right.priority] ?? 0) - (priorityRank[left.priority] ?? 0) ||
    left.patientName.localeCompare(right.patientName)
  )
}

function categorizeEvvRecord(record: EvvRecord) {
  if (record.status === 'pending_submission') {
    return { key: 'submission', label: 'Submission pending' }
  }

  const normalized = record.exception_reason?.toLowerCase() ?? ''

  if (normalized.includes('gps') || normalized.includes('location') || normalized.includes('geo')) {
    return { key: 'location', label: 'Location mismatch' }
  }
  if (normalized.includes('time') || normalized.includes('duration') || normalized.includes('clock') || normalized.includes('late')) {
    return { key: 'timing', label: 'Timing issue' }
  }
  if (
    normalized.includes('caregiver') ||
    normalized.includes('patient') ||
    normalized.includes('signature') ||
    normalized.includes('acknowledgement')
  ) {
    return { key: 'attestation', label: 'Attestation issue' }
  }
  if (
    normalized.includes('vendor') ||
    normalized.includes('interface') ||
    normalized.includes('payload') ||
    normalized.includes('reference')
  ) {
    return { key: 'vendor', label: 'Vendor response' }
  }
  if (record.status === 'submitted') {
    return { key: 'reconcile', label: 'Awaiting reconciliation' }
  }
  if (record.status === 'reconciled') {
    return { key: 'complete', label: 'Reconciled' }
  }

  return { key: 'general', label: 'General exception' }
}

function deriveEvvPriority(status: string): EvvQueueItem['priority'] {
  if (status === 'exception') {
    return 'high'
  }
  if (status === 'pending_submission' || status === 'submitted') {
    return 'medium'
  }

  return 'low'
}

function summarizeEvvQueueRecord(record: EvvRecord, visit?: Visit) {
  if (record.status === 'pending_submission') {
    return visit
      ? 'Completed visit still needs EVV submission before billing can move forward.'
      : 'EVV submission is still pending for this visit.'
  }
  if (record.status === 'submitted') {
    return 'EVV was submitted and is waiting for Billing reconciliation after vendor review.'
  }
  if (record.status === 'reconciled') {
    return 'EVV has been reconciled and is no longer blocking billing.'
  }

  return 'EVV exception needs follow-up before the visit can clear for billing.'
}

function buildEvvQueueNote(record: EvvRecord) {
  if (record.status === 'pending_submission') {
    return record.submission_reference
      ? `Submission reference ${record.submission_reference} is present, but the record still needs a submitted status update.`
      : 'No vendor submission reference has been recorded yet.'
  }
  if (record.status === 'submitted') {
    return record.submission_reference
      ? `Vendor ref: ${record.submission_reference}`
      : 'Submitted status is recorded, but the vendor reference is still blank.'
  }
  if (record.status === 'reconciled') {
    return `Reconciled at ${record.reconciled_at ?? 'an unknown time'}.`
  }

  return record.exception_reason ?? 'No exception reason has been recorded yet.'
}

function compareEvvQueueItems(left: EvvQueueItem, right: EvvQueueItem) {
  const stateRank: Record<EvvQueueItem['queueState'], number> = {
    needs_fix: 3,
    ready_to_reconcile: 2,
    reconciled: 1,
  }
  const priorityRank: Record<EvvQueueItem['priority'], number> = {
    high: 3,
    medium: 2,
    low: 1,
  }

  return (
    (stateRank[right.queueState] ?? 0) - (stateRank[left.queueState] ?? 0) ||
    (priorityRank[right.priority] ?? 0) - (priorityRank[left.priority] ?? 0) ||
    compareNullableDates(left.dueAt, right.dueAt) ||
    left.patientName.localeCompare(right.patientName)
  )
}

function compareDenialQueueItems(left: DenialQueueItem, right: DenialQueueItem) {
  const priorityRank: Record<DenialQueueItem['priority'], number> = {
    high: 3,
    medium: 2,
    low: 1,
  }
  const categoryRank: Record<DenialQueueItem['categoryKey'], number> = {
    coding: 7,
    documentation: 6,
    evv: 5,
    orders: 4,
    intake: 3,
    payer: 2,
    general: 1,
  }

  const dueComparison = compareNullableDates(left.earliestDueAt, right.earliestDueAt)
  if (dueComparison !== 0) {
    return dueComparison
  }

  return (
    (priorityRank[right.priority] ?? 0) - (priorityRank[left.priority] ?? 0) ||
    (categoryRank[right.categoryKey] ?? 0) - (categoryRank[left.categoryKey] ?? 0) ||
    left.baseClaim.patientName.localeCompare(right.baseClaim.patientName)
  )
}

function categorizeDenialReason(reason?: string) {
  const normalized = reason?.toLowerCase() ?? ''

  if (
    normalized.includes('diagnos') ||
    normalized.includes('coding') ||
    normalized.includes('icd') ||
    normalized.includes('pdgm') ||
    normalized.includes('hipps')
  ) {
    return { key: 'coding' as const, label: 'Coding' }
  }
  if (normalized.includes('documentation') || normalized.includes('chart') || normalized.includes('visit note') || normalized.includes('qa')) {
    return { key: 'documentation' as const, label: 'Documentation' }
  }
  if (normalized.includes('evv') || normalized.includes('visit verification')) {
    return { key: 'evv' as const, label: 'EVV' }
  }
  if (normalized.includes('face-to-face') || normalized.includes('eligibility') || normalized.includes('coverage') || normalized.includes('intake')) {
    return { key: 'intake' as const, label: 'Intake' }
  }
  if (normalized.includes('order') || normalized.includes('physician')) {
    return { key: 'orders' as const, label: 'Orders' }
  }
  if (
    normalized.includes('payer') ||
    normalized.includes('routing') ||
    normalized.includes('subscriber') ||
    normalized.includes('member') ||
    normalized.includes('demographic') ||
    normalized.includes('billing office')
  ) {
    return { key: 'payer' as const, label: 'Payer/Admin' }
  }

  return { key: 'general' as const, label: 'General' }
}

function deriveDenialPriority(
  queueState: DenialQueueItem['queueState'],
  categoryKey: DenialQueueItem['categoryKey'],
): DenialQueueItem['priority'] {
  if (queueState === 'ready_to_resubmit') {
    return 'high'
  }

  if (['coding', 'documentation', 'evv'].includes(categoryKey)) {
    return 'high'
  }
  if (['orders', 'intake', 'payer'].includes(categoryKey)) {
    return 'medium'
  }

  return 'low'
}

function compareNullableDates(left?: string, right?: string) {
  if (left && right) {
    return left.localeCompare(right)
  }
  if (left) {
    return -1
  }
  if (right) {
    return 1
  }

  return 0
}

function extractDiagnosisCode(diagnosis: string) {
  const match = diagnosis.trim().match(/^([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)/i)
  return match ? match[1].toUpperCase() : ''
}

function isValidDiagnosisCode(code: string) {
  return /^[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$/.test(code)
}

function normalizeDisciplines(value?: string[] | string) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value) as string[]
      return Array.isArray(parsed) ? parsed : value.split(',').map((entry) => entry.trim()).filter(Boolean)
    } catch {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean)
    }
  }

  return []
}

function assessmentActivationBlockers(assessment?: Assessment) {
  const blockers: string[] = []
  if (!assessment) {
    return blockers
  }

  if (!assessment.homebound_status?.trim()) {
    blockers.push('Episode cannot activate until the finalized assessment documents homebound status.')
  }
  if (!assessment.homebound_narrative?.trim()) {
    blockers.push('Episode cannot activate until the finalized assessment includes a homebound narrative.')
  }
  if (
    ['soc', 'roc', 'recertification'].includes(assessment.assessment_type.toLowerCase()) &&
    !assessment.medication_reconciliation_completed
  ) {
    blockers.push('Episode cannot activate until medication reconciliation is documented on the finalized assessment.')
  }

  return blockers
}

function assessmentBillingBlockers(assessment?: Assessment) {
  if (!assessment) {
    return []
  }

  const blockers = [...assessmentActivationBlockers(assessment)]
  if (!assessment.clinical_summary?.trim()) {
    blockers.push('Billing requires a clinical summary on the finalized assessment.')
  }
  if (!assessment.care_plan_goals?.trim()) {
    blockers.push('Billing requires documented care plan goals on the finalized assessment.')
  }

  return blockers
}

export function buildVisitRecommendations(
  episode: Episode,
  snapshot: EpisodeAdmissionSnapshot | null,
  visits: Visit[],
): VisitRecommendation[] {
  if (!snapshot) {
    return []
  }

  const requestedDisciplines = snapshot.requested_disciplines ?? []
  const episodeVisits = visits.filter((visit) => visit.episode_id === episode.id)
  const hasCompletedSoc = episodeVisits.some((visit) => visit.visit_type === 'soc' && ['completed', 'locked'].includes(visit.status))
  const recommendedStart = hasCompletedSoc
    ? addDaysToDateTimeLocal(buildBaseDateTime(episode.start_of_care_date ?? episode.cert_start_date, 10), 2)
    : buildBaseDateTime(snapshot.planned_soc_date ?? episode.cert_start_date, 9)

  return requestedDisciplines.map((discipline, index) => {
    const profile = recommendationProfileForDiscipline(discipline, hasCompletedSoc)
    const targetDateTime = addDaysToDateTimeLocal(recommendedStart, index * profile.daySpacing)

    return {
      key: `${episode.id}-${discipline}-${profile.visitType}`,
      title: profile.title,
      discipline,
      visitType: profile.visitType,
      targetDateTime,
      durationMinutes: profile.durationMinutes,
      requiresEvv: profile.requiresEvv,
      rationale: profile.rationale,
    }
  })
}

export function buildWeekOneFrequencyPlan(
  episode: Episode,
  snapshot: EpisodeAdmissionSnapshot | null,
  visits: Visit[],
): VisitRecommendation[] {
  if (!snapshot) {
    return []
  }

  const requestedDisciplines = snapshot.requested_disciplines ?? []
  const episodeVisits = visits.filter((visit) => visit.episode_id === episode.id)
  const hasCompletedSoc = episodeVisits.some((visit) => visit.visit_type === 'soc' && ['completed', 'locked'].includes(visit.status))
  const baseDateTime = hasCompletedSoc
    ? buildBaseDateTime(episode.start_of_care_date ?? episode.cert_start_date, 10)
    : buildBaseDateTime(snapshot.planned_soc_date ?? episode.cert_start_date, 9)
  const plan: VisitRecommendation[] = []

  requestedDisciplines.forEach((discipline) => {
    const normalized = discipline.toUpperCase()
    const templates = weekOneTemplateForDiscipline(normalized, hasCompletedSoc)

    templates.forEach((template, index) => {
      const targetDateTime = addDaysToDateTimeLocal(baseDateTime, template.dayOffset)
      if (hasComparableVisitScheduled(episodeVisits, normalized, template.visitType, targetDateTime)) {
        return
      }

      plan.push({
        key: `${episode.id}-${normalized}-${template.visitType}-${index}-${template.dayOffset}`,
        title: template.title,
        discipline: normalized,
        visitType: template.visitType,
        targetDateTime,
        durationMinutes: template.durationMinutes,
        requiresEvv: template.requiresEvv,
        rationale: template.rationale,
        frequencyHint: template.frequencyHint,
      })
    })
  })

  return plan.sort((left, right) => left.targetDateTime.localeCompare(right.targetDateTime))
}

function recommendationProfileForDiscipline(discipline: string, hasCompletedSoc: boolean) {
  const normalized = discipline.toUpperCase()

  if (!hasCompletedSoc) {
    return {
      title: normalized === 'SN' ? 'Start of Care nursing visit' : `${normalized} admission evaluation`,
      visitType: normalized === 'SN' ? 'soc' : `${normalized.toLowerCase()}_eval`,
      durationMinutes: normalized === 'SN' ? 60 : 45,
      daySpacing: 1,
      requiresEvv: true,
      rationale:
        normalized === 'SN'
          ? 'The episode still needs a completed Start of Care nursing visit before activation can proceed.'
          : `${normalized} should be scheduled early so discipline-specific services can start right after admission.`,
    }
  }

  switch (normalized) {
    case 'SN':
      return {
        title: 'Routine skilled nursing follow-up',
        visitType: 'routine',
        durationMinutes: 45,
        daySpacing: 2,
        requiresEvv: true,
        rationale: 'Recommended to maintain early post-SOC monitoring, medication follow-up, and symptom surveillance.',
      }
    case 'PT':
      return {
        title: 'Physical therapy evaluation',
        visitType: 'pt_eval',
        durationMinutes: 45,
        daySpacing: 3,
        requiresEvv: true,
        rationale: 'Requested PT should start promptly after activation to establish mobility goals and a therapy cadence.',
      }
    case 'OT':
      return {
        title: 'Occupational therapy evaluation',
        visitType: 'ot_eval',
        durationMinutes: 45,
        daySpacing: 3,
        requiresEvv: true,
        rationale: 'OT is recommended early to assess ADLs, home safety, and caregiver support needs.',
      }
    case 'ST':
      return {
        title: 'Speech therapy evaluation',
        visitType: 'st_eval',
        durationMinutes: 45,
        daySpacing: 4,
        requiresEvv: true,
        rationale: 'ST should be scheduled early when ordered so swallowing, cognition, or communication goals can be assessed.',
      }
    case 'MSW':
      return {
        title: 'Medical social work assessment',
        visitType: 'msw_assessment',
        durationMinutes: 45,
        daySpacing: 5,
        requiresEvv: false,
        rationale: 'MSW follow-up is recommended to assess support systems, psychosocial barriers, and community resources.',
      }
    case 'HHA':
      return {
        title: 'Home health aide visit',
        visitType: 'hha_routine',
        durationMinutes: 60,
        daySpacing: 2,
        requiresEvv: true,
        rationale: 'HHA services should align with the care plan once skilled oversight and visit frequency are in place.',
      }
    default:
      return {
        title: `${normalized} evaluation`,
        visitType: `${normalized.toLowerCase()}_eval`,
        durationMinutes: 45,
        daySpacing: 3,
        requiresEvv: true,
        rationale: `${normalized} was requested on the referral and should be scheduled as part of the opening visit plan.`,
      }
  }
}

function weekOneTemplateForDiscipline(discipline: string, hasCompletedSoc: boolean) {
  if (!hasCompletedSoc) {
    if (discipline === 'SN') {
      return [
        {
          title: 'Week-one Start of Care visit',
          visitType: 'soc',
          dayOffset: 0,
          durationMinutes: 60,
          requiresEvv: true,
          rationale: 'SOC must be completed before the episode can move forward into full scheduling.',
          frequencyHint: 'Day 1: complete SOC and open the clinical plan.',
        },
      ]
    }

    return [
      {
        title: `${discipline} opening evaluation`,
        visitType: `${discipline.toLowerCase()}_eval`,
        dayOffset: 1,
        durationMinutes: 45,
        requiresEvv: discipline !== 'MSW',
        rationale: `${discipline} should start early once admission is in progress.`,
        frequencyHint: `Day 2: establish ${discipline} goals right after admission.`,
      },
    ]
  }

  switch (discipline) {
    case 'SN':
      return [
        {
          title: 'SN follow-up 1',
          visitType: 'routine',
          dayOffset: 1,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: 'Early skilled nursing follow-up supports symptom monitoring and medication management.',
          frequencyHint: '2w1: first nursing follow-up in week one.',
        },
        {
          title: 'SN follow-up 2',
          visitType: 'routine',
          dayOffset: 4,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: 'A second week-one nursing touchpoint helps stabilize the patient after SOC.',
          frequencyHint: '2w1: second nursing follow-up in week one.',
        },
      ]
    case 'PT':
      return [
        {
          title: 'PT evaluation',
          visitType: 'pt_eval',
          dayOffset: 2,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: 'Therapy evaluation should happen early enough to set mobility goals.',
          frequencyHint: '1w1 eval: initial PT evaluation in week one.',
        },
        {
          title: 'PT follow-up',
          visitType: 'pt_routine',
          dayOffset: 5,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: 'A follow-up PT visit starts reinforcing the therapy plan quickly.',
          frequencyHint: '1w1 follow-up: second PT touchpoint in week one.',
        },
      ]
    case 'OT':
      return [
        {
          title: 'OT evaluation',
          visitType: 'ot_eval',
          dayOffset: 3,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: 'OT should assess ADLs and home safety during the opening week.',
          frequencyHint: '1w1 eval: OT opening assessment.',
        },
      ]
    case 'ST':
      return [
        {
          title: 'ST evaluation',
          visitType: 'st_eval',
          dayOffset: 3,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: 'ST should evaluate swallowing, cognition, or communication needs in week one.',
          frequencyHint: '1w1 eval: ST opening assessment.',
        },
      ]
    case 'MSW':
      return [
        {
          title: 'MSW assessment',
          visitType: 'msw_assessment',
          dayOffset: 4,
          durationMinutes: 45,
          requiresEvv: false,
          rationale: 'MSW follow-up helps assess psychosocial needs and resource barriers.',
          frequencyHint: '1w1 assessment: psychosocial review in week one.',
        },
      ]
    case 'HHA':
      return [
        {
          title: 'HHA visit 1',
          visitType: 'hha_routine',
          dayOffset: 2,
          durationMinutes: 60,
          requiresEvv: true,
          rationale: 'Aide services should begin promptly once the supervisory plan is in place.',
          frequencyHint: '2w1: first aide visit in week one.',
        },
        {
          title: 'HHA visit 2',
          visitType: 'hha_routine',
          dayOffset: 5,
          durationMinutes: 60,
          requiresEvv: true,
          rationale: 'A second aide visit supports continuity of personal care tasks.',
          frequencyHint: '2w1: second aide visit in week one.',
        },
      ]
    default:
      return [
        {
          title: `${discipline} evaluation`,
          visitType: `${discipline.toLowerCase()}_eval`,
          dayOffset: 3,
          durationMinutes: 45,
          requiresEvv: true,
          rationale: `${discipline} was requested on the referral and should be initiated during the opening week.`,
          frequencyHint: '1w1 eval: opening discipline assessment.',
        },
      ]
  }
}

function hasComparableVisitScheduled(visits: Visit[], discipline: string, visitType: string, targetDateTime: string) {
  return visits.some((visit) => {
    if (visit.discipline.toUpperCase() !== discipline || visit.visit_type !== visitType) {
      return false
    }

    const existingDate = visit.scheduled_start.replace(' ', 'T').slice(0, 10)
    const targetDate = targetDateTime.slice(0, 10)
    return existingDate === targetDate
  })
}

function buildBaseDateTime(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, '0')}:00`
}

function addDaysToDateTimeLocal(value: string, days: number) {
  const source = new Date(value)
  source.setDate(source.getDate() + days)
  return toDateTimeLocal(source)
}

function toDateTimeLocal(source: Date) {
  const year = source.getFullYear()
  const month = String(source.getMonth() + 1).padStart(2, '0')
  const day = String(source.getDate()).padStart(2, '0')
  const hour = String(source.getHours()).padStart(2, '0')
  const minute = String(source.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function computeDemoReadiness(episodeId: number, dataset: AppDataset): EpisodeReadiness {
  const socVisitCompleted = dataset.visits.some(
    (visit) => visit.episode_id === episodeId && visit.visit_type === 'soc' && ['completed', 'locked'].includes(visit.status),
  )
  const finalizedAssessmentExists = dataset.assessments.some(
    (assessment) => assessment.episode_id === episodeId && ['final', 'locked'].includes(assessment.status),
  )
  const episode = dataset.episodes.find((item) => item.id === episodeId)
  const snapshot =
    normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
  const openQaTasks = dataset.qaTasks.filter((task) => task.episode_id === episodeId && task.status === 'open').length
  const visitIds = new Set(dataset.visits.filter((visit) => visit.episode_id === episodeId).map((visit) => visit.id))
  const pendingEvvRecords = dataset.evvRecords.filter(
    (record) => visitIds.has(record.visit_id) && ['pending_submission', 'exception'].includes(record.status),
  ).length
  const claimHolds = dataset.claims.filter((claim) => claim.episode_id === episodeId && Boolean(claim.hold_reason)).length
  const hasUnsignedAdmissionOrder = dataset.physicianOrders.some(
    (order) =>
      order.episode_id === episodeId &&
      order.active &&
      order.order_scope === 'admission' &&
      (order.order_status !== 'signed' || !order.signed_at),
  )

  const blockers: string[] = []
  if (!socVisitCompleted) {
    blockers.push('Episode cannot activate until the Start of Care visit is completed.')
  }
  if (!finalizedAssessmentExists) {
    blockers.push('Episode cannot activate until a finalized OASIS assessment exists.')
  }
  const finalizedAssessment = dataset.assessments
    .filter((assessment) => assessment.episode_id === episodeId && ['final', 'locked'].includes(assessment.status))
    .sort((left, right) => right.completed_at.localeCompare(left.completed_at))[0]
  blockers.push(...assessmentActivationBlockers(finalizedAssessment))
  if (!snapshot?.face_to_face_date) {
    blockers.push('Episode cannot activate until face-to-face documentation is captured on the referral.')
  }
  if (!snapshot?.physician_orders_signed || !snapshot?.physician_orders_signed_at) {
    blockers.push('Episode cannot activate until physician orders are signed.')
  }
  if (hasUnsignedAdmissionOrder) {
    blockers.push('Episode cannot activate until the active admission physician order packet is signed.')
  }
  if (openQaTasks > 0) {
    blockers.push(`${openQaTasks} open QA task(s) still need review.`)
  }
  if (pendingEvvRecords > 0) {
    blockers.push(`${pendingEvvRecords} EVV record(s) are still pending submission or correction.`)
  }
  if (claimHolds > 0) {
    blockers.push(`${claimHolds} claim(s) currently have hold reasons.`)
  }

  return {
    episode_id: episodeId,
    soc_visit_completed: socVisitCompleted,
    finalized_assessment_exists: finalizedAssessmentExists,
    open_qa_tasks: openQaTasks,
    pending_evv_records: pendingEvvRecords,
    claim_holds: claimHolds,
    ready_to_activate:
      socVisitCompleted &&
      finalizedAssessmentExists &&
      assessmentActivationBlockers(finalizedAssessment).length === 0 &&
      Boolean(snapshot?.face_to_face_date) &&
      Boolean(snapshot?.physician_orders_signed && snapshot?.physician_orders_signed_at) &&
      !hasUnsignedAdmissionOrder,
    primary_blocker: blockers[0] ?? null,
    blockers,
  }
}

export function buildDemoEpisodeReviewSummary(episode: Episode, dataset: AppDataset): EpisodeReviewSummary {
  const activationReadiness = computeDemoReadiness(episode.id, dataset)
  const claim = dataset.claims.find((item) => item.episode_id === episode.id)
  const billingReadiness = claim ? evaluateDemoBillingReadiness(claim, dataset) : { ready_to_bill: false, primary_blocker: '', blockers: ['Claim has not been created yet.'] }
  const openQaTasks = dataset.qaTasks
    .filter((task) => task.episode_id === episode.id && task.status === 'open')
    .sort((left, right) => `${left.due_at ?? ''}`.localeCompare(`${right.due_at ?? ''}`))
  const episodeVisitIds = new Set(dataset.visits.filter((visit) => visit.episode_id === episode.id).map((visit) => visit.id))
  const pendingEvvRecords = dataset.evvRecords.filter(
    (record) => episodeVisitIds.has(record.visit_id) && ['pending_submission', 'exception'].includes(record.status),
  ).length
  const activeOrders = dataset.physicianOrders.filter((order) => order.episode_id === episode.id && order.active)
  const unsignedActiveOrders = activeOrders.filter((order) => order.order_status !== 'signed' || !order.signed_at).length
  const completedVisits = dataset.visits.filter((visit) => visit.episode_id === episode.id && ['completed', 'locked'].includes(visit.status)).length
  const lockedVisits = dataset.visits.filter((visit) => visit.episode_id === episode.id && visit.documentation_status === 'locked').length
  const holdReasons = splitHoldReasons(claim?.hold_reason)
  const recentVisitHighlights = buildDemoPhysicianOrderDraft(dataset, episode, 'plan_of_care').recent_visit_highlights

  return {
    episode_id: episode.id,
    patient_name: episode.patient_name,
    episode_status: episode.episode_status,
    ready_to_activate: activationReadiness.ready_to_activate,
    ready_to_bill: billingReadiness.ready_to_bill,
    activation_blockers: activationReadiness.blockers,
    billing_blockers: billingReadiness.blockers,
    open_qa_tasks: openQaTasks.length,
    pending_evv_records: pendingEvvRecords,
    unsigned_active_orders: unsignedActiveOrders,
    completed_visits: completedVisits,
    locked_visits: lockedVisits,
    hold_reasons: holdReasons,
    open_task_titles: openQaTasks.map((task) => `${task.task_type}: ${task.title}`),
    active_order_summaries: activeOrders.map(
      (order) =>
        `${labelizeValue(order.order_scope)} v${order.version_number} (${labelizeValue(order.order_status)})${
          order.order_summary ? ` - ${order.order_summary}` : ''
        }`,
    ),
    recent_visit_highlights: recentVisitHighlights,
  }
}

export function buildDemoEpisodeInsights(episode: Episode, dataset: AppDataset): EpisodeInsightSummary {
  const assessment = dataset.assessments
    .filter((item) => item.episode_id === episode.id && ['final', 'locked'].includes(item.status))
    .sort((left, right) => right.completed_at.localeCompare(left.completed_at))[0]
  const visits = dataset.visits.filter((item) => item.episode_id === episode.id)
  const snapshot = normalizeAdmissionSnapshot(episode.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
  const clinicalAlerts: ClinicalDecisionAlert[] = []

  const visitNarrative = visits
    .map((visit) => {
      const payload = typeof visit.documentation_payload === 'string' ? JSON.parse(visit.documentation_payload || '{}') : (visit.documentation_payload ?? {})
      return `${visit.documentation_summary ?? ''} ${JSON.stringify(payload)}`
    })
    .join(' ')
    .toLowerCase()

  if (!assessment) {
    clinicalAlerts.push({
      severity: 'high',
      source: 'assessment',
      summary: 'No finalized assessment is available to drive decision support.',
      resolution_hint: 'Finalize SOC/OASIS before relying on automated review signals.',
    })
  } else {
    if (assessment.fall_risk_level === 'high' && !/(fall|safety|balance)/.test(visitNarrative)) {
      clinicalAlerts.push({
        severity: 'high',
        source: 'assessment',
        summary: 'High fall risk is documented without matching intervention or teaching in visit charting.',
        resolution_hint: 'Add fall-prevention teaching, mobility safety notes, or therapy intervention detail.',
      })
    }
    if (['elevated', 'high'].includes(assessment.hospitalization_risk ?? '') && !/(follow|monitor|weight|provider)/.test(visitNarrative)) {
      clinicalAlerts.push({
        severity: 'medium',
        source: 'assessment',
        summary: 'Hospitalization risk is elevated without a strong follow-up plan in recent charting.',
        resolution_hint: 'Document escalation triggers, monitoring cadence, and provider outreach in the next visit.',
      })
    }
    if ((assessment.homebound_narrative ?? '').trim().length < 80) {
      clinicalAlerts.push({
        severity: 'medium',
        source: 'assessment',
        summary: 'Homebound narrative may not be detailed enough for a strong review story.',
        resolution_hint: 'Describe exertional limits, required assistance, and why leaving home is a considerable effort.',
      })
    }
  }

  const assessmentChecks = assessment
    ? [
        Boolean(assessment.principal_diagnosis_code?.trim()),
        Boolean(assessment.homebound_status?.trim()),
        Boolean(assessment.homebound_narrative?.trim()),
        Boolean(assessment.medication_reconciliation_completed),
        Boolean(assessment.care_plan_goals?.trim()),
        Boolean(assessment.clinical_summary?.trim()),
      ]
    : []
  const assessmentScore = assessmentChecks.length > 0 ? Math.round((assessmentChecks.filter(Boolean).length / assessmentChecks.length) * 100) : 0
  const completedVisits = visits.filter((visit) => ['completed', 'locked'].includes(visit.status))
  const visitScore =
    completedVisits.length > 0
      ? Math.round(
          (completedVisits.filter((visit) => Boolean(visit.documentation_summary?.trim()) && Boolean((visit.documentation_status ?? '').trim())).length / completedVisits.length) * 100,
        )
      : 0
  const integrityBlockers = assessmentScore < 80 ? ['Assessment packet is incomplete for high-confidence QA release.'] : []
  const integrityWarnings =
    visitScore < 80 ? ['Completed visit documentation is missing one or more required discipline-specific sections.'] : []

  const certStart = new Date(`${episode.cert_start_date}T00:00:00`)
  const certEnd = new Date(certStart)
  certEnd.setDate(certEnd.getDate() + 29)
  const projectedVisits = visits.filter((visit) => {
    const when = new Date((visit.scheduled_start.includes('T') ? visit.scheduled_start : visit.scheduled_start.replace(' ', 'T')))
    return when >= certStart && when <= certEnd && visit.status !== 'missed'
  }).length
  const threshold = 5
  const riskLevel = projectedVisits < threshold ? 'high' : projectedVisits === threshold ? 'medium' : 'low'
  const diagnosisCode = extractDiagnosisCode(assessment?.principal_diagnosis_code ?? episode.primary_diagnosis) || 'R69'
  const pdgmBreakdown = (() => {
    const clinicalGroup = diagnosisCode.startsWith('I') ? 'MMTA-CARDIAC' : diagnosisCode.startsWith('J') ? 'MMTA-RESPIRATORY' : diagnosisCode.startsWith('M') ? 'MUSCULOSKELETAL' : 'MMTA-OTHER'
    const functionalLevel = (assessment?.functional_score ?? 0) >= 16 ? 'HIGH' : (assessment?.functional_score ?? 0) >= 8 ? 'MEDIUM' : 'LOW'
    const admissionSource = ((snapshot?.admission_source ?? '').toLowerCase().includes('hospital') ? 'INSTITUTIONAL' : 'COMMUNITY')
    const comorbidityAdjustment = (assessment?.comorbidity_level ?? 'none').toUpperCase()
    return {
      group_code: `${clinicalGroup}-${admissionSource}-EARLY-${functionalLevel}-${comorbidityAdjustment}`,
      clinical_group: clinicalGroup,
      timing: 'EARLY',
      functional_level: functionalLevel,
      comorbidity_adjustment: comorbidityAdjustment,
      admission_source: admissionSource,
      explanation: `PDGM grouped from diagnosis ${diagnosisCode}, admission source ${admissionSource}, functional level ${functionalLevel}, and comorbidity ${comorbidityAdjustment}.`,
    }
  })()

  return {
    episode_id: episode.id,
    clinical_decision_support: clinicalAlerts,
    documentation_integrity: {
      episode_id: episode.id,
      assessment_score: assessmentScore,
      visit_score: visitScore,
      overall_score: Math.round((assessmentScore + visitScore) / (assessment ? 2 : 1)),
      blockers: integrityBlockers,
      warnings: integrityWarnings,
    },
    utilization_risk: {
      episode_id: episode.id,
      period_number: 1,
      projected_visits: projectedVisits,
      threshold_visits: threshold,
      risk_level: riskLevel,
      warning_note:
        riskLevel === 'low'
          ? 'Projected visit utilization is above the demo LUPA warning threshold.'
          : `Projected first-period utilization is ${projectedVisits} visit(s) against a ${threshold}-visit threshold.`,
      recommended_action:
        riskLevel === 'low'
          ? 'Maintain current cadence and avoid unnecessary cancellations.'
          : 'Protect ordered frequency, reschedule missed visits quickly, and review therapy/nursing cadence before billing.',
    },
    pdgm_breakdown: pdgmBreakdown,
  }
}

function compareQaTaskUrgency(left: QaTask, right: QaTask) {
  const statusRank: Record<string, number> = {
    overdue_assigned: 4,
    overdue_unassigned: 3,
    due_today: 2,
    upcoming: 1,
    undated: 0,
  }
  const priorityRank: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }

  const leftStatus = statusRank[left.escalation_status ?? 'undated'] ?? 0
  const rightStatus = statusRank[right.escalation_status ?? 'undated'] ?? 0
  if (leftStatus !== rightStatus) {
    return rightStatus - leftStatus
  }

  const leftPriority = priorityRank[(left.priority ?? 'medium').toLowerCase()] ?? 0
  const rightPriority = priorityRank[(right.priority ?? 'medium').toLowerCase()] ?? 0
  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority
  }

  return `${left.due_at ?? ''}`.localeCompare(`${right.due_at ?? ''}`)
}

export function buildRoleDashboardConfig(
  user: User,
  dataset: AppDataset,
  episodeIntakeQueue: EpisodeIntakeQueueItem[],
  claimReadinessQueue: ClaimReadinessItem[],
  offlineQueueCount: number,
): RoleDashboardConfig {
  const role = user.role
  const openQaTasks = dataset.qaTasks.filter((task) => task.status === 'open')
  const blockedClaims = claimReadinessQueue.filter((item) => !item.readyToBill || Boolean(item.claim.hold_reason))
  const unsignedOrders = dataset.physicianOrders.filter((order) => order.active && (order.order_status !== 'signed' || !order.signed_at))
  const pendingEvv = dataset.evvRecords.filter((record) => ['pending_submission', 'exception'].includes(record.status))
  const openClinicianVisits = dataset.visits
    .filter((visit) => !['locked', 'missed'].includes(visit.status))
    .sort((left, right) => left.scheduled_start.localeCompare(right.scheduled_start))
  const documentationFollowUpVisits = dataset.visits
    .filter((visit) => ['completed', 'qa_review'].includes(visit.documentation_status ?? '') || (visit.status === 'completed' && visit.documentation_status !== 'locked'))
    .sort((left, right) => (right.actual_end ?? right.scheduled_end).localeCompare(left.actual_end ?? left.scheduled_end))
  const pendingActivationEpisodes = dataset.episodes.filter((episode) => episode.episode_status !== 'active' && episode.episode_status !== 'discharged' && episode.episode_status !== 'deceased')

  switch (role) {
    case 'Intake': {
      const intakeItems: RoleWorkItem[] = []
      const intakeTask =
        episodeIntakeQueue.find((item) => item.task.assigned_user_name === user.full_name) ??
        episodeIntakeQueue.find((item) => item.task.assigned_role === 'Intake') ??
        episodeIntakeQueue[0]
      if (intakeTask) {
        intakeItems.push({
          key: `intake-${intakeTask.task.id}`,
          title: intakeTask.task.title,
          detail: intakeTask.task.escalation_reason ?? intakeTask.task.details ?? 'Open the episode to complete missing intake documentation.',
          buttonLabel: intakeTask.blocker === 'face_to_face' ? 'Open intake follow-up' : 'Open episode',
          priority: intakeTask.task.priority,
          dueAt: intakeTask.task.due_at,
          ownerLabel: formatTaskAssignee(intakeTask.task),
          module: 'Episodes',
          episodeId: intakeTask.episode.id,
          actionType: 'episode',
        })
      }
      const convertibleReferral = dataset.referrals.find((referral) => referral.status !== 'converted_to_episode' && referral.intake_ready)
      if (convertibleReferral) {
        intakeItems.push({
          key: `referral-${convertibleReferral.id}`,
          title: `Convert referral for ${convertibleReferral.patient_name}`,
          detail: 'Referral intake is ready for episode creation.',
          buttonLabel: 'Open referrals',
          priority: 'medium',
          dueAt: `${convertibleReferral.planned_soc_date} 09:00:00`,
          module: 'Referrals',
          actionType: 'referrals',
        })
      }

      return {
        heading: 'Intake Worklist',
        subtitle: 'Focus on face-to-face, referral conversion, and admission readiness.',
        metrics: [
          { label: 'Intake blockers', value: episodeIntakeQueue.length },
          { label: 'Ready referrals', value: dataset.referrals.filter((referral) => referral.status !== 'converted_to_episode' && referral.intake_ready).length },
          { label: 'Pending episodes', value: pendingActivationEpisodes.length },
        ],
        items: intakeItems,
      }
    }
    case 'Clinician': {
      const clinicianItems: RoleWorkItem[] = []
      const nextVisit = openClinicianVisits[0]
      if (nextVisit) {
        clinicianItems.push({
          key: `visit-${nextVisit.id}`,
          title: `${nextVisit.patient_name} · ${nextVisit.visit_type.toUpperCase()} ${nextVisit.discipline}`,
          detail: `Visit scheduled for ${nextVisit.scheduled_start}. Open the clinician workspace to chart or start the visit.`,
          buttonLabel: 'Open visit',
          priority: nextVisit.status === 'in_progress' ? 'high' : 'medium',
          dueAt: nextVisit.scheduled_start,
          module: 'Clinician',
          episodeId: nextVisit.episode_id,
          visitId: nextVisit.id,
          actionType: 'visit_documentation',
        })
      }
      const chartFollowUp = documentationFollowUpVisits[0]
      if (chartFollowUp) {
        clinicianItems.push({
          key: `chart-${chartFollowUp.id}`,
          title: `Complete chart for ${chartFollowUp.patient_name}`,
          detail: 'Documentation still needs completion or QA-ready submission.',
          buttonLabel: 'Open chart',
          priority: chartFollowUp.documentation_status === 'qa_review' ? 'high' : 'medium',
          dueAt: chartFollowUp.actual_end ?? chartFollowUp.scheduled_end,
          module: 'Clinician',
          episodeId: chartFollowUp.episode_id,
          visitId: chartFollowUp.id,
          actionType: 'visit_documentation',
        })
      }

      return {
        heading: 'Clinician Worklist',
        subtitle: 'Prioritize scheduled visits, charting follow-up, and offline sync.',
        metrics: [
          { label: 'Open visits', value: openClinicianVisits.length },
          { label: 'Chart follow-up', value: documentationFollowUpVisits.length },
          { label: 'Offline queue', value: offlineQueueCount },
        ],
        items: clinicianItems,
      }
    }
    case 'QA': {
      const qaItems = openQaTasks
        .sort((left, right) => {
          const leftMine = left.assigned_user_name === user.full_name ? 1 : 0
          const rightMine = right.assigned_user_name === user.full_name ? 1 : 0
          return rightMine - leftMine || compareQaTaskUrgency(left, right)
        })
        .slice(0, 3)
        .map((task) => ({
          key: `qa-${task.id}`,
          title: task.title,
          detail: task.escalation_reason ?? task.details ?? 'Open the QA queue to continue review.',
          buttonLabel: 'Open QA',
          priority: task.priority,
          dueAt: task.due_at,
          ownerLabel: formatTaskAssignee(task),
          module: 'QA' as ModuleName,
          episodeId: task.episode_id,
          visitId: task.visit_id,
          qaTaskId: task.id,
          actionType: 'qa' as const,
        }))

      return {
        heading: 'QA Worklist',
        subtitle: 'Review OASIS, physician orders, and documentation release work first.',
        metrics: [
          { label: 'Open QA tasks', value: openQaTasks.length },
          { label: 'Doc review tasks', value: openQaTasks.filter((task) => task.task_type === 'visit_documentation_review').length },
          { label: 'Assessment review', value: openQaTasks.filter((task) => ['assessment_review', 'oasis_review'].includes(task.task_type)).length },
        ],
        items: qaItems,
      }
    }
    case 'Billing': {
      const billingItems: RoleWorkItem[] = []
      const blockedClaim = blockedClaims.find((item) => item.relatedAssignees.includes(user.full_name)) ?? blockedClaims[0]
      if (blockedClaim?.episode) {
        billingItems.push({
          key: `claim-${blockedClaim.claim.id}`,
          title: `${blockedClaim.patientName} · ${blockedClaim.claim.claim_type.toUpperCase()} claim`,
          detail: blockedClaim.escalationReasons[0] ?? blockedClaim.blockers[0] ?? blockedClaim.claim.hold_reason ?? 'Claim follow-up is required.',
          buttonLabel: 'Open billing',
          priority: blockedClaim.highestPriority ?? 'high',
          dueAt: blockedClaim.earliestDueAt,
          ownerLabel: blockedClaim.relatedAssignees[0] ?? blockedClaim.relatedOwners[0],
          module: 'Billing',
          episodeId: blockedClaim.claim.episode_id,
          claimId: blockedClaim.claim.id,
          actionType: 'billing',
        })
      }
      const evvRecord = pendingEvv[0]
      if (evvRecord) {
        billingItems.push({
          key: `evv-${evvRecord.id}`,
          title: `EVV follow-up for visit ${evvRecord.visit_id}`,
          detail: `EVV record is ${evvRecord.status} and needs billing review.`,
          buttonLabel: 'Open EVV',
          priority: evvRecord.status === 'exception' ? 'high' : 'medium',
          module: 'Billing',
          evvRecordId: evvRecord.id,
          actionType: 'billing',
        })
      }

      return {
        heading: 'Billing Worklist',
        subtitle: 'Work blocked claims, unsigned orders, and EVV exceptions in sequence.',
        metrics: [
          { label: 'Blocked claims', value: blockedClaims.length },
          { label: 'Pending EVV', value: pendingEvv.length },
          { label: 'Unsigned orders', value: unsignedOrders.length },
        ],
        items: billingItems,
      }
    }
    case 'Admin': {
      return {
        heading: 'Admin Snapshot',
        subtitle: 'Monitor operational volume across intake, QA, clinician, and billing queues.',
        metrics: [
          { label: 'Patients', value: dataset.metrics.patients },
          { label: 'Open QA', value: openQaTasks.length },
          { label: 'Claims on hold', value: blockedClaims.length },
        ],
        items: [
          {
            key: 'admin-episodes',
            title: 'Review active operational queues',
            detail: 'Open the episode workspace to inspect readiness, pre-bill summaries, and queue blockers.',
            buttonLabel: 'Open episodes',
            priority: 'medium',
            module: 'Episodes',
            actionType: 'episode',
          },
        ],
      }
    }
    default: {
      const clinicalItems: RoleWorkItem[] = []
      const unsignedOrder = unsignedOrders[0]
      if (unsignedOrder) {
        clinicalItems.push({
          key: `order-${unsignedOrder.id}`,
          title: `Unsigned ${labelizeValue(unsignedOrder.order_scope)} order`,
          detail: `Order packet for episode ${unsignedOrder.episode_id} is still ${labelizeValue(unsignedOrder.order_status)}.`,
          buttonLabel: 'Open order',
          priority: unsignedOrder.order_scope === 'admission' ? 'high' : 'medium',
          dueAt: unsignedOrder.sent_at ?? unsignedOrder.received_at,
          module: 'Episodes',
          episodeId: unsignedOrder.episode_id,
          actionType: 'order',
        })
      }
      const pendingEpisode = pendingActivationEpisodes[0]
      if (pendingEpisode) {
        clinicalItems.push({
          key: `episode-${pendingEpisode.id}`,
          title: `Review episode ${pendingEpisode.id}`,
          detail: `${pendingEpisode.patient_name} still needs activation or compliance follow-up.`,
          buttonLabel: 'Open episode',
          priority: 'high',
          dueAt: pendingEpisode.noa_due_date ? `${pendingEpisode.noa_due_date} 09:00:00` : undefined,
          module: 'Episodes',
          episodeId: pendingEpisode.id,
          actionType: 'episode',
        })
      }

      return {
        heading: 'Clinical Worklist',
        subtitle: 'Stay ahead of episode activation, physician order follow-up, and lifecycle readiness.',
        metrics: [
          { label: 'Unsigned orders', value: unsignedOrders.length },
          { label: 'Pending episodes', value: pendingActivationEpisodes.length },
          { label: 'Open QA tasks', value: openQaTasks.length },
        ],
        items: clinicalItems,
      }
    }
  }
}

export function buildAdminReportSummary(dataset: AppDataset, period: 'last_7' | 'last_30' | 'all'): AdminReportSummary {
  const days = period === 'last_7' ? 7 : period === 'last_30' ? 30 : null
  const filteredEpisodes = days === null ? dataset.episodes : dataset.episodes.filter((episode) => withinLastDays(episode.cert_start_date, days))
  const filteredClaims = days === null ? dataset.claims : dataset.claims.filter((claim) => withinLastDays(claimActivityDate(claim), days))
  const filteredQaTasks = days === null ? dataset.qaTasks : dataset.qaTasks.filter((task) => withinLastDays(task.due_at ?? task.assigned_at ?? task.last_escalated_at, days))
  const filteredVisits = days === null ? dataset.visits : dataset.visits.filter((visit) => withinLastDays(visit.actual_end ?? visit.scheduled_end, days))
  const filteredAudit = days === null ? dataset.auditEvents : dataset.auditEvents.filter((event) => withinLastDays(event.created, days))
  const filteredEvv = days === null ? dataset.evvRecords : dataset.evvRecords.filter((record) => withinLastDays(record.reconciled_at ?? record.submitted_at, days))

  return {
    metrics: [
      { label: 'Episodes in window', value: filteredEpisodes.length },
      { label: 'Blocked claims', value: filteredClaims.filter((claim) => Boolean(claim.hold_reason)).length },
      { label: 'Pending EVV', value: filteredEvv.filter((record) => ['pending_submission', 'exception', 'submitted'].includes(record.status)).length },
      { label: 'Open QA tasks', value: filteredQaTasks.filter((task) => task.status === 'open').length },
      { label: 'Suspended users', value: dataset.adminUsers.filter((user) => user.status === 'suspended').length },
      { label: 'MFA enabled users', value: dataset.adminUsers.filter((user) => user.mfa_enabled).length },
    ],
    payerMix: summarizeCounts(filteredEpisodes.map((episode) => episode.payer_type)),
    claimMix: summarizeCounts(filteredClaims.map((claim) => labelizeValue(claim.status))),
    qaMix: summarizeCounts(filteredQaTasks.map((task) => labelizeValue(task.task_type))),
    recentActivity: [
      { label: 'Audit events', count: filteredAudit.length },
      { label: 'Completed visits', count: filteredVisits.filter((visit) => ['completed', 'locked'].includes(visit.status)).length },
      { label: 'Submitted claims', count: filteredClaims.filter((claim) => claim.status === 'submitted').length },
      { label: 'Reconciled EVV', count: filteredEvv.filter((record) => record.status === 'reconciled').length },
    ],
  }
}

function summarizeCounts(values: string[]) {
  const counts = new Map<string, number>()

  values.forEach((value) => {
    const key = value && value.trim() !== '' ? value : 'Not set'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

function withinLastDays(value: string | null | undefined, days: number) {
  const normalized = normalizeDateTimeString(value ?? undefined)
  if (!normalized) {
    return false
  }

  const source = new Date(normalized.replace(' ', 'T'))
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - days)
  threshold.setHours(0, 0, 0, 0)
  return source >= threshold
}

function claimActivityDate(claim: Claim) {
  return claim.paid_at ?? claim.accepted_at ?? claim.rejected_at ?? claim.voided_at ?? claim.submitted_at ?? ''
}

export function buildDocumentationSummary(payload: {
  visit_focus?: string
  visit_narrative?: string
  interventions?: string
  patient_response?: string
  vitals?: string
  pain_level?: string
  teaching_topics?: string
  medication_review?: string
  wound_care?: string
  mobility_status?: string
  adl_support?: string
  psychosocial_notes?: string
  abnormal_findings?: string
  physician_contact_needed?: boolean
  follow_up_plan?: string
  next_visit_focus?: string
}) {
  return [
    payload.visit_focus ? `Focus: ${payload.visit_focus}.` : '',
    payload.visit_narrative ? `Narrative: ${payload.visit_narrative}.` : '',
    payload.interventions ? `Interventions: ${payload.interventions}.` : '',
    payload.patient_response ? `Patient response: ${payload.patient_response}.` : '',
    payload.vitals ? `Vitals: ${payload.vitals}.` : '',
    payload.pain_level ? `Pain: ${payload.pain_level}.` : '',
    payload.teaching_topics ? `Teaching: ${payload.teaching_topics}.` : '',
    payload.medication_review ? `Medication review: ${payload.medication_review}.` : '',
    payload.wound_care ? `Wound care: ${payload.wound_care}.` : '',
    payload.mobility_status ? `Mobility: ${payload.mobility_status}.` : '',
    payload.adl_support ? `ADL support: ${payload.adl_support}.` : '',
    payload.psychosocial_notes ? `Psychosocial: ${payload.psychosocial_notes}.` : '',
    payload.abnormal_findings ? `Abnormal findings: ${payload.abnormal_findings}.` : '',
    payload.physician_contact_needed ? 'Physician contact needed.' : '',
    payload.follow_up_plan ? `Follow-up plan: ${payload.follow_up_plan}.` : '',
    payload.next_visit_focus ? `Next visit: ${payload.next_visit_focus}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function splitHoldReasons(reason?: string) {
  if (!reason || reason.trim() === '') {
    return []
  }

  return reason.split('|').map((entry) => entry.trim()).filter(Boolean)
}
