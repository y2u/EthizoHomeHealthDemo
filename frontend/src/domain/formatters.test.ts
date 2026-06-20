import { describe, expect, it } from 'vitest'
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
} from './formatters'

describe('formatUsPhone', () => {
  it('keeps three or fewer digits unwrapped', () => {
    expect(formatUsPhone('40')).toBe('40')
  })

  it('formats a complete US phone number', () => {
    expect(formatUsPhone('4045550101')).toBe('(404) 555-0101')
  })

  it('formats a partial US phone number', () => {
    expect(formatUsPhone('40455')).toBe('(404) 55')
  })
})

describe('formatZipCode', () => {
  it('strips non-digits before formatting', () => {
    expect(formatZipCode('GA 30309')).toBe('30309')
  })

  it('formats a ZIP+4 code', () => {
    expect(formatZipCode('303091234')).toBe('30309-1234')
  })

  it('keeps a five-digit ZIP code unchanged', () => {
    expect(formatZipCode('30309')).toBe('30309')
  })
})

describe('formatCurrency', () => {
  it('formats a number as US currency with grouping', () => {
    expect(formatCurrency(1250)).toBe('$1,250.00')
  })

  it('formats a numeric string as US currency', () => {
    expect(formatCurrency('250.5')).toBe('$250.50')
  })

  it('falls back to zero currency for invalid input', () => {
    expect(formatCurrency('bad')).toBe('$0.00')
  })
})

describe('labelizeValue', () => {
  it('returns Not set for blank values', () => {
    expect(labelizeValue('')).toBe('Not set')
    expect(labelizeValue('   ')).toBe('Not set')
  })

  it('converts snake case into title case words', () => {
    expect(labelizeValue('sent_for_signature')).toBe('Sent For Signature')
  })
})

describe('patient and task formatters', () => {
  it('normalizes state codes, addresses, coverage, and patient contacts', () => {
    expect(formatStateCode('g-a')).toBe('GA')
    expect(formatAddress({
      address1: '125 Peachtree View',
      address2: 'Apt 2',
      city: 'Atlanta',
      state: 'GA',
      postal_code: '30309',
    })).toBe('125 Peachtree View · Apt 2 · Atlanta, GA 30309')
    expect(formatAddress({})).toBe('Not set')
    expect(formatCoverage({ payer_type: 'Medicare', medicare_number: '1EG4TE5MK73' })).toBe('Medicare · 1EG4TE5MK73')
    expect(formatCoverage({})).toBe('Not set')
    expect(formatPatientContacts({
      phone: '404-555-0101',
      emergency_contact_name: 'Sam Bishop',
      emergency_contact_relationship: 'Spouse',
      emergency_contact_phone: '404-555-0110',
      responsible_party_name: 'Avery Bishop',
      responsible_party_relationship: 'Daughter',
      responsible_party_phone: '404-555-0111',
    })).toContain('Emergency Sam Bishop')
    expect(formatPatientContacts({})).toBe('Not set')
  })

  it('formats optional contact, location, due date, assignee, and file-size fallbacks', () => {
    expect(formatContact('Sam Bishop', 'Spouse', '404-555-0110')).toBe('Sam Bishop · Spouse · 404-555-0110')
    expect(formatNamePhone()).toBe('Not captured')
    expect(formatNamePhone('Nina Clinician', '404-555-0177')).toBe('Nina Clinician · 404-555-0177')
    expect(formatServiceLocation()).toBe('Not captured')
    expect(formatServiceLocation({
      service_location_type: 'Patient home',
      service_address1: '125 Peachtree View',
      service_city: 'Atlanta',
      service_state: 'GA',
      service_postal_code: '30309',
    })).toBe('Patient home · 125 Peachtree View · Atlanta, GA 30309')
    expect(formatDueAt()).toBe('No due date')
    expect(formatDueAt('2026-04-29T11:30:00')).toBe('Due 2026-04-29 11:30:00')
    expect(formatTaskAssignee({ assigned_role: 'QA', assigned_user_name: 'Quinn QA Reviewer' })).toBe('Quinn QA Reviewer (QA)')
    expect(formatTaskAssignee({ assigned_role: 'QA' })).toBe('QA')
    expect(formatTaskAssignee({ assigned_user_name: 'Quinn QA Reviewer' })).toBe('Quinn QA Reviewer')
    expect(formatTaskAssignee({})).toBe('Unassigned')
    expect(formatFileSize()).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})
