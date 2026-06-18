import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeAdmissionSnapshot,
  normalizeAssessmentAnswers,
  normalizeQaTasksForUi,
} from './normalizers'

describe('normalizers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses an admission snapshot JSON string with referral source and requested disciplines', () => {
    const snapshot = normalizeAdmissionSnapshot(
      JSON.stringify({
        referral_source: 'Northside Hospital',
        requested_disciplines: ['SN', 'PT'],
      }),
    )

    expect(snapshot).toEqual({
      referral_source: 'Northside Hospital',
      requested_disciplines: ['SN', 'PT'],
    })
  })

  it('returns null for an invalid admission snapshot JSON string', () => {
    expect(normalizeAdmissionSnapshot('not-json')).toBeNull()
  })

  it('parses assessment answers JSON strings', () => {
    expect(normalizeAssessmentAnswers('{"M0110":"1"}')).toEqual({ M0110: '1' })
  })

  it('sets base priority and overdue state for open tasks due before the current time', () => {
    vi.setSystemTime(new Date('2026-04-29T12:00:00Z'))

    const [task] = normalizeQaTasksForUi([
      {
        id: 1,
        episode_id: 1,
        task_type: 'order_followup',
        title: 'Order follow-up',
        status: 'open',
        priority: 'medium',
        due_at: '2026-04-29T11:59:00',
      },
    ])

    expect(task.base_priority).toBe('medium')
    expect(task.is_overdue).toBe(true)
  })
})
