import { describe, expect, it } from 'vitest'
import { formatCurrency, formatUsPhone, formatZipCode, labelizeValue } from './formatters'

describe('formatUsPhone', () => {
  it('formats a complete US phone number', () => {
    expect(formatUsPhone('4045550101')).toBe('(404) 555-0101')
  })

  it('formats a partial US phone number', () => {
    expect(formatUsPhone('40455')).toBe('(404) 55')
  })
})

describe('formatZipCode', () => {
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
  it('converts snake case into title case words', () => {
    expect(labelizeValue('sent_for_signature')).toBe('Sent For Signature')
  })
})
