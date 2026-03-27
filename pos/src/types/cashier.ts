export interface Cashier {
    id: string
    name: string
    role: 'server' | 'kitchen' | 'cashier' | 'admin'
    pin: string
    pinHash: string
    isActive: boolean
    createdAt: Date
    assignedTables?: string[]
}
