export type OrderType = 'dine-in' | 'takeaway'
export type PaymentMethod = 'cash' | 'upi' | 'card'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'finalised' | 'voided' | 'delayed' | 'completed'

export interface OrderItem {
    menuItemId: string
    name: string
    price: number
    quantity: number
    preferences?: string
    status?: 'pending' | 'ready'
    quantitySent?: number
}

export interface Order {
    id: string
    billNumber: string
    items: OrderItem[]
    orderType: OrderType
    tableNumber: string
    sessionId?: string
    platformOrderId: string
    note: string
    paymentMethod: PaymentMethod
    cashierId: string
    cashierName: string
    subtotal: number
    cgst: number
    sgst: number
    packingCharge: number
    grandTotal: number
    status: OrderStatus
    isPaid?: boolean
    voidReason?: string
    createdAt: Date
    printedAt: Date
    servedAt?: string
    completedAt?: string
}
