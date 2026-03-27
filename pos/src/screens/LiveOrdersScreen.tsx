import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { useAuthStore } from '../stores/useAuthStore'
import type { Order, OrderStatus } from '../types/order'

type KDSStatus = 'all' | 'preparing' | 'ready'


// Sample data removed

function statusBadge(status: OrderStatus) {
    switch (status) {
        case 'preparing': return <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider">Preparing</span>
        case 'ready': return <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container text-[10px] font-bold uppercase tracking-wider">Ready</span>
        case 'delayed': return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wider">Delayed</span>
        case 'pending': return <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Pending</span>
        default: return <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider lowercase">{status}</span>
    }
}

function borderColor(status: OrderStatus) {
    switch (status) {
        case 'preparing': return 'border-primary'
        case 'ready': return 'border-tertiary'
        case 'delayed': return 'border-error'
        case 'pending': return 'border-outline-variant'
        default: return 'border-outline-variant'
    }
}

function elapsedColor(status: OrderStatus) {
    switch (status) {
        case 'preparing': return 'text-primary'
        case 'ready': return 'text-tertiary'
        case 'delayed': return 'text-error'
        case 'pending': return 'text-outline'
        default: return 'text-outline'
    }
}

export function LiveOrdersScreen() {
    const { cashier } = useAuthStore()
    const [filter, setFilter] = useState<KDSStatus>('all')
    const [orders, setOrders] = useState<Order[]>([])

    const canPrepare = cashier?.role === 'kitchen'
    const canDeliver = cashier?.role === 'kitchen'

    useEffect(() => {
        // Broadened query to see if ANY orders show up
        const q = collection(db, `restaurants/${RESTAURANT_ID}/orders`)
        console.log("KDS Query started for path:", `restaurants/${RESTAURANT_ID}/orders`)

        const unsub = onSnapshot(q, snap => {
            console.log("KDS Snapshot received with docs count:", snap.docs.length)
            const list = snap.docs.map(d => {
                const data = d.data() as any
                const createdAt = data.createdAt?.seconds
                    ? new Date(data.createdAt.seconds * 1000)
                    : new Date(data.createdAt)
                return { ...data, id: d.id, createdAt } as Order
            })
            // Show orders that are being prepared, ready, or just served
            const activeList = list.filter(o => ['pending', 'preparing', 'ready', 'served'].includes(o.status))
            activeList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            setOrders(activeList)
        })
        return () => unsub()
    }, [])

    const filtered = orders.filter(o => {
        // Strict filtering for servers: only show orders for assigned tables and EXCLUDE takeaways
        if (cashier?.role === 'server') {
            if (o.orderType === 'takeaway') return false
            const assigned = cashier.assignedTables || []
            if (!assigned.includes(o.tableNumber)) return false
        }
        if (filter === 'preparing') return o.status === 'preparing' || o.status === 'pending'
        if (filter === 'ready') return o.status === 'ready'
        return true
    })

    const markReady = async (id: string) => {
        const ref = doc(db, `restaurants/${RESTAURANT_ID}/orders/${id}`)
        await updateDoc(ref, { status: 'ready' })
    }

    const deliver = async (id: string) => {
        const ref = doc(db, `restaurants/${RESTAURANT_ID}/orders/${id}`)
        await updateDoc(ref, { status: 'served', servedAt: new Date().toISOString() })
    }

    const archive = async (id: string) => {
        const ref = doc(db, `restaurants/${RESTAURANT_ID}/orders/${id}`)
        await updateDoc(ref, { status: 'completed', completedAt: new Date().toISOString() })
    }

    const toggleItemReady = async (orderId: string, itemIndex: number) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return

        const newItems = [...order.items]
        const item = { ...newItems[itemIndex] } as any
        const wasReady = item.status === 'ready'
        item.status = wasReady ? 'pending' : 'ready'
        newItems[itemIndex] = item

        const ref = doc(db, `restaurants/${RESTAURANT_ID}/orders/${orderId}`)
        await updateDoc(ref, { items: newItems })

        if (!wasReady) {
            // Create notification for server
            const notificationRef = collection(db, `restaurants/${RESTAURANT_ID}/notifications`)
            await addDoc(notificationRef, {
                type: 'item_ready',
                orderId,
                tableNumber: order.tableNumber,
                itemName: item.name,
                createdAt: new Date().toISOString(),
                isRead: false
            })
        }
    }

    const counts = {
        all: orders.length,
        preparing: orders.filter(o => o.status === 'preparing' || (o.status as string) === 'pending').length,
        ready: orders.filter(o => o.status === 'ready').length,
    }

    const getElapsed = (dateStr: any) => {
        if (!dateStr) return 0
        const start = new Date(dateStr).getTime()
        const now = new Date().getTime()
        return Math.floor((now - start) / 60000)
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
            {/* Standardized Header */}
            <div className="bg-surface border-b border-outline-variant/30 px-4 md:px-8 py-5 md:py-8 shrink-0">
                <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-xl shadow-secondary/20">
                                <span className="material-symbols-outlined text-2xl">restaurant</span>
                            </div>
                            <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Kitchen Screen</h1>
                        </div>
                        <p className="text-on-surface-variant font-medium ml-1">Live view of all open kitchen orders.</p>
                    </div>

                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/20 shadow-inner">
                            {(['all', 'preparing', 'ready'] as KDSStatus[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-secondary text-white shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                                >
                                    {f === 'all' ? `All (${counts.all})` : f === 'preparing' ? `Preparing (${counts.preparing})` : `Ready (${counts.ready})`}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">search</span>
                            <input
                                className="bg-surface-container border border-outline-variant/30 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-on-surface focus:border-secondary/50 outline-none w-64 shadow-inner transition-colors"
                                placeholder="Search orders..."
                                type="text"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KDS Grid */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filtered.map(order => (
                        <article
                            key={order.id}
                            className={`bg-surface-container-lowest rounded-lg border-l-4 ${borderColor(order.status)} flex flex-col shadow-sm hover:shadow-md transition-shadow`}
                            style={{ minHeight: '380px' }}
                        >
                            <div className="p-5 flex justify-between items-start border-b border-surface-container">
                                <div>
                                    <h2 className="font-headline font-extrabold text-2xl tracking-tight text-on-surface">{order.tableNumber || 'Takeaway'}</h2>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">{order.orderType} • Bill {order.billNumber}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex gap-2 items-center">
                                        {order.isPaid && (
                                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-tighter border border-green-200">Paid</span>
                                        )}
                                        <span className={`text-sm font-bold ${elapsedColor(order.status)} flex items-center gap-1`}>
                                            <span className="material-symbols-outlined text-sm">{order.status === 'delayed' ? 'warning' : 'schedule'}</span>
                                            {getElapsed(order.createdAt)}m
                                        </span>
                                    </div>
                                    {statusBadge(order.status)}
                                </div>
                            </div>

                            <div className="p-5 flex-grow overflow-y-auto custom-scrollbar">
                                {order.items.length === 0 ? (
                                    <p className="text-sm italic text-slate-400 flex items-center justify-center h-full">Preparing receipt...</p>
                                ) : (
                                    <ul className="space-y-4">
                                        {order.items.map((item, i) => (
                                            <li key={i} className={`flex items-start justify-between gap-3 group`}>
                                                <div className="flex gap-3">
                                                    <span className={`font-bold transition-colors ${item.status === 'ready' ? 'text-green-500' : elapsedColor(order.status)}`}>
                                                        {`${item.quantity}x`}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className={`font-semibold text-sm transition-colors ${item.status === 'ready' ? 'text-slate-400 line-through' : 'text-on-surface'}`}>{item.name}</span>
                                                        {item.preferences && <span className="text-xs text-slate-500 italic">{item.preferences}</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => canPrepare && toggleItemReady(order.id, i)}
                                                    disabled={!canPrepare}
                                                    className={`p-1 rounded-full transition-all ${item.status === 'ready'
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600 opacity-0 group-hover:opacity-100'
                                                        } ${!canPrepare ? 'cursor-not-allowed pointer-events-none' : ''}`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">{item.status === 'ready' ? 'check_circle' : 'radio_button_unchecked'}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="p-4 bg-surface-container-low mt-auto flex gap-2">
                                {order.status === 'served' ? (
                                    <button
                                        onClick={() => (cashier?.role === 'cashier' || cashier?.role === 'admin') && archive(order.id)}
                                        disabled={!(cashier?.role === 'cashier' || cashier?.role === 'admin')}
                                        className={`w-full bg-slate-200 text-slate-700 py-2 rounded text-xs font-bold hover:bg-slate-300 transition-colors uppercase tracking-wider flex items-center justify-center gap-2 ${!(cashier?.role === 'cashier' || cashier?.role === 'admin') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">archive</span>
                                        Archive Order
                                    </button>
                                ) : order.status === 'ready' ? (
                                    <button
                                        onClick={() => canDeliver && deliver(order.id)}
                                        disabled={!canDeliver}
                                        className={`w-full bg-on-surface text-surface py-2 rounded text-xs font-bold hover:opacity-90 transition-opacity uppercase tracking-wider flex items-center justify-center gap-2 ${!canDeliver ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">done_all</span>
                                        {order.orderType === 'takeaway' ? 'Handed to customer' : 'Mark as delivered'}
                                    </button>
                                ) : order.status === 'pending' ? (
                                    <button
                                        onClick={() => canPrepare && markReady(order.id)}
                                        disabled={!canPrepare}
                                        className={`w-full bg-primary-dim text-on-primary py-2 rounded text-xs font-bold hover:opacity-90 transition-opacity uppercase tracking-wider ${!canPrepare ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        Begin cooking
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            disabled={!canPrepare}
                                            className={`flex-1 bg-surface-container-high py-2 rounded text-xs font-bold hover:bg-slate-300 transition-colors uppercase tracking-wider ${!canPrepare ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {order.status === 'delayed' ? 'Priority' : 'Void'}
                                        </button>
                                        <button
                                            onClick={() => canPrepare && markReady(order.id)}
                                            disabled={!canPrepare}
                                            className={`flex-1 bg-primary-container text-on-primary-container py-2 rounded text-xs font-bold hover:opacity-90 transition-opacity uppercase tracking-wider ${!canPrepare ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            Mark as ready
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            {/* Kitchen Stats footer */}
            <footer className="bg-surface-dim/80 backdrop-blur-md px-4 md:px-8 py-3 border-t border-outline-variant/10 flex justify-between items-center shrink-0">
                <div className="flex gap-4 md:gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Avg. cook time</span>
                        <span className="font-bold text-sm">18.5 mins</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Items waiting</span>
                        <span className="font-bold text-sm">34 items</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Active Tables</span>
                        <span className="font-bold text-sm">12 / 20</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Kitchen Printer Online
                    </span>
                </div>
            </footer>
        </div>
    )
}
