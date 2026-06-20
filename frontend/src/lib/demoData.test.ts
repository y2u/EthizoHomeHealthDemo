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
