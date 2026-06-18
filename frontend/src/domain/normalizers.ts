import { formatTaskAssignee } from './formatters'
import type {
  Assessment,
  AssessmentClinicalPayload,
  EpisodeAdmissionSnapshot,
  QaTask,
  QapiProject,
  Visit,
  VisitDocumentationPayload,
} from '../lib/types'

export function normalizeAdmissionSnapshot(
  snapshot?: EpisodeAdmissionSnapshot | string | null,
): EpisodeAdmissionSnapshot | null {
  if (!snapshot) {
    return null
  }

  if (typeof snapshot === 'string') {
    try {
      const parsed = JSON.parse(snapshot) as EpisodeAdmissionSnapshot
      return parsed
    } catch {
      return null
    }
  }

  return snapshot
}

export function normalizeDocumentationPayload(
  payload?: Visit['documentation_payload'],
): VisitDocumentationPayload | null {
  if (!payload) {
    return null
  }

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as VisitDocumentationPayload
    } catch {
      return null
    }
  }

  return payload as VisitDocumentationPayload
}

export function normalizeQapiProjects(projects: QapiProject[]) {
  return projects.map((project) => ({
    ...project,
    linked_task_ids: Array.isArray(project.linked_task_ids)
      ? project.linked_task_ids
      : typeof project.linked_task_ids === 'string' && project.linked_task_ids.trim() !== ''
        ? safeParseNumericArray(project.linked_task_ids)
        : [],
    linked_audit_event_ids: Array.isArray(project.linked_audit_event_ids)
      ? project.linked_audit_event_ids
      : typeof project.linked_audit_event_ids === 'string' && project.linked_audit_event_ids.trim() !== ''
        ? safeParseNumericArray(project.linked_audit_event_ids)
        : [],
  }))
}

function safeParseNumericArray(value: string) {
  try {
    const parsed = JSON.parse(value) as number[]
    return Array.isArray(parsed) ? parsed.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry)) : []
  } catch {
    return []
  }
}

export function normalizeAssessmentAnswers(value?: Assessment['answers'] | string | null) {
  if (!value) {
    return {}
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as Record<string, string>
      return typeof parsed === 'object' && parsed !== null ? parsed : {}
    } catch {
      return {}
    }
  }

  return value
}

export function normalizeAssessmentPayload(value?: Assessment['assessment_payload'] | string | null) {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as AssessmentClinicalPayload
      return typeof parsed === 'object' && parsed !== null ? parsed : null
    } catch {
      return null
    }
  }

  return value
}

export function normalizeQaTasksForUi(tasks: QaTask[]) {
  return tasks
    .map((task) => enrichQaTaskForUi(task))
    .sort((left, right) => compareQaTaskUrgency(left, right))
}

function enrichQaTaskForUi(task: QaTask): QaTask {
  const dueAt = normalizeDateTimeString(task.due_at)
  const basePriority = (task.base_priority ?? task.priority ?? 'medium').toLowerCase()
  const today = currentDateInputValue()
  const now = normalizeDateTimeString(currentDateTimeInputValue()) ?? '9999-12-31 23:59:59'
  let priority = basePriority
  let escalationStatus = dueAt ? 'upcoming' : 'undated'
  let escalationReason = task.escalation_reason
  let isOverdue = false

  if (dueAt) {
    const dueDate = dueAt.slice(0, 10)
    if (task.status === 'open' && dueAt < now) {
      isOverdue = true
      priority = 'high'
      escalationStatus = task.assigned_user_name || task.assigned_role ? 'overdue_assigned' : 'overdue_unassigned'
      escalationReason =
        escalationReason ??
        (task.assigned_user_name || task.assigned_role
          ? `${formatTaskAssignee(task)} owns overdue follow-up that should move immediately.`
          : 'This overdue task needs an owner immediately.')
    } else if (dueDate === today) {
      escalationStatus = 'due_today'
      priority = basePriority === 'low' ? 'medium' : basePriority
      escalationReason =
        escalationReason ??
        (task.assigned_user_name || task.assigned_role
          ? `${formatTaskAssignee(task)} has work due today that should stay near the top of the queue.`
          : 'This task is due today and should stay visible.')
    } else {
      escalationReason = undefined
    }
  } else {
    escalationReason = undefined
  }

  return {
    ...task,
    base_priority: basePriority,
    priority,
    due_at: dueAt,
    assignment_history: normalizeQaTaskHistory(task.assignment_history),
    escalation_status: escalationStatus,
    escalation_reason: escalationReason,
    is_overdue: isOverdue,
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

export function normalizeDateTimeString(value?: string) {
  if (!value) {
    return undefined
  }

  return value.replace('T', ' ').slice(0, 19)
}

export function normalizeQaTaskHistory(history?: Array<Record<string, string>> | string) {
  if (Array.isArray(history)) {
    return history
  }
  if (typeof history !== 'string' || history.trim() === '') {
    return []
  }

  try {
    const decoded = JSON.parse(history) as Array<Record<string, string>>
    return Array.isArray(decoded) ? decoded : []
  } catch {
    return []
  }
}

function toDateTimeInputValue(value: string) {
  return value.replace(' ', 'T').slice(0, 16)
}

function currentDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function currentDateTimeInputValue() {
  return toDateTimeInputValue(new Date().toISOString().slice(0, 19).replace('T', ' '))
}
