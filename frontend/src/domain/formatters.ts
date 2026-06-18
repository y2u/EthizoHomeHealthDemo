import type { EpisodeAdmissionSnapshot, Patient, QaTask } from '../lib/types'

export function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) {
    return digits
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function formatStateCode(value: string) {
  return value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2)
}

export function formatZipCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function labelizeValue(value: string) {
  if (!value || value.trim() === '') {
    return 'Not set'
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function formatCurrency(value: number | string) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numericValue)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue)
}

export function formatAddress(patient: Partial<Patient>) {
  const cityState = [patient.city, patient.state].filter(Boolean).join(', ')
  const cityStateZip = [cityState, patient.postal_code].filter(Boolean).join(' ')
  return [patient.address1, patient.address2, cityStateZip].filter(Boolean).join(' · ') || 'Not set'
}

export function formatCoverage(patient: Partial<Patient>) {
  return [patient.payer_type, patient.insurance_member_id || patient.medicare_number].filter(Boolean).join(' · ') || 'Not set'
}

export function formatContact(name?: string, relationship?: string, phone?: string) {
  const identity = [name, relationship].filter(Boolean).join(' · ')
  return [identity, phone].filter(Boolean).join(' · ')
}

export function formatNamePhone(name?: string, phone?: string) {
  return [name, phone].filter(Boolean).join(' · ') || 'Not captured'
}

export function formatPatientContacts(patient: Partial<Patient>) {
  const primary = patient.phone ? `Primary ${patient.phone}` : ''
  const emergency = formatContact(patient.emergency_contact_name, patient.emergency_contact_relationship, patient.emergency_contact_phone)
  const responsible = formatContact(
    patient.responsible_party_name,
    patient.responsible_party_relationship,
    patient.responsible_party_phone,
  )

  return [primary, emergency && `Emergency ${emergency}`, responsible && `Responsible ${responsible}`].filter(Boolean).join(' / ') || 'Not set'
}

export function formatServiceLocation(snapshot?: EpisodeAdmissionSnapshot | null) {
  if (!snapshot) {
    return 'Not captured'
  }

  const cityState = [snapshot.service_city, snapshot.service_state].filter(Boolean).join(', ')
  const cityStateZip = [cityState, snapshot.service_postal_code].filter(Boolean).join(' ')

  return [snapshot.service_location_type, snapshot.service_address1, cityStateZip].filter(Boolean).join(' · ') || 'Not captured'
}

export function formatDueAt(value?: string) {
  if (!value) {
    return 'No due date'
  }

  return `Due ${value.replace('T', ' ')}`
}

export function formatTaskAssignee(task: Pick<QaTask, 'assigned_role' | 'assigned_user_name'>) {
  if (task.assigned_user_name && task.assigned_role) {
    return `${task.assigned_user_name} (${task.assigned_role})`
  }
  if (task.assigned_user_name) {
    return task.assigned_user_name
  }
  if (task.assigned_role) {
    return task.assigned_role
  }

  return 'Unassigned'
}

export function formatFileSize(value?: number) {
  if (!value || value <= 0) {
    return '0 B'
  }
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
