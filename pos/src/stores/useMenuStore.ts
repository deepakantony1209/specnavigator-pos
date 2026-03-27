import { create } from 'zustand'
import type { MenuCategory } from '../types/menu'

interface MenuState {
    categories: MenuCategory[]
    isLoaded: boolean
    setCategories: (categories: MenuCategory[]) => void
}

export const useMenuStore = create<MenuState>()((set) => ({
    categories: [],
    isLoaded: false,
    setCategories: (categories) => set({ categories, isLoaded: true }),
}))

export function activeCategories(categories: MenuCategory[]): MenuCategory[] {
    return categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.isActive),
    })).filter(cat => cat.items.length > 0)
}
