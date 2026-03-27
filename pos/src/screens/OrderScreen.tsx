import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { useMenuStore, activeCategories } from '../stores/useMenuStore'
import { useOrderStore } from '../stores/useOrderStore'
import { CategoryTabs } from '../components/menu/CategoryTabs'
import { MenuGrid } from '../components/menu/MenuGrid'
import { OrderPanel } from '../components/order/OrderPanel'
import { OfflineBanner } from '../components/shared/OfflineBanner'
import type { MenuCategory } from '../types/menu'

export function OrderScreen() {
    const { categories, setCategories } = useMenuStore()
    const { addItem, decrementItem, items } = useOrderStore()
    const [activeCatId, setActiveCatId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
    const [pendingItem, setPendingItem] = useState<{ id: string, name: string, price: number } | null>(null)
    const [pendingQty, setPendingQty] = useState('1')
    // Mobile cart drawer state
    const [cartOpen, setCartOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const qtyInputRef = useRef<HTMLInputElement>(null)

    // Total item count for cart FAB badge
    const cartItemCount = items.reduce((sum, it) => sum + it.quantity, 0)
    const cartTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)

    // Auto-focus search input on mount
    useEffect(() => {
        searchInputRef.current?.focus()
    }, [])

    // Focus search on '/' key press or close quantity on 'Escape'
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
            if (e.key === 'Escape') {
                setPendingItem(null)
                setSearchTerm('') // Completely clear search on Esc
                setCartOpen(false)
                setTimeout(() => searchInputRef.current?.focus(), 10)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Subscribe to menu from Firestore
    useEffect(() => {
        const menuRef = collection(db, `restaurants/${RESTAURANT_ID}/menu`)
        const unsubscribe = onSnapshot(menuRef, (snap) => {
            const cats: MenuCategory[] = snap.docs.map(d => d.data() as MenuCategory)
            cats.sort((a, b) => a.sortOrder - b.sortOrder)
            setCategories(cats)
        })
        return () => unsubscribe()
    }, [setCategories])

    const visible = activeCategories(categories)

    // Default to first category
    useEffect(() => {
        if (visible.length > 0 && (activeCatId === null || !visible.find(c => c.id === activeCatId))) {
            setActiveCatId(visible[0]?.id ?? null)
        }
    }, [visible, activeCatId])

    const activeCategory = visible.find(c => c.id === activeCatId)

    const allItems = visible.flatMap(c => c.items.map(i => ({ ...i, categoryName: c.name })))

    // Sort and number all items for "mugging up" numbers
    const numberedItems = allItems.sort((a, b) => a.name.localeCompare(b.name)).map((it, idx) => ({
        ...it,
        itemCode: (idx + 101).toString() // Sequential numbers starting from 101
    }))

    const matchesSearch = (item: any, query: string) => {
        const q = query.toLowerCase()
        const words = item.name.split(' ').filter(Boolean)
        const initials = words.map((w: string) => w.charAt(0).toLowerCase()).join('')

        return item.name.toLowerCase().includes(q) ||
            item.itemCode.includes(q) ||
            initials.startsWith(q) ||
            words.some((w: string) => w.toLowerCase().startsWith(q))
    }

    const filteredItems = (searchTerm.trim()
        ? numberedItems.filter(it => matchesSearch(it, searchTerm))
        : numberedItems.filter(it => it.categoryName === (activeCategory?.name ?? visible[0]?.name)))
        .filter(it => {
            if (it.isActive === false) return false // Hide inactive items
            if (dietaryFilter === 'all') return true
            if (dietaryFilter === 'veg') return it.isVeg === true
            if (dietaryFilter === 'non-veg') return it.isVeg === false
            return true
        })

    const handleSearchEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredItems.length > 0) {
            const firstItem = filteredItems[0]
            if (firstItem) {
                setPendingItem({ id: firstItem.id, name: firstItem.name, price: firstItem.price })
                setPendingQty('1') // Default to 1
                setTimeout(() => qtyInputRef.current?.focus(), 10)
            }
        }
    }

    const handleQtyEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && pendingItem) {
            const qty = parseInt(pendingQty)
            if (qty > 0) {
                addItem({ id: pendingItem.id, name: pendingItem.name, price: pendingItem.price }, qty)
            }
            setPendingItem(null)
            setSearchTerm('')
            setPendingQty('1')
            setTimeout(() => searchInputRef.current?.focus(), 10)
        }
    }

    return (
        <div className="flex flex-col flex-1 bg-surface overflow-hidden w-full">
            <OfflineBanner />

            {/* Search and Categories Header */}
            <div className="bg-surface-container-lowest border-b border-outline-variant/10 px-3 md:px-4 py-2 flex items-center justify-between gap-2 md:gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg">search</span>
                    <input
                        ref={searchInputRef}
                        id="menu-search-input"
                        type="search"
                        inputMode="search"
                        placeholder="Search dish by name or number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchEnter}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-full pl-10 pr-10 py-2.5 text-sm font-body outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface min-w-[44px] min-h-[44px] flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setDietaryFilter('all')}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all min-h-[36px] ${dietaryFilter === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setDietaryFilter('veg')}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all min-h-[36px] ${dietaryFilter === 'veg' ? 'bg-green-600 text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant opacity-70'}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-none bg-current" />
                        Veg
                    </button>
                    <button
                        onClick={() => setDietaryFilter('non-veg')}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all min-h-[36px] ${dietaryFilter === 'non-veg' ? 'bg-red-600 text-white shadow-sm' : 'bg-surface-container-high text-on-surface-variant opacity-70'}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-none bg-current" />
                        <span className="hidden sm:inline">Non-</span>Veg
                    </button>
                </div>
                {searchTerm && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0 hidden sm:block">
                        {filteredItems.length} results
                    </div>
                )}
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left panel — Menu (full width on mobile, 60% on desktop) */}
                <div className="flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-outline-variant/10">
                    {/* Category tabs */}
                    {!searchTerm && (
                        <div className="px-3 md:px-4 pt-3 shrink-0">
                            <CategoryTabs
                                categories={visible}
                                activeId={activeCatId ?? ''}
                                onSelect={setActiveCatId}
                            />
                        </div>
                    )}

                    {/* Menu grid — takes all remaining height */}
                    <div className="flex-1 overflow-hidden px-3 md:px-4 pb-4 pt-3 flex flex-col">
                        {visible.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body text-sm">
                                The menu is empty. Ask the admin to add items.
                            </div>
                        ) : (
                            <MenuGrid
                                items={filteredItems}
                                onAdd={(item) => addItem({ id: item.id, name: item.name, price: item.price }, 1)}
                                onDecrement={decrementItem}
                            />
                        )}
                    </div>
                </div>

                {/* Right panel — Order (hidden on mobile, shown on md+) */}
                <div className="hidden md:flex w-full md:w-[320px] lg:w-[400px] shrink-0 bg-surface-container-lowest flex-col overflow-y-auto">
                    <OrderPanel />
                </div>
            </div>

            {/* ── Mobile: Floating Cart Button ──────────────────────── */}
            {cartItemCount > 0 && (
                <button
                    onClick={() => setCartOpen(true)}
                    className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-primary text-on-primary rounded-full px-6 py-4 shadow-xl shadow-primary/30 flex items-center gap-3 font-black text-sm uppercase tracking-widest min-h-[56px]"
                >
                    <span className="material-symbols-outlined text-xl">shopping_cart</span>
                    <span>View Cart ({cartItemCount})</span>
                    <span className="ml-auto font-headline text-base">₹{cartTotal.toFixed(0)}</span>
                </button>
            )}

            {/* ── Mobile: Cart Drawer (Bottom Sheet) ─────────────────── */}
            {cartOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setCartOpen(false)}
                    />
                    {/* Sheet */}
                    <div className="relative z-10 bg-surface-container-lowest rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        {/* Drag handle + close */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                            <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
                            <span className="font-headline font-black text-lg text-on-surface">Your Order</span>
                            <button
                                onClick={() => setCartOpen(false)}
                                className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {/* OrderPanel fills the sheet */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <OrderPanel />
                        </div>
                    </div>
                </div>
            )}

            {/* Quantity Selector Popover */}
            {pendingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 p-8 w-full max-w-sm flex flex-col items-center">
                        <span className="material-symbols-outlined text-primary text-4xl mb-2">add_shopping_cart</span>
                        <h3 className="text-lg font-black font-headline text-on-surface mb-1">{pendingItem.name}</h3>
                        <p className="text-xs text-on-surface-variant font-bold mb-6 uppercase tracking-widest">How many do you want?</p>

                        <input
                            ref={qtyInputRef}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={pendingQty}
                            onChange={(e) => setPendingQty(e.target.value)}
                            onKeyDown={handleQtyEnter}
                            onBlur={() => !pendingQty && setPendingQty('1')}
                            className="w-32 text-center text-4xl font-black font-headline bg-surface-container-low border-b-4 border-primary p-4 outline-none focus:ring-0 mb-8 rounded-t-lg"
                        />

                        <button
                            onClick={() => handleQtyEnter({ key: 'Enter' } as any)}
                            className="w-full bg-primary text-on-primary py-4 rounded-xl font-body font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all min-h-[56px]"
                        >
                            Add to Order
                        </button>

                        <button
                            onClick={() => setPendingItem(null)}
                            className="mt-4 text-[10px] font-black uppercase tracking-widest text-error hover:underline min-h-[44px]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
