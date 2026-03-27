import { useState } from 'react'

type StockFilter = 'all' | 'in-stock' | 'out-of-stock'

interface InventoryItem {
    id: string
    name: string
    category: string
    stock: number
    unit: string
    status: 'optimal' | 'critical'
    emoji: string
}

const ITEMS: InventoryItem[] = [
    { id: '1', name: 'Chicken Biryani (Full)', category: 'Biryani', stock: 45, unit: 'Servings', status: 'optimal', emoji: '🍛' },
    { id: '2', name: 'Tandoori Roti', category: 'Roti', stock: 8, unit: 'Units', status: 'critical', emoji: '🫓' },
    { id: '3', name: 'Mineral Water (500ml)', category: 'Beverages', stock: 120, unit: 'Bottles', status: 'optimal', emoji: '💧' },
    { id: '4', name: 'Butter Paneer', category: 'Curry', stock: 5, unit: 'Portions', status: 'critical', emoji: '🧀' },
    { id: '5', name: 'Raw Basmati Rice', category: 'Grains', stock: 50, unit: 'Kilograms', status: 'optimal', emoji: '🌾' },
    { id: '6', name: 'Cooking Oil', category: 'Pantry', stock: 3, unit: 'Litres', status: 'critical', emoji: '🫙' },
    { id: '7', name: 'Dal Makhani Mix', category: 'Curry', stock: 30, unit: 'Servings', status: 'optimal', emoji: '🥘' },
    { id: '8', name: 'Mango Lassi', category: 'Beverages', stock: 25, unit: 'Glasses', status: 'optimal', emoji: '🥛' },
]

export function InventoryScreen() {
    const [stockFilter, setStockFilter] = useState<StockFilter>('all')
    const [search, setSearch] = useState('')

    const filtered = ITEMS.filter(item => {
        const matchFilter =
            stockFilter === 'all' ||
            (stockFilter === 'in-stock' && item.status === 'optimal') ||
            (stockFilter === 'out-of-stock' && item.status === 'critical')
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.category.toLowerCase().includes(search.toLowerCase())
        return matchFilter && matchSearch
    })

    const totalItems = ITEMS.length
    const lowStock = ITEMS.filter(i => i.status === 'critical').length
    const categories = [...new Set(ITEMS.map(i => i.category))].length

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
            <div className="px-4 py-6 md:px-12 md:py-10 w-full">
                {/* Page Header */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-[3.5rem] font-headline font-extrabold tracking-tighter text-on-surface leading-none mb-2">Inventory</h2>
                        <p className="text-sm font-medium text-on-surface-variant max-w-md">
                            Manage stock levels, track ingredient usage and receive low supply alerts.
                        </p>
                    </div>
                    <button className="bg-gradient-to-br from-primary to-primary-dim text-on-primary px-6 py-3 rounded-md font-semibold text-sm shadow-md transition-transform active:scale-95 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        Add Item
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-12">
                    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
                        <p className="text-xs font-semibold text-outline tracking-wider uppercase mb-1">Total Items</p>
                        <p className="text-3xl font-headline font-bold text-on-surface">{totalItems}</p>
                    </div>
                    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
                        <p className="text-xs font-semibold text-outline tracking-wider uppercase mb-1">Low Stock</p>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-headline font-bold text-error">{lowStock}</p>
                            <span className="h-2 w-2 rounded-full bg-error inline-block"></span>
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
                        <p className="text-xs font-semibold text-outline tracking-wider uppercase mb-1">Categories</p>
                        <p className="text-3xl font-headline font-bold text-on-surface">{String(categories).padStart(2, '0')}</p>
                    </div>
                    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm">
                        <p className="text-xs font-semibold text-outline tracking-wider uppercase mb-1">Monthly Cost</p>
                        <p className="text-3xl font-headline font-bold text-on-surface">₹4,820</p>
                    </div>
                </div>

                {/* Table — scrollable on mobile */}
                <div className="bg-surface-container-lowest rounded-xl overflow-x-auto shadow-sm">
                    {/* Table Filters + Search */}
                    <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center">
                        <div className="flex gap-4">
                            {(['all', 'in-stock', 'out-of-stock'] as StockFilter[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStockFilter(f)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${stockFilter === f ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-primary'}`}
                                >
                                    {f === 'all' ? 'All Items' : f === 'in-stock' ? 'In Stock' : 'Out of Stock'}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">search</span>
                            <input
                                className="pl-10 pr-4 py-1.5 bg-white border border-outline-variant/30 rounded-lg text-sm w-56 focus:ring-1 focus:ring-primary/30"
                                placeholder="Search items..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low/50">
                                <th className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-widest">Item Name</th>
                                <th className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-widest">Category</th>
                                <th className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-widest text-right">Current Stock</th>
                                <th className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-widest">Unit</th>
                                <th className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-widest text-right">Status</th>
                                <th className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <tr key={item.id} className={`hover:bg-surface-container-low/30 transition-colors ${item.status === 'critical' ? 'bg-error-container/5' : ''}`}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-xl">
                                                {item.emoji}
                                            </div>
                                            <span className="text-sm font-semibold text-on-surface">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container tracking-wider uppercase">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-headline font-bold">
                                        {item.status === 'critical' ? (
                                            <div className="flex items-center justify-end gap-2 text-error">
                                                <span className="h-1.5 w-1.5 rounded-full bg-error"></span>
                                                {String(item.stock).padStart(2, '0')}
                                            </div>
                                        ) : (
                                            <span className="text-on-surface">{item.stock}</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-xs font-medium text-on-surface-variant">{item.unit}</td>
                                    <td className="px-8 py-5 text-right">
                                        {item.status === 'critical' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-error-container text-on-error-container tracking-wider uppercase">Critical</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 tracking-wider uppercase">Optimal</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="text-outline hover:text-on-surface transition-colors">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/30">
                        <p className="text-xs font-medium text-outline">Showing {filtered.length} of {totalItems} items</p>
                        <div className="flex gap-2">
                            <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-outline hover:bg-white transition-all">
                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            </button>
                            <button className="w-8 h-8 rounded bg-primary text-on-primary font-bold text-xs">1</button>
                            <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-outline hover:bg-white transition-all text-xs font-bold">2</button>
                            <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-outline hover:bg-white transition-all">
                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
