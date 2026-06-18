import { describe, expect, it } from 'vitest'
import { createDemoDataset } from '../lib/demoData'
import {
  buildClaimReadinessQueue,
  buildDemoEpisodeReviewSummary,
  buildEvvQueueSections,
  computeDemoReadiness,
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
