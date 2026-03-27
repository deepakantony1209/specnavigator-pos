import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { useReactToPrint } from 'react-to-print'
import { format } from 'date-fns'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { useSettingsStore } from '../stores/useSettingsStore'
import { formatAmount, toJSDate } from '../lib/billing'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { Receipt } from '../components/order/Receipt'
import type { Order } from '../types/order'

const PAGE_SIZE = 20

export function HistoryScreen() {
    const { settings } = useSettingsStore()
    const [orders, setOrders] = useState<Order[]>([])
    const [cashiers, setCashiers] = useState<any[]>([])
    const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [page, setPage] = useState(1)
    const [voidTarget, setVoidTarget] = useState<Order | null>(null)
    const [voidReason, setVoidReason] = useState('')
    const [printOrder, setPrintOrder] = useState<Order | null>(null)
    const receiptRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({ contentRef: receiptRef })

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `restaurants/${RESTAURANT_ID}/cashiers`), snap => {
            setCashiers(snap.docs.map(d => ({ ...d.data(), id: d.id })))
        })
        return () => unsub()
    }, [])

    // Subscribe to orders for the selected date
    useEffect(() => {
        const start = new Date(filterDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(filterDate)
        end.setHours(23, 59, 59, 999)

        const q = query(
            collection(db, `restaurants/${RESTAURANT_ID}/orders`),
            where('createdAt', '>=', start.toISOString()),
            where('createdAt', '<=', end.toISOString()),
            orderBy('createdAt', 'desc')
        )
        const unsub = onSnapshot(q, (snap) => {
            setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Order))
            setPage(1)
        })
        return () => unsub()
    }, [filterDate])

    const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))

    const handleVoid = async () => {
        if (!voidTarget || !voidReason.trim()) return
        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/orders/${voidTarget.id}`), {
            status: 'voided',
            voidReason: voidReason.trim(),
        })
        setVoidTarget(null)
        setVoidReason('')
    }

    const handleReprint = (order: Order) => {
        setPrintOrder(order)
        setTimeout(() => handlePrint(), 50)
    }

    const today = orders.reduce((acc, o) => {
        if (o.status === 'voided') return acc
        return {
            count: acc.count + 1,
            revenue: acc.revenue + (o.grandTotal || 0),
            cgst: acc.cgst + (o.cgst || 0),
            sgst: acc.sgst + (o.sgst || 0)
        }
    }, { count: 0, revenue: 0, cgst: 0, sgst: 0 })

    return (
        <div className="flex-1 bg-surface h-full overflow-y-auto custom-scrollbar">
            <div className="w-full px-4 py-6 md:px-8 md:py-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">receipt_long</span>
                            </div>
                            <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Past Bills</h1>
                        </div>
                        <p className="text-on-surface-variant font-medium ml-1">View, reprint, and cancel your completed orders.</p>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="filter-date"
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="bg-surface-container rounded-xl px-4 py-3 font-body text-sm font-bold text-on-surface border border-outline-variant/30 outline-none focus:border-primary/50 transition-colors shadow-inner"
                        />
                    </div>
                </div>
                {/* Daily summary card */}
                <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant">
                    <p className="text-[10px] font-body font-bold uppercase tracking-widest text-outline mb-2">
                        {format(toJSDate(filterDate), 'dd MMM yyyy')} Summary
                    </p>
                    <div className="flex gap-6 flex-wrap">
                        <div>
                            <span className="font-headline font-bold text-2xl text-on-surface">{today.count}</span>
                            <span className="font-body text-sm text-on-surface-variant ml-1">orders</span>
                        </div>
                        <div>
                            <span className="font-headline font-bold text-2xl text-on-surface">₹{formatAmount(today.revenue)}</span>
                            <span className="font-body text-sm text-on-surface-variant ml-1">revenue</span>
                        </div>
                        <div>
                            <span className="font-body text-sm text-on-surface-variant">CGST ₹{formatAmount(today.cgst)} · SGST ₹{formatAmount(today.sgst)}</span>
                        </div>
                    </div>
                </div>

                {/* Table — horizontally scrollable on mobile */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-x-auto shadow-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant">
                                {['Bill No.', 'Table', 'Type', 'Staff', 'Role', 'Payment', 'Time', 'Amount', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-body font-bold uppercase tracking-widest text-outline">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container">
                            {pageOrders.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-on-surface-variant font-body text-sm bg-surface-container-lowest/50">
                                        No bills found for this date.
                                    </td>
                                </tr>
                            )}
                            {pageOrders.map(order => (
                                <tr
                                    key={order.id}
                                    className={`transition-colors hover:bg-surface-container-low ${order.status === 'voided' ? 'bg-error/5 text-outline-variant' : ''}`}
                                >
                                    <td className="px-4 py-4 font-body font-bold text-sm text-on-surface">
                                        {order.billNumber}
                                    </td>
                                    <td className="px-4 py-4 font-body text-sm text-on-surface font-medium">
                                        {order.tableNumber || '—'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest rounded px-2 py-0.5 ${order.orderType === 'dine-in' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                            {order.orderType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 font-body text-sm text-on-surface font-bold">
                                        {order.cashierName}
                                    </td>
                                    <td className="px-4 py-4 font-body text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
                                        <span className="bg-surface-container px-2 py-0.5 rounded text-[10px]/none">
                                            {cashiers.find(c => c.id === order.cashierId)?.role || 'System'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 font-body text-[10px] font-bold text-outline-variant uppercase tracking-widest">
                                        {order.paymentMethod}
                                    </td>
                                    <td className="px-4 py-4 font-body text-sm text-on-surface-variant font-medium">
                                        {format(toJSDate(order.createdAt), 'HH:mm')}
                                    </td>
                                    <td className={`px-4 py-4 font-body font-black text-sm text-right ${order.status === 'voided' ? 'line-through text-error' : 'text-on-surface'}`}>
                                        ₹{formatAmount(order.grandTotal || 0)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex gap-3">
                                            <button
                                                id={`reprint-${order.id}`}
                                                onClick={() => handleReprint(order)}
                                                className="p-1 hover:bg-primary/10 rounded transition-colors text-primary flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <span className="material-symbols-outlined text-sm">print</span>
                                                Reprint bill
                                            </button>
                                            {order.status !== 'voided' && (
                                                <button
                                                    id={`void-${order.id}`}
                                                    onClick={() => { setVoidTarget(order); setVoidReason('') }}
                                                    className="p-1 hover:bg-error/10 rounded transition-colors text-error flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <span className="material-symbols-outlined text-sm">block</span>
                                                    Cancel bill
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            id={`history-page-${i + 1}`}
                            onClick={() => setPage(i + 1)}
                            className={`min-w-[44px] min-h-[44px] rounded font-body font-bold text-sm ${page === i + 1 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hidden receipt */}
            <div style={{ display: 'none' }}>
                {printOrder && (
                    <Receipt
                        ref={receiptRef}
                        order={printOrder}
                        restaurantName={settings.restaurantName}
                        address={settings.address}
                        phone={settings.phone}
                        cgstPercent={settings.cgstPercent}
                        sgstPercent={settings.sgstPercent}
                    />
                )}
            </div>

            {/* Void dialog */}
            <ConfirmDialog
                open={voidTarget !== null}
                onOpenChange={(open) => { if (!open) setVoidTarget(null) }}
                title={`Cancel bill ${voidTarget?.billNumber ?? ''}?`}
                description="This bill will be marked as cancelled. It will stay in the system for records. Please enter a reason below."
                confirmLabel="Yes, cancel bill"
                cancelLabel="No, go back"
                destructive
                onConfirm={() => void handleVoid()}
            >
                <input
                    id="void-reason-input"
                    type="text"
                    value={voidReason}
                    onChange={e => setVoidReason(e.target.value)}
                    placeholder="Reason for cancelling..."
                    className="w-full border border-outline-variant rounded px-3 py-2 font-body text-sm text-on-surface outline-none bg-surface-container"
                />
            </ConfirmDialog>
        </div>
    )
}
