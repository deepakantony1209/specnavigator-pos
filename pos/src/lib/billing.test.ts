import { describe, it, expect, vi } from 'vitest'
import { calculateTotals, formatAmount } from '../lib/billing'

// Mock firebase so generateBillNumber doesn't need a live db
vi.mock('../lib/firebase', () => ({
    db: {},
    RESTAURANT_ID: 'test-restaurant',
}))

describe('calculateTotals', () => {
    it('calculates subtotal correctly from items', () => {
        const items = [{ price: 100, quantity: 2 }, { price: 50, quantity: 1 }]
        const { subtotal } = calculateTotals(items, 0, 0)
        expect(subtotal).toBe(250)
    })

    it('calculates CGST as percentage of subtotal', () => {
        const items = [{ price: 100, quantity: 1 }]
        const { cgst } = calculateTotals(items, 2.5, 0)
        expect(cgst).toBe(2.5)
    })

    it('calculates SGST as percentage of subtotal', () => {
        const items = [{ price: 100, quantity: 1 }]
        const { sgst } = calculateTotals(items, 0, 2.5)
        expect(sgst).toBe(2.5)
    })

    it('grand total equals subtotal + cgst + sgst', () => {
        const items = [{ price: 200, quantity: 1 }]
        const { subtotal, cgst, sgst, grandTotal } = calculateTotals(items, 2.5, 2.5)
        expect(grandTotal).toBe(subtotal + cgst + sgst)
    })

    it('handles zero tax rates', () => {
        const items = [{ price: 100, quantity: 3 }]
        const { cgst, sgst, grandTotal, subtotal } = calculateTotals(items, 0, 0)
        expect(cgst).toBe(0)
        expect(sgst).toBe(0)
        expect(grandTotal).toBe(subtotal)
    })

    it('handles decimal prices without floating point errors', () => {
        const items = [{ price: 33.33, quantity: 3 }]
        const { subtotal } = calculateTotals(items, 0, 0)
        // 33.33 * 3 = 99.99 not 99.990...01
        expect(subtotal).toBe(99.99)
    })
})

describe('formatAmount', () => {
    it('formats to 2 decimal places', () => {
        expect(formatAmount(100)).toContain('100.00')
    })

    it('formats Indian locale style', () => {
        const fmt = formatAmount(1000)
        expect(fmt).toContain('1,000.00')
    })
})
