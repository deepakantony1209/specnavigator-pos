import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cashier } from '../types/cashier'

interface AuthState {
    cashier: Cashier | null
    isAuthenticated: boolean
    login: (cashier: Cashier) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            cashier: null,
            isAuthenticated: false,
            login: (cashier) => set({ cashier, isAuthenticated: true }),
            logout: () => set({ cashier: null, isAuthenticated: false }),
        }),
        { name: 'auth-store' }
    )
)
