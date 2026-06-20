import { describe, expect, it } from 'vitest'
import { createDemoDataset } from '../lib/demoData'
import {
  buildAdmissionSnapshotFromReferral,
  buildAdminReportSummary,
  buildBillingFollowUpSections,
  buildClaimReadinessQueue,
  buildClaimStatusLanes,
  buildDemoEpisodeInsights,
  buildDemoEpisodeReviewSummary,
  buildDemoPhysicianOrder,
  buildDemoPhysicianOrderDraft,
  buildDocumentationQaTasksForReferral,
  buildDocumentationSummary,
  buildEpisodeIntakeQueue,
  buildDenialQueueSections,
  buildEvvQueueSections,
  buildRoleDashboardConfig,
  buildVisitRecommendations,
  buildWeekOneFrequencyPlan,
  computeDemoReadiness,
  evaluateDemoBillingReadiness,
  normalizeDemoReferralOrderStatus,
  normalizeOrderStatus,
  type ClaimReadinessItem,
} from './workflow'

describe('computeDemoReadiness', () => {
  it('marks the demo episode ready to activate when SOC and finalized assessment exist', () => {
    const readiness = computeDemoReadiness(1, createDemoDataset())

    expect(readiness.soc_visit_completed).toBe(true)
    expect(readiness.finalized_assessment_exists).toBe(true)
    expect(readiness.ready_to_activate).toBe(true)
  })
})

describe('buildDemoEpisodeReviewSummary', () => {
  it('includes verbal order blockers in the billing blocker copy', () => {
    const dataset = createDemoDataset()
    const summary = buildDemoEpisodeReviewSummary(dataset.episodes[0], dataset)

    expect(summary.billing_blockers.join(' ')).toContain('verbal')
  })
})

describe('buildClaimReadinessQueue', () => {
  it('builds queue items with patient names and claim type data', () => {
    const [item] = buildClaimReadinessQueue(createDemoDataset())

    expect(item.patientName).toContain('Eleanor')
    expect(item.claim.claim_type).toBeTruthy()
  })
})

describe('evaluateDemoBillingReadiness', () => {
  it('blocks claim submission when verbal orders are unsigned', () => {
    const dataset = createDemoDataset()
    const claim = dataset.claims.find((item) => item.episode_id === 1)
    expect(claim).toBeDefined()

    const readiness = evaluateDemoBillingReadiness(claim!, dataset)

    expect(readiness.ready_to_bill).toBe(false)
    expect(readiness.blockers.join(' ')).toContain('verbal orders')
  })
})

describe('buildEvvQueueSections', () => {
  it('groups EVV records into needs fix, reconciliation, and reconciled sections', () => {
    const sections = buildEvvQueueSections(createDemoDataset())

    expect(sections.map((section) => section.key)).toEqual([
      'needs_fix',
      'ready_to_reconcile',
      'reconciled',
    ])
  })
})

describe('admission and order workflow helpers', () => {
  it('builds admission snapshots and documentation QA tasks from referral readiness gaps', () => {
    const dataset = createDemoDataset()
    const referral = {
      ...dataset.referrals[0],
      face_to_face_date: undefined,
      physician_orders_signed: false,
      physician_orders_signed_at: undefined,
      requested_disciplines: 'SN, PT',
    }

    const snapshot = buildAdmissionSnapshotFromReferral(referral)
    const tasks = buildDocumentationQaTasksForReferral(99, referral, 500, '2026-04-19')

    expect(snapshot.referral_source).toBe(referral.source_name)
    expect(snapshot.requested_disciplines).toEqual(['SN', 'PT'])
    expect(tasks.map((task) => task.task_type)).toEqual(['missing_face_to_face', 'missing_signed_orders'])
  })

  it('normalizes referral order status and creates generated physician orders', () => {
    const dataset = createDemoDataset()
    const episode = dataset.episodes[0]

    expect(normalizeDemoReferralOrderStatus('reviewed')).toBe('received')
    expect(normalizeDemoReferralOrderStatus('sent_for_signature')).toBe('sent_for_signature')
    expect(normalizeDemoReferralOrderStatus('anything')).toBe('draft')
    expect(normalizeDemoReferralOrderStatus('pending', true)).toBe('signed')
    expect(normalizeOrderStatus()).toBe('Not captured')
    expect(normalizeOrderStatus('pending_signature')).toBe('Pending Signature')

    const draft = buildDemoPhysicianOrderDraft(dataset, episode, 'plan_of_care')
    expect(draft.order_summary).toContain('Plan Of Care')
    expect(draft.order_note).toContain('current clinical chart')

    const created = buildDemoPhysicianOrder(dataset, episode, {
      order_scope: 'plan_of_care',
      order_status: 'sent_for_signature',
      signer_name: '',
      sent_at: '2026-04-19 10:00:00',
      received_at: '',
      signed_at: '',
      order_summary: '',
      order_note: '',
    }, null)

    expect(created.episode_id).toBe(episode.id)
    expect(created.version_number).toBeGreaterThan(0)
    expect(created.order_summary).toContain('Plan Of Care')

    const edited = buildDemoPhysicianOrder(dataset, episode, {
      order_scope: 'admission',
      order_status: 'signed',
      signer_name: 'Dr. Monroe',
      sent_at: '2026-04-19 10:00:00',
      received_at: '2026-04-19 11:00:00',
      signed_at: '2026-04-19 12:00:00',
      order_summary: 'Signed admission order.',
      order_note: 'Reviewed by physician.',
    }, dataset.physicianOrders[0].id)

    expect(edited.id).toBe(dataset.physicianOrders[0].id)
    expect(edited.order_status).toBe('signed')
    expect(edited.signer_name).toBe('Dr. Monroe')
  })
})

describe('billing and queue workflow helpers', () => {
  it('builds intake, claim status, denial, EVV, and billing follow-up sections', () => {
    const dataset = createDemoDataset()
    const intakeTasks = buildDocumentationQaTasksForReferral(1, {
      ...dataset.referrals[0],
      face_to_face_date: undefined,
      physician_orders_signed: false,
      physician_orders_signed_at: undefined,
    }, 800, dataset.episodes[0].cert_start_date)
    const intakeQueue = buildEpisodeIntakeQueue(dataset.episodes, dataset.referrals, intakeTasks)
    const claimQueue = buildClaimReadinessQueue(dataset)
    const claimLanes = buildClaimStatusLanes(claimQueue)
    const denialSections = buildDenialQueueSections(claimQueue)
    const evvSections = buildEvvQueueSections(dataset)
    const followUpSections = buildBillingFollowUpSections(dataset, claimQueue, denialSections, evvSections)

    expect(intakeQueue[0].blocker).toBe('face_to_face')
    expect(claimLanes.map((lane) => lane.key)).toEqual(['submitted', 'accepted', 'rework', 'paid'])
    expect(denialSections.map((section) => section.key)).toEqual(['needs_correction', 'ready_to_resubmit'])
    expect(followUpSections.map((section) => section.key)).toEqual(['claim_and_evv', 'claim_only', 'evv_only'])
    expect(followUpSections.flatMap((section) => section.items).length).toBeGreaterThan(0)
  })

  it('marks a clean active episode claim as ready to bill', () => {
    const dataset = createDemoDataset()
    const episode = {
      ...dataset.episodes[0],
      episode_status: 'active',
      pdgm_group_code: 'MMTA-CARDIO-E',
      primary_diagnosis: 'I50.32 Chronic diastolic heart failure',
      admission_readiness_snapshot: {
        admission_source: 'Hospital discharge',
        face_to_face_date: '2026-04-15',
        physician_orders_signed: true,
        physician_orders_signed_at: '2026-04-16 14:30:00',
      },
    }
    const assessment = {
      ...dataset.assessments[0],
      episode_id: episode.id,
      status: 'final',
      principal_diagnosis_code: 'I50.32',
      homebound_status: 'taxing_effort',
      homebound_narrative: 'Leaving home requires taxing effort.',
      medication_reconciliation_completed: true,
      clinical_summary: 'Stable cardiac status.',
      care_plan_goals: 'Improve endurance.',
    }
    const claim = { ...dataset.claims[0], episode_id: episode.id, hold_reason: undefined }
    const readiness = evaluateDemoBillingReadiness(claim, {
      ...dataset,
      episodes: [episode],
      assessments: [assessment],
      claims: [claim],
      physicianOrders: dataset.physicianOrders.map((order) => ({
        ...order,
        episode_id: episode.id,
        order_status: 'signed',
        signed_at: '2026-04-19 12:00:00',
      })),
      verbalOrders: [],
      visits: dataset.visits.map((visit) => ({
        ...visit,
        episode_id: episode.id,
        status: visit.status === 'completed' ? 'locked' : visit.status,
        documentation_status: 'locked',
      })),
    })

    expect(readiness.ready_to_bill).toBe(true)
    expect(readiness.primary_blocker).toBe('Billing is ready.')
  })
})

describe('workflow branch categories', () => {
  it('categorizes denial reasons and corrected-claim states', () => {
    const dataset = createDemoDataset()
    const episode = dataset.episodes[0]
    const makeClaimItem = (
      id: number,
      status: string,
      reason: string,
      readyToBill = false,
      correctedFrom?: number,
    ): ClaimReadinessItem => ({
      claim: {
        id,
        episode_id: episode.id,
        claim_type: 'final',
        status,
        rejection_reason: reason,
        corrected_from_claim_id: correctedFrom,
      },
      episode,
      patientName: episode.patient_name,
      badges: [],
      blockers: readyToBill ? [] : [reason],
      readyToBill,
      relatedOwners: [],
      relatedAssignees: [],
      escalationReasons: [],
      highestPriority: readyToBill ? 'low' : 'high',
      earliestDueAt: '2026-04-29 09:00:00',
    })

    const sections = buildDenialQueueSections([
      makeClaimItem(1, 'rejected', 'Diagnosis coding mismatch.'),
      makeClaimItem(2, 'rejected', 'Visit note documentation missing.'),
      makeClaimItem(3, 'rejected', 'EVV visit verification failed.'),
      makeClaimItem(4, 'rejected', 'Face-to-face intake coverage issue.'),
      makeClaimItem(5, 'voided', 'Physician order not signed.'),
      makeClaimItem(6, 'rejected', 'Payer member demographic mismatch.'),
      makeClaimItem(7, 'rejected', 'Something unusual happened.'),
      makeClaimItem(8, 'rejected', 'Corrected claim needed.'),
      makeClaimItem(9, 'draft', 'Ready corrected claim.', true, 8),
      makeClaimItem(10, 'rejected', 'Suppressed by submitted child.'),
      makeClaimItem(11, 'submitted', 'Already resubmitted.', true, 10),
    ])

    const needsCorrectionLabels = sections.find((section) => section.key === 'needs_correction')?.items.map((item) => item.categoryLabel)
    const readyToResubmit = sections.find((section) => section.key === 'ready_to_resubmit')?.items

    expect(needsCorrectionLabels).toEqual(expect.arrayContaining([
      'Coding',
      'Documentation',
      'EVV',
      'Intake',
      'Orders',
      'Payer/Admin',
      'General',
    ]))
    expect(readyToResubmit?.[0].workingClaim?.claim.id).toBe(9)
    expect(sections.flatMap((section) => section.items).some((item) => item.baseClaim.claim.id === 10)).toBe(false)
  })

  it('categorizes EVV exception reasons and missing visit fallbacks', () => {
    const dataset = createDemoDataset()
    const visit = dataset.visits[0]
    const sections = buildEvvQueueSections({
      ...dataset,
      evvRecords: [
        { id: 1, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'pending_submission', submission_reference: 'REF-1' },
        { id: 2, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'exception', exception_reason: 'GPS location mismatch' },
        { id: 3, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'exception', exception_reason: 'Late clock out duration issue' },
        { id: 4, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'exception', exception_reason: 'Patient signature missing' },
        { id: 5, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'exception', exception_reason: 'Vendor payload reference rejected' },
        { id: 6, visit_id: 999, state_code: 'GA', vendor_name: 'Tellus', status: 'exception' },
        { id: 7, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'submitted' },
        { id: 8, visit_id: visit.id, state_code: 'GA', vendor_name: 'Tellus', status: 'reconciled' },
      ],
    })

    const labels = sections.flatMap((section) => section.items.map((item) => item.categoryLabel))
    expect(labels).toEqual(expect.arrayContaining([
      'Submission pending',
      'Location mismatch',
      'Timing issue',
      'Attestation issue',
      'Vendor response',
      'General exception',
      'Awaiting reconciliation',
      'Reconciled',
    ]))
    expect(sections.flatMap((section) => section.items).find((item) => item.record.id === 6)?.patientName).toBe('Visit 999')
  })
})

describe('scheduling, role dashboard, and reporting helpers', () => {
  it('builds visit recommendations and week-one frequency plans', () => {
    const dataset = createDemoDataset()
    const episode = dataset.episodes[0]
    const snapshot = {
      ...buildAdmissionSnapshotFromReferral(dataset.referrals[0]),
      requested_disciplines: ['SN', 'PT', 'OT', 'ST', 'MSW', 'HHA', 'Dietitian'],
    }

    const recommendations = buildVisitRecommendations(episode, snapshot, [])
    const weekOnePlan = buildWeekOneFrequencyPlan(episode, snapshot, [])
    const postSocRecommendations = buildVisitRecommendations(episode, snapshot, [
      {
        ...dataset.visits[0],
        episode_id: episode.id,
        visit_type: 'soc',
        discipline: 'SN',
        status: 'completed',
      },
    ])

    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].targetDateTime).toContain('T')
    expect(postSocRecommendations.map((recommendation) => recommendation.visitType)).toEqual(expect.arrayContaining([
      'routine',
      'pt_eval',
      'ot_eval',
      'st_eval',
      'msw_assessment',
      'hha_routine',
      'dietitian_eval',
    ]))
    expect(weekOnePlan.length).toBeGreaterThanOrEqual(recommendations.length)
    expect(weekOnePlan[0].frequencyHint).toBeTruthy()
    expect(buildVisitRecommendations(episode, null, [])).toEqual([])
    expect(buildWeekOneFrequencyPlan(episode, null, [])).toEqual([])
  })

  it('builds episode insights, role dashboards, admin summaries, and documentation summaries', () => {
    const dataset = createDemoDataset()
    const claimQueue = buildClaimReadinessQueue(dataset)
    const intakeQueue = buildEpisodeIntakeQueue(dataset.episodes, dataset.referrals, dataset.qaTasks)

    const insight = buildDemoEpisodeInsights(dataset.episodes[0], dataset)
    expect(insight.episode_id).toBe(dataset.episodes[0].id)
    expect(insight.clinical_decision_support.length).toBeGreaterThan(0)

    const roles = ['Intake', 'Clinician', 'QA', 'Billing', 'Admin'] as const
    roles.forEach((role, index) => {
      const dashboard = buildRoleDashboardConfig({
        id: index + 1,
        full_name: role === 'QA' ? 'Quinn QA Reviewer' : `${role} User`,
        email: `${role.toLowerCase()}@example.test`,
        role,
      }, dataset, intakeQueue, claimQueue, 2)

      expect(dashboard.heading).toContain(role === 'Admin' ? 'Admin' : role)
      expect(dashboard.metrics.length).toBeGreaterThan(0)
    })

    const clinicalManagerDashboard = buildRoleDashboardConfig({
      id: 99,
      full_name: 'Clinical Manager',
      email: 'clinical@example.test',
      role: 'Clinical' as never,
    }, {
      ...dataset,
      visits: [],
    }, intakeQueue, claimQueue, 0)
    expect(clinicalManagerDashboard.heading).toBe('Clinical Worklist')

    const report = buildAdminReportSummary(dataset, 'all')
    expect(report.metrics.map((metric) => metric.label)).toContain('Episodes in window')
    expect(report.payerMix.length).toBeGreaterThan(0)

    expect(buildDocumentationSummary({
      visit_focus: 'Medication teaching',
      interventions: 'Reviewed Lasix timing',
      physician_contact_needed: true,
      next_visit_focus: 'Daily weights',
    })).toContain('Physician contact needed.')
  })
})
