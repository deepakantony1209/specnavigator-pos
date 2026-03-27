import { doc, runTransaction } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from './firebase'
import type { Order } from '../types/order'

export async function generateBillNumber(restaurantId: string): Promise<string> {
    const today = format(new Date(), 'yyyyMMdd')
    const counterRef = doc(db, `restaurants/${restaurantId}/counters/${today}`)

    return runTransaction(db, async (transaction) => {
        const counter = await transaction.get(counterRef)
        const next = counter.exists() ? (counter.data()['count'] as number) + 1 : 1
        transaction.set(counterRef, { count: next })
        return `${today}-${String(next).padStart(3, '0')}`
    })
}

export interface TaxResult {
    subtotal: number
    cgst: number
    sgst: number
    packingCharge: number
    grandTotal: number
}

export function calculateTotals(
    items: Array<{ price: number; quantity: number }>,
    cgstPercent: number,
    sgstPercent: number,
    packingChargePerItem: number,
    orderType: string
): TaxResult {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const packingCharge = orderType === 'takeaway' ? count * packingChargePerItem : 0

    const cgst = Math.round(subtotal * (cgstPercent / 100) * 100) / 100
    const sgst = Math.round(subtotal * (sgstPercent / 100) * 100) / 100
    const grandTotal = Math.round((subtotal + cgst + sgst + packingCharge) * 100) / 100

    return { subtotal, cgst, sgst, packingCharge, grandTotal }
}

export function formatAmount(amount: number): string {
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

export function toJSDate(date: any): Date {
    if (!date) return new Date()
    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') return date.toDate()
    // Handle seconds/nanoseconds object
    if (typeof date.seconds === 'number') return new Date(date.seconds * 1000)
    // Handle string or number
    return new Date(date)
}

export async function updateDailySummary(restaurantId: string, order: Order): Promise<void> {
    const orderDate = toJSDate(order.createdAt)
    const today = format(orderDate, 'yyyyMMdd')
    const summaryRef = doc(db, `restaurants/${restaurantId}/dailySummaries/${today}`)

    await runTransaction(db, async (transaction) => {
        const summary = await transaction.get(summaryRef)
        const base = summary.exists()
            ? summary.data()
            : {
                totalOrders: 0,
                totalRevenue: 0,
                totalCgst: 0,
                totalSgst: 0,
                byOrderType: { 'dine-in': 0, takeaway: 0, swiggy: 0, zomato: 0 },
                byPaymentMethod: { cash: 0, upi: 0, card: 0 },
            }

        const byOrderType = base['byOrderType'] as Record<string, number>
        const byPaymentMethod = base['byPaymentMethod'] as Record<string, number>

        transaction.set(summaryRef, {
            ...base,
            totalOrders: (base['totalOrders'] as number) + 1,
            totalRevenue: (base['totalRevenue'] as number) + order.grandTotal,
            totalCgst: (base['totalCgst'] as number) + order.cgst,
            totalSgst: (base['totalSgst'] as number) + order.sgst,
            byOrderType: {
                ...byOrderType,
                [order.orderType]: (byOrderType[order.orderType] ?? 0) + order.grandTotal,
            },
            byPaymentMethod: {
                ...byPaymentMethod,
                [order.paymentMethod]: (byPaymentMethod[order.paymentMethod] ?? 0) + order.grandTotal,
            },
            updatedAt: new Date(),
        })
    })
}
