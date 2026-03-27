import { create } from 'zustand'
import type { OrderItem, OrderType, PaymentMethod } from '../types/order'
import { calculateTotals } from '../lib/billing'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useTablesStore } from '../stores/useTablesStore'

interface OrderState {
    items: OrderItem[]
    orderType: OrderType | null
    tableNumber: string
    sessionId: string | null
    platformOrderId: string
    note: string
    activeOrderId: string | null
    billNumber: string | null

    // Actions
    addItem: (item: { id: string; name: string; price: number }, quantity?: number) => void
    decrementItem: (menuItemId: string) => void
    setItemPreference: (menuItemId: string, pref: string) => void
    setItems: (items: OrderItem[]) => void
    setOrderType: (type: OrderType) => void
    setTableNumber: (table: string) => void
    setSessionId: (id: string | null) => void
    setPlatformOrderId: (id: string) => void
    setNote: (note: string) => void
    loadOrder: (order: any) => void
    clearOrder: () => void

    // Derived (computed on access)
    getSubtotal: () => number
    getCgst: () => number
    getSgst: () => number
    getGrandTotal: () => number
    getPackingCharge: () => number

    // Finalise helper
    buildFinalPayload: (paymentMethod: PaymentMethod) => {
        items: OrderItem[]
        orderType: OrderType
        tableNumber: string
        platformOrderId: string
        note: string
        paymentMethod: PaymentMethod
        subtotal: number
        cgst: number
        sgst: number
        packingCharge: number
        grandTotal: number
    } | null
    buildKitchenPayload: () => {
        itemsToCook: OrderItem[]
        orderType: OrderType
        tableNumber: string
        platformOrderId: string
        note: string
        paymentMethod: PaymentMethod
        subtotal: number
        cgst: number
        sgst: number
        packingCharge: number
        grandTotal: number
    } | null
    markItemsAsSent: () => void
}

const defaultState = {
    items: [] as OrderItem[],
    orderType: null as OrderType | null,
    tableNumber: '',
    sessionId: null as string | null,
    platformOrderId: '',
    note: '',
    activeOrderId: null as string | null,
    billNumber: null as string | null,
}

const syncToTable = (get: any) => {
    const { orderType, sessionId, items } = get()
    if (orderType === 'dine-in' && sessionId) {
        useTablesStore.getState().updateSessionItems(sessionId, items)
    }
}

export const useOrderStore = create<OrderState>()((set, get) => ({
    ...defaultState,

    addItem: (item, quantity = 1) => {
        set((state) => {
            const existing = state.items.find(i => i.menuItemId === item.id)
            if (existing) {
                return {
                    items: state.items.map(i =>
                        i.menuItemId === item.id
                            ? { ...i, quantity: i.quantity + quantity }
                            : i
                    ),
                }
            }
            return {
                items: [
                    ...state.items,
                    { menuItemId: item.id, name: item.name, price: item.price, quantity: quantity, quantitySent: 0 },
                ],
            }
        })
        syncToTable(get)
    },

    decrementItem: (menuItemId) => {
        set((state) => {
            const existing = state.items.find(i => i.menuItemId === menuItemId)
            if (!existing) return state
            if (existing.quantity <= 1) {
                return { items: state.items.filter(i => i.menuItemId !== menuItemId) }
            }
            return {
                items: state.items.map(i =>
                    i.menuItemId === menuItemId
                        ? { ...i, quantity: i.quantity - 1 }
                        : i
                ),
            }
        })
        syncToTable(get)
    },

    setItemPreference: (menuItemId, pref) => {
        set((state) => ({
            items: state.items.map(i =>
                i.menuItemId === menuItemId
                    ? { ...i, preferences: pref }
                    : i
            ),
        }))
        syncToTable(get)
    },

    setItems: (items) => {
        set({ items })
        syncToTable(get)
    },

    setOrderType: (type) => set({ orderType: type }),
    setTableNumber: (table) => set({ tableNumber: table }),
    setSessionId: (id) => set({ sessionId: id }),
    setPlatformOrderId: (id) => set({ platformOrderId: id }),
    setNote: (note) => set({ note }),
    loadOrder: (order) => {
        set({
            items: order.items,
            orderType: order.orderType,
            tableNumber: order.tableNumber,
            sessionId: order.sessionId || null,
            platformOrderId: order.platformOrderId,
            note: order.note || '',
            activeOrderId: order.id,
            billNumber: order.billNumber
        })
    },

    clearOrder: () => {
        set({ ...defaultState })
        syncToTable(get)
    },

    getSubtotal: () => {
        const { items } = get()
        return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },

    getCgst: () => {
        const { cgstPercent } = useSettingsStore.getState().settings
        const subtotal = get().getSubtotal()
        return Math.round(subtotal * (cgstPercent / 100) * 100) / 100
    },

    getSgst: () => {
        const { sgstPercent } = useSettingsStore.getState().settings
        const subtotal = get().getSubtotal()
        return Math.round(subtotal * (sgstPercent / 100) * 100) / 100
    },

    getPackingCharge: () => {
        const { orderType, items } = get()
        if (orderType !== 'takeaway') return 0
        const { packingChargePerItem } = useSettingsStore.getState().settings
        const count = items.reduce((sum, i) => sum + i.quantity, 0)
        return count * packingChargePerItem
    },

    getGrandTotal: () => {
        const subtotal = get().getSubtotal()
        const cgst = get().getCgst()
        const sgst = get().getSgst()
        const packing = get().getPackingCharge()
        return Math.round((subtotal + cgst + sgst + packing) * 100) / 100
    },

    buildFinalPayload: (paymentMethod) => {
        const { items, orderType, tableNumber, platformOrderId, note } = get()
        if (items.length === 0 || !orderType) return null

        const { cgstPercent, sgstPercent, packingChargePerItem } = useSettingsStore.getState().settings
        const { subtotal, cgst, sgst, packingCharge, grandTotal } = calculateTotals(
            items,
            cgstPercent,
            sgstPercent,
            packingChargePerItem,
            orderType
        )

        return {
            items,
            orderType,
            tableNumber,
            platformOrderId,
            note,
            paymentMethod,
            subtotal,
            cgst,
            sgst,
            packingCharge,
            grandTotal,
        }
    },
    buildKitchenPayload: () => {
        const { items, orderType, tableNumber, platformOrderId, note } = get()
        if (!orderType) return null

        const itemsToCook = items
            .map(i => ({
                ...i,
                quantity: i.quantity - (i.quantitySent || 0)
            }))
            .filter(i => i.quantity > 0)

        if (itemsToCook.length === 0) return null

        // Calculate totals for this sub-ticket to satisfy Order interface/rules
        const { cgstPercent, sgstPercent, packingChargePerItem } = useSettingsStore.getState().settings
        const totals = calculateTotals(
            itemsToCook,
            cgstPercent,
            sgstPercent,
            packingChargePerItem,
            orderType
        )

        return {
            itemsToCook,
            orderType,
            tableNumber,
            platformOrderId,
            note,
            paymentMethod: 'cash' as PaymentMethod, // Defaults for kitchen ticket
            ...totals
        }
    },

    markItemsAsSent: () => {
        set((state) => ({
            items: state.items.map(i => ({
                ...i,
                quantitySent: i.quantity
            }))
        }))
        syncToTable(get)
    },
}))
