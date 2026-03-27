import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { formatAmount, toJSDate } from '../lib/billing'
import type { Order } from '../types/order'

export function DashboardScreen() {
    const [orders, setOrders] = useState<Order[]>([])
    const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today')

    useEffect(() => {
        const now = new Date()
        let start = new Date(now)
        start.setHours(0, 0, 0, 0)
        
        let end = new Date(now)
        end.setHours(23, 59, 59, 999)
        
        if (timeRange === '7d') {
            start = new Date(now)
            start.setDate(now.getDate() - 7)
            start.setHours(0, 0, 0, 0)
        }
        if (timeRange === '30d') {
            start = new Date(now)
            start.setDate(now.getDate() - 30)
            start.setHours(0, 0, 0, 0)
        }

        const q = query(
            collection(db, `restaurants/${RESTAURANT_ID}/orders`),
            orderBy('createdAt', 'desc')
        )

        const unsub = onSnapshot(q, (snap) => {
            const allOrders = snap.docs.map(d => ({ ...d.data(), id: d.id }) as Order)
            
            // Filter locally to ensure we catch all Date types (ISO or Firestore Timestamp) exactly like HistoryScreen
            const filteredOrders = allOrders.filter(o => {
                const orderDate = toJSDate(o.createdAt)
                return orderDate >= start && 
                       orderDate <= end && 
                       (o.status === 'finalised' || o.status === 'completed')
            })
            
            setOrders(filteredOrders)
        })

        return () => unsub()
    }, [timeRange])

    // Metric Calculations
    const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0)
    const netRevenue = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
    const totalTax = orders.reduce((sum, o) => sum + (o.cgst || 0) + (o.sgst || 0), 0)
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

    const channelData = orders.reduce((acc, o) => {
        acc[o.orderType] = (acc[o.orderType] || 0) + (o.grandTotal || 0)
        return acc
    }, {} as Record<string, number>)

    const paymentData = orders.reduce((acc, o) => {
        acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + (o.grandTotal || 0)
        return acc
    }, {} as Record<string, number>)


    const topItemsData = orders.flatMap(o => o.items).reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity
        return acc
    }, {} as Record<string, number>)

    const sortedItems = Object.entries(topItemsData).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return (
        <div className="flex-1 bg-surface h-full overflow-y-auto custom-scrollbar">
            <div className="w-full px-4 py-6 md:px-8 md:py-10 space-y-10">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">monitoring</span>
                            </div>
                            <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Sales Reports</h1>
                        </div>
                        <p className="text-on-surface-variant font-medium ml-1">A live summary of your restaurant's sales today.</p>
                    </div>

                    <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/20">
                        {(['today', '7d', '30d'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                            >
                                {range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Metric Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                        label="Total Sales" 
                        value={`₹${formatAmount(totalRevenue)}`} 
                        subValue={`Before tax: ₹${formatAmount(netRevenue)}`}
                        icon="payments"
                        color="primary"
                    />
                    <MetricCard 
                        label="Orders Completed" 
                        value={orders.length.toString()} 
                        subValue="Paid bills"
                        icon="receipt_long"
                        color="secondary"
                    />
                    <MetricCard 
                        label="Average Bill Amount" 
                        value={`₹${formatAmount(avgOrderValue)}`} 
                        subValue="Per customer"
                        icon="analytics"
                        color="tertiary"
                    />
                    <MetricCard 
                        label="Tax Collected" 
                        value={`₹${formatAmount(totalTax)}`} 
                        subValue="CGST + SGST combined"
                        icon="account_balance"
                        color="error"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Channel Breakdown */}
                    <SectionBox title="Sales by Order Type" icon="hub">
                        <div className="space-y-5">
                            {Object.entries(channelData).map(([channel, value]) => (
                                <div key={channel} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-on-surface-variant">
                                        <span>{channel}</span>
                                        <span className="text-on-surface text-sm">₹{formatAmount(value)}</span>
                                    </div>
                                    <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-1000" 
                                            style={{ width: `${(value / totalRevenue) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionBox>

                    {/* Top Bestsellers */}
                    <SectionBox title="Top 5 Best-selling Items" icon="star">
                        <div className="divide-y divide-outline-variant/10">
                            {sortedItems.map(([name, qty], idx) => (
                                <div key={name} className="flex items-center gap-4 py-4 group">
                                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center font-black text-xs text-outline group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-on-surface truncate">{name}</p>
                                        <p className="text-[10px] uppercase font-black text-outline opacity-60 tracking-widest">{qty} sold</p>
                                    </div>
                                </div>
                            ))}
                            {sortedItems.length === 0 && (
                                <p className="py-10 text-center text-xs text-outline italic">No sales yet for this period</p>
                            )}
                        </div>
                    </SectionBox>

                    {/* Payment Distribution */}
                    <SectionBox title="Payment Methods Used" icon="pie_chart">
                         <div className="space-y-6">
                            {Object.entries(paymentData).map(([method, value]) => (
                                <div key={method} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === 'cash' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <span className="material-symbols-outlined text-xl">
                                                {method === 'cash' ? 'savings' : 'cell_tower'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">{method}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-headline font-black text-sm">₹{formatAmount(value)}</p>
                                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{((value/totalRevenue)*100).toFixed(0)}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionBox>
                </div>

            </div>
        </div>
    )
}

function MetricCard({ label, value, subValue, icon, color }: any) {
    const colors: any = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        secondary: 'bg-secondary/10 text-secondary border-secondary/20',
        tertiary: 'bg-blue-100 text-blue-600 border-blue-200',
        error: 'bg-error/10 text-error border-error/20'
    }
    
    return (
        <div className={`p-8 rounded-[2rem] border-2 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${colors[color]}`}>
            <div className="flex justify-between items-start mb-6">
                <span className="material-symbols-outlined text-2xl">{icon}</span>
                <span className="material-symbols-outlined text-outline opacity-20">trending_up</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{label}</p>
            <p className="text-3xl font-headline font-black tracking-tighter mb-1 text-slate-900">{value}</p>
            <p className="text-[10px] font-bold opacity-60 italic">{subValue}</p>
        </div>
    )
}

function SectionBox({ title, icon, children }: any) {
    return (
        <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30 flex flex-col shadow-sm">
            <div className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">{title}</h3>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </section>
    )
}
