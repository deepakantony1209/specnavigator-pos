import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { useOrderStore } from '../stores/useOrderStore'
import { useAuthStore } from '../stores/useAuthStore'
import { formatAmount } from '../lib/billing'
import type { Order } from '../types/order'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'

interface ManageOrdersScreenProps {
    onEdit: () => void
}

export function ManageOrdersScreen({ onEdit }: ManageOrdersScreenProps) {
    const { cashier } = useAuthStore()
    const { loadOrder, clearOrder } = useOrderStore()
    const [orders, setOrders] = useState<Order[]>([])
    const [isVoiding, setIsVoiding] = useState<string | null>(null)

    useEffect(() => {
        const q = collection(db, `restaurants/${RESTAURANT_ID}/orders`)
        const unsub = onSnapshot(q, snap => {
            const list = snap.docs.map(d => {
                const data = d.data()
                const createdAt = data.createdAt?.seconds
                    ? new Date(data.createdAt.seconds * 1000)
                    : new Date(data.createdAt)
                return { ...data, id: d.id, createdAt } as Order
            })
            // Only show active orders that haven't been completed or voided
            const active = list.filter(o => {
                const isBaseInactive = ['completed', 'voided', 'finalised', 'served'].includes(o.status)
                if (isBaseInactive) return false

                // If user is a server, only show their assigned tables and EXCLUDE takeaways
                if (cashier?.role === 'server') {
                    if (o.orderType === 'takeaway') return false
                    if (o.orderType === 'dine-in') {
                        return (cashier.assignedTables || []).includes(o.tableNumber)
                    }
                }
                return true
            })
            active.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            setOrders(active)
        })
        return () => unsub()
    }, [])

    const handleOpenEdit = (order: Order) => {
        clearOrder()
        loadOrder(order)
        onEdit()
    }

    const voidOrder = async (id: string) => {
        const ref = doc(db, `restaurants/${RESTAURANT_ID}/orders/${id}`)
        await updateDoc(ref, {
            status: 'voided',
            voidedAt: new Date().toISOString(),
            voidReason: 'Mistake/Cancelled by Staff' // Required by security rules
        })
        setIsVoiding(null)
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-surface overflow-hidden">
            {/* Standardized Header */}
            <div className="bg-surface border-b border-outline-variant/30 px-4 md:px-8 py-5 md:py-8 shrink-0">
                <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">list_alt</span>
                            </div>
                            <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Active Orders</h1>
                        </div>
                        <p className="text-on-surface-variant font-medium ml-1">Edit or cancel orders that are still in progress.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl">
                            {orders.length} Open Orders
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-outline-variant/10 flex justify-between items-start">
                                <div>
                                    <h3 className="font-headline font-black text-lg text-on-surface">
                                        {order.orderType === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway'}
                                    </h3>
                                    <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Bill #{order.billNumber}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${order.status === 'ready' ? 'bg-green-100 text-green-700' :
                                    order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="p-5 flex-1">
                                <ul className="space-y-2 mb-4">
                                    {order.items.slice(0, 3).map((it, idx) => (
                                        <li key={idx} className="flex justify-between text-xs font-medium text-on-surface-variant">
                                            <span>{it.quantity}x {it.name}</span>
                                            <span>₹{formatAmount(it.price * it.quantity)}</span>
                                        </li>
                                    ))}
                                    {order.items.length > 3 && (
                                        <li className="text-[10px] italic text-outline">+{order.items.length - 3} more items...</li>
                                    )}
                                </ul>
                                <div className="pt-3 border-t border-outline-variant/10 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-outline">Total Amount</span>
                                    <span className="font-headline font-black text-primary">₹{formatAmount(order.grandTotal)}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-surface-container-low flex gap-2">
                                <button
                                    onClick={() => handleOpenEdit(order)}
                                    className="flex-1 bg-surface-container-lowest border border-outline-variant/30 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">edit_document</span>
                                    Edit Order
                                </button>
                                <button
                                    onClick={() => setIsVoiding(order.id)}
                                    className="flex-1 bg-error/10 text-error py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">block</span>
                                    Cancel Order
                                </button>
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                            <span className="material-symbols-outlined text-5xl mb-4">inbox</span>
                            <p className="font-bold">No open orders right now</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Void Confirmation */}
            <ConfirmDialog
                open={!!isVoiding}
                onOpenChange={(open) => !open && setIsVoiding(null)}
                title="Cancel this order?"
                description="This will cancel all items and stop kitchen preparation. This action is tracked and cannot be undone."
                confirmLabel="Yes, cancel order"
                cancelLabel="No, keep it"
                destructive
                onConfirm={() => isVoiding && voidOrder(isVoiding)}
            />
        </div>
    )
}
