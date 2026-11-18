import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  initials,
  relativeTime,
} from './format'

describe('initials', () => {
  it('uses the first two letters for a single word', () => {
    expect(initials('alice')).toBe('AL')
  })

  it('uses the first letter of the first two parts', () => {
    expect(initials('ada lovelace')).toBe('AL')
    expect(initials('grace_hopper')).toBe('GH')
    expect(initials('alan-m-turing')).toBe('AM')
  })

  it('handles blank input without throwing', () => {
    expect(initials('   ')).toBe('?')
  })
})

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(12345)).toMatch(/12[,.\s]345/)
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('date helpers', () => {
  it('renders an em dash for missing or invalid dates', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(relativeTime(null)).toBe('—')
  })

  it('formats a valid ISO date with the year', () => {
    expect(formatDate('2024-03-05T10:00:00.000Z')).toMatch(/2024/)
  })

  it('produces a relative string for recent timestamps', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(recent)).toMatch(/minute/)
  })
})

describe('formatDuration', () => {
  it('uses milliseconds below one second', () => {
    expect(formatDuration(250)).toBe('250 ms')
  })

  it('uses seconds with two decimals above one second', () => {
    expect(formatDuration(1500)).toBe('1.50 s')
  })

  it('renders an em dash when unknown', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(undefined)).toBe('—')
  })
})

describe('formatBytes', () => {
  it('keeps bytes below one kibibyte', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('uses kilobytes with one decimal', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
})
