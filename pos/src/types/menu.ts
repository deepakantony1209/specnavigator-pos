export interface MenuItem {
    id: string
    name: string
    price: number
    categoryId: string
    isVeg: boolean
    isActive: boolean
    imageUrl: string
    sortOrder: number
    itemCode?: string
}

export interface MenuCategory {
    id: string
    name: string
    sortOrder: number
    items: MenuItem[]
}
