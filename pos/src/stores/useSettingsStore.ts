import { create } from 'zustand'
import type { RestaurantSettings } from '../types/settings'

const DEFAULT_SETTINGS: RestaurantSettings = {
    restaurantName: 'My Restaurant',
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    address: '',
    phone: '',
    adminPin: '0000',
    packingChargePerItem: 0,
}

interface SettingsState {
    settings: RestaurantSettings
    isLoaded: boolean
    setSettings: (settings: RestaurantSettings) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
    settings: DEFAULT_SETTINGS,
    isLoaded: false,
    setSettings: (settings) => set({ settings, isLoaded: true }),
}))
