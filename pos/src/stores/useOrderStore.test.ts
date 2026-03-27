import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock firebase to avoid real initialization in tests
vi.mock('../lib/firebase', () => ({
    db: {},
    auth: {},
    RESTAURANT_ID: 'test-restaurant',
}))

import { useOrderStore } from '../stores/useOrderStore'

// Reset store state between tests
beforeEach(() => {
    useOrderStore.setState({
        items: [],
        orderType: null,
        tableNumber: '',
        platformOrderId: '',
        note: '',
    })
})

describe('useOrderStore', () => {
    it('adds item with quantity 1', () => {
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        const { items } = useOrderStore.getState()
        expect(items).toHaveLength(1)
        expect(items[0]?.quantity).toBe(1)
    })

    it('increments quantity on duplicate add', () => {
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        const { items } = useOrderStore.getState()
        expect(items).toHaveLength(1)
        expect(items[0]?.quantity).toBe(2)
    })

    it('decrements quantity', () => {
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        useOrderStore.getState().decrementItem('a')
        const { items } = useOrderStore.getState()
        expect(items[0]?.quantity).toBe(1)
    })

    it('removes item when quantity reaches 0', () => {
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        useOrderStore.getState().decrementItem('a')
        const { items } = useOrderStore.getState()
        expect(items).toHaveLength(0)
    })

    it('clears order completely', () => {
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        useOrderStore.getState().setOrderType('dine-in')
        useOrderStore.getState().clearOrder()
        const state = useOrderStore.getState()
        expect(state.items).toHaveLength(0)
        expect(state.orderType).toBeNull()
    })

    it('order type selection is mutually exclusive', () => {
        useOrderStore.getState().setOrderType('dine-in')
        useOrderStore.getState().setOrderType('takeaway')
        expect(useOrderStore.getState().orderType).toBe('takeaway')
    })

    it('buildFinalPayload returns null when no items', () => {
        useOrderStore.getState().setOrderType('dine-in')
        const result = useOrderStore.getState().buildFinalPayload('cash')
        expect(result).toBeNull()
    })

    it('buildFinalPayload returns null when no order type', () => {
        useOrderStore.getState().addItem({ id: 'a', name: 'Biryani', price: 150 })
        const result = useOrderStore.getState().buildFinalPayload('cash')
        expect(result).toBeNull()
    })
})
