import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeAdmissionSnapshot,
  normalizeAssessmentAnswers,
  normalizeAssessmentPayload,
  normalizeDateTimeString,
  normalizeDocumentationPayload,
  normalizeQaTaskHistory,
  normalizeQaTasksForUi,
  normalizeQapiProjects,
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
    expect(normalizeAssessmentAnswers('bad-json')).toEqual({})
    expect(normalizeAssessmentAnswers(null)).toEqual({})
    expect(normalizeAssessmentAnswers({ M0110: '1' })).toEqual({ M0110: '1' })
  })

  it('parses assessment and visit documentation payloads defensively', () => {
    expect(normalizeAssessmentPayload('{"risk_notes":"high"}')).toEqual({ risk_notes: 'high' })
    expect(normalizeAssessmentPayload('"not-object"')).toBeNull()
    expect(normalizeAssessmentPayload('bad-json')).toBeNull()
    expect(normalizeAssessmentPayload({ risk_notes: 'medium' })).toEqual({ risk_notes: 'medium' })
    expect(normalizeDocumentationPayload('{"visit_focus":"Medication teaching"}')).toEqual({ visit_focus: 'Medication teaching' })
    expect(normalizeDocumentationPayload('bad-json')).toBeNull()
    expect(normalizeDocumentationPayload({ visit_focus: 'Safety' })).toEqual({ visit_focus: 'Safety' })
    expect(normalizeDocumentationPayload()).toBeNull()
  })

  it('normalizes QAPI link arrays from JSON, arrays, empty strings, and bad values', () => {
    const [fromStrings, fromArrays, fromBadJson] = normalizeQapiProjects([
      {
        id: 1,
        title: 'Falls',
        measure_name: 'Falls',
        owner_name: 'Quinn',
        target_value: 'Reduce falls',
        review_cadence: 'Monthly',
        status: 'active',
        intervention_plan: 'Teaching',
        linked_task_ids: '[1,"2","bad"]',
        linked_audit_event_ids: '[3]',
      },
      {
        id: 2,
        title: 'Orders',
        measure_name: 'Orders',
        owner_name: 'Nina',
        target_value: 'Sign faster',
        review_cadence: 'Weekly',
        status: 'active',
        intervention_plan: 'Escalation',
        linked_task_ids: [4],
        linked_audit_event_ids: [5],
      },
      {
        id: 3,
        title: 'EVV',
        measure_name: 'EVV',
        owner_name: 'Bianca',
        target_value: 'Clean exceptions',
        review_cadence: 'Weekly',
        status: 'active',
        intervention_plan: 'Review',
        linked_task_ids: 'not-json',
        linked_audit_event_ids: '',
      },
    ])

    expect(fromStrings.linked_task_ids).toEqual([1, 2])
    expect(fromStrings.linked_audit_event_ids).toEqual([3])
    expect(fromArrays.linked_task_ids).toEqual([4])
    expect(fromArrays.linked_audit_event_ids).toEqual([5])
    expect(fromBadJson.linked_task_ids).toEqual([])
    expect(fromBadJson.linked_audit_event_ids).toEqual([])
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

  it('promotes due-today low-priority tasks and sorts by urgency', () => {
    vi.setSystemTime(new Date('2026-04-29T12:00:00Z'))

    const [overdue, dueToday, undated] = normalizeQaTasksForUi([
      {
        id: 1,
        episode_id: 1,
        task_type: 'order_followup',
        title: 'Undated',
        status: 'open',
        priority: 'low',
      },
      {
        id: 2,
        episode_id: 1,
        task_type: 'order_followup',
        title: 'Due today',
        status: 'open',
        priority: 'low',
        assigned_role: 'QA',
        due_at: '2026-04-29T15:00:00',
      },
      {
        id: 3,
        episode_id: 1,
        task_type: 'order_followup',
        title: 'Overdue',
        status: 'open',
        priority: 'medium',
        due_at: '2026-04-28T15:00:00',
      },
    ])

    expect(overdue.title).toBe('Overdue')
    expect(overdue.escalation_status).toBe('overdue_unassigned')
    expect(dueToday.title).toBe('Due today')
    expect(dueToday.priority).toBe('medium')
    expect(dueToday.escalation_status).toBe('due_today')
    expect(undated.title).toBe('Undated')
    expect(undated.escalation_status).toBe('undated')
  })

  it('does not mark completed past-due tasks as overdue', () => {
    vi.setSystemTime(new Date('2026-04-29T12:00:00Z'))

    const [task] = normalizeQaTasksForUi([
      {
        id: 2,
        episode_id: 1,
        task_type: 'order_followup',
        title: 'Completed order follow-up',
        status: 'completed',
        priority: 'medium',
        due_at: '2026-04-29T11:59:00',
      },
    ])

    expect(task.is_overdue).toBe(false)
  })

  it('normalizes datetime strings and assignment history values', () => {
    expect(normalizeDateTimeString()).toBeUndefined()
    expect(normalizeDateTimeString('2026-04-29T11:30:45.000Z')).toBe('2026-04-29 11:30:45')
    expect(normalizeQaTaskHistory([{ action: 'assigned' }])).toEqual([{ action: 'assigned' }])
    expect(normalizeQaTaskHistory('[{"action":"assigned"}]')).toEqual([{ action: 'assigned' }])
    expect(normalizeQaTaskHistory('{"action":"assigned"}')).toEqual([])
    expect(normalizeQaTaskHistory('bad-json')).toEqual([])
    expect(normalizeQaTaskHistory('')).toEqual([])
  })
})
