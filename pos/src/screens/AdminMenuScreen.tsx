import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { generateMenuImageUrl } from '../lib/menuImage'
import { MenuItemImage } from '../components/menu/MenuItemImage'
import type { MenuCategory, MenuItem } from '../types/menu'

type ModalMode = 'add' | 'edit' | 'move' | null

interface ItemModalState {
    mode: ModalMode
    item: MenuItem | null
}

export function AdminMenuScreen() {
    const [categories, setCategories] = useState<MenuCategory[]>([])
    const [activeCatId, setActiveCatId] = useState<string | null>(null)

    // Add category
    const [newCatName, setNewCatName] = useState('')

    // Item modal state
    const [modal, setModal] = useState<ItemModalState>({ mode: null, item: null })

    // Edit fields
    const [editName, setEditName] = useState('')
    const [editPrice, setEditPrice] = useState('')
    const [editIsVeg, setEditIsVeg] = useState(true)
    const [moveToCatId, setMoveToCatId] = useState<string>('')

    // Confirm delete
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null)

    useEffect(() => {
        const menuRef = collection(db, `restaurants/${RESTAURANT_ID}/menu`)
        const unsub = onSnapshot(menuRef, snap => {
            const cats = snap.docs.map(d => d.data() as MenuCategory)
            // Sort alphabetically (as requested)
            cats.sort((a, b) => a.name.localeCompare(b.name))
            setCategories(cats)
            if (cats.length > 0 && activeCatId === null) {
                setActiveCatId(cats[0]?.id ?? null)
            }
        })
        return () => unsub()
    }, [activeCatId])

    const activeCategory = categories.find(c => c.id === activeCatId)
    const otherCategories = categories.filter(c => c.id !== activeCatId)

    // ─── Category ────────────────────────────────────────────────
    const handleAddCategory = async () => {
        if (!newCatName.trim()) return
        const id = crypto.randomUUID()
        await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${id}`), {
            id,
            name: newCatName.trim(),
            sortOrder: categories.length,
            items: [],
        })
        setNewCatName('')
        setActiveCatId(id)
    }

    // ─── Open Modals ──────────────────────────────────────────────
    const openAdd = () => {
        setEditName('')
        setEditPrice('')
        setEditIsVeg(true)
        setModal({ mode: 'add', item: null })
    }

    const openEdit = (item: MenuItem) => {
        setEditName(item.name)
        setEditPrice(String(item.price))
        setEditIsVeg(item.isVeg)
        setModal({ mode: 'edit', item })
    }

    const openMove = (item: MenuItem) => {
        setMoveToCatId(otherCategories[0]?.id ?? '')
        setModal({ mode: 'move', item })
    }

    const closeModal = () => setModal({ mode: null, item: null })

    // ─── Add Item ─────────────────────────────────────────────────
    const handleAddItem = async () => {
        if (!activeCategory || !editName.trim() || !editPrice) return
        const price = parseFloat(editPrice)
        if (isNaN(price) || price <= 0) return

        const newItem: MenuItem = {
            id: crypto.randomUUID(),
            name: editName.trim(),
            price,
            categoryId: activeCategory.id,
            isVeg: editIsVeg,
            isActive: true,
            imageUrl: generateMenuImageUrl(editName.trim()),
            sortOrder: activeCategory.items.length,
        }

        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${activeCategory.id}`), {
            items: [...activeCategory.items, newItem],
        })
        closeModal()
    }

    // ─── Edit Item ────────────────────────────────────────────────
    const handleEditItem = async () => {
        if (!activeCategory || !modal.item || !editName.trim() || !editPrice) return
        const price = parseFloat(editPrice)
        if (isNaN(price) || price <= 0) return

        const updated = activeCategory.items.map(i =>
            i.id === modal.item!.id
                ? { ...i, name: editName.trim(), price, isVeg: editIsVeg, imageUrl: generateMenuImageUrl(editName.trim()) }
                : i
        )
        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${activeCategory.id}`), {
            items: updated,
        })
        closeModal()
    }

    // ─── Delete Item ──────────────────────────────────────────────
    const handleDeleteItem = async (item: MenuItem) => {
        if (!activeCategory) return
        const updated = activeCategory.items.filter(i => i.id !== item.id)
        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${activeCategory.id}`), {
            items: updated,
        })
        setDeleteConfirmItem(null)
    }

    // ─── Move Item ────────────────────────────────────────────────
    const handleMoveItem = async () => {
        if (!activeCategory || !modal.item || !moveToCatId) return
        const targetCat = categories.find(c => c.id === moveToCatId)
        if (!targetCat) return

        // Remove from current
        const sourceItems = activeCategory.items.filter(i => i.id !== modal.item!.id)
        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${activeCategory.id}`), {
            items: sourceItems,
        })

        // Add to target category with updated categoryId
        const movedItem: MenuItem = { ...modal.item, categoryId: moveToCatId, sortOrder: targetCat.items.length }
        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${moveToCatId}`), {
            items: [...targetCat.items, movedItem],
        })
        closeModal()
    }

    // ─── Toggle Active ────────────────────────────────────────────
    const handleToggleItem = async (item: MenuItem) => {
        if (!activeCategory) return
        const updated = activeCategory.items.map(i =>
            i.id === item.id ? { ...i, isActive: !i.isActive } : i
        )
        await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${activeCategory.id}`), {
            items: updated,
        })
    }

    // ─── Delete Category ──────────────────────────────────────────
    const handleDeleteCategory = async (catId: string) => {
        await deleteDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${catId}`))
        setActiveCatId(categories.find(c => c.id !== catId)?.id ?? null)
    }

    const isFormValid = editName.trim() && parseFloat(editPrice) > 0

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
            {/* Standardized Header */}
            <div className="bg-surface border-b border-outline-variant/30 px-4 md:px-8 py-5 md:py-8 shrink-0">
                <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">menu_book</span>
                            </div>
                            <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Edit Menu</h1>
                        </div>
                        <p className="text-on-surface-variant font-medium ml-1">Add, remove, and organise items in your restaurant menu.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {activeCategory && (
                            <button
                                onClick={openAdd}
                                className="bg-primary text-on-primary px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Add to {activeCategory.name}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Categories: horizontal pills on mobile, sidebar on md+ */}
                <aside className="md:w-60 md:shrink-0 md:border-r border-outline-variant/20 bg-surface-container-low flex flex-col">
                    {/* On mobile: horizontal pill row */}
                    <div className="md:hidden px-3 py-2 border-b border-outline-variant/10 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCatId(cat.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${cat.id === activeCatId ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}
                            >
                                {cat.name} ({cat.items.length})
                            </button>
                        ))}
                        <button
                            onClick={() => void handleAddCategory()}
                            disabled={!newCatName.trim()}
                            className="shrink-0 w-8 h-8 bg-primary text-on-primary rounded-full font-bold text-lg flex items-center justify-center hover:opacity-90 disabled:opacity-40"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    {/* Mobile: inline text input for new category */}
                    <div className="md:hidden px-3 py-2 border-b border-outline-variant/10 flex gap-2">
                        <input
                            id="new-category-name-mobile"
                            type="text"
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && void handleAddCategory()}
                            placeholder="New category name..."
                            className="flex-1 border border-outline-variant/30 rounded-lg px-3 py-2 font-body text-sm bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary/30 min-h-[44px]"
                        />
                    </div>
                    {/* On md+: original vertical sidebar */}
                    <div className="hidden md:block p-4 border-b border-outline-variant/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Menu Categories</p>
                        <div className="flex gap-2">
                            <input
                                id="new-category-name"
                                type="text"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && void handleAddCategory()}
                                placeholder="New category..."
                                className="flex-1 border border-outline-variant/30 rounded-lg px-3 py-2 font-body text-sm bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <button
                                id="add-category-btn"
                                onClick={() => void handleAddCategory()}
                                className="w-10 h-10 bg-primary text-on-primary rounded-lg font-bold text-lg flex items-center justify-center hover:opacity-90"
                            >
                                <span className="material-symbols-outlined">add</span>
                            </button>
                        </div>
                    </div>

                    <nav className="hidden md:flex flex-1 p-2 space-y-1 flex-col overflow-y-auto">
                        {categories.map(cat => (
                            <div key={cat.id} className="group flex items-center gap-1">
                                <button
                                    id={`admin-cat-${cat.id}`}
                                    onClick={() => setActiveCatId(cat.id)}
                                    className={`flex-1 text-left px-3 py-2.5 rounded-lg font-body text-sm font-semibold transition-all ${cat.id === activeCatId
                                        ? 'bg-primary text-on-primary'
                                        : 'text-on-surface hover:bg-surface-container'
                                        }`}
                                >
                                    {cat.name}
                                    <span className="ml-2 text-xs opacity-60">({cat.items.length})</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Delete category "${cat.name}" and all its items?`)) {
                                            void handleDeleteCategory(cat.id)
                                        }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-error hover:bg-error/10 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    title="Delete category"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {!activeCategory ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                            <span className="material-symbols-outlined text-5xl mb-3 text-on-surface-variant">restaurant_menu</span>
                            <p className="font-bold text-on-surface-variant">Choose a category to see its items</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-5">
                                {activeCategory.name} — {activeCategory.items.length} items
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                {activeCategory.items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm hover:shadow-md transition-all ${!item.isActive ? 'opacity-50' : ''}`}
                                    >
                                        {/* Image — no overlay, no hover tricks */}
                                        <div className="h-28 relative">
                                            <MenuItemImage
                                                imageUrl={item.imageUrl}
                                                itemName={item.name}
                                                isVeg={item.isVeg}
                                            />
                                        </div>

                                        {/* Name + Price row */}
                                        <div className="px-3 pt-3 pb-1">
                                            <p className="font-body font-bold text-sm text-on-surface truncate">{item.name}</p>
                                            <p className="font-body text-sm text-primary font-bold">₹{item.price}</p>
                                        </div>

                                        {/* Action row — always visible, below content */}
                                        <div className="px-3 pb-3 pt-1 flex items-center justify-between gap-2 border-t border-outline-variant/10 mt-2">
                                            {/* Toggle */}
                                            <button
                                                id={`toggle-item-${item.id}`}
                                                onClick={() => void handleToggleItem(item)}
                                                className={`min-w-[44px] min-h-[24px] rounded-full text-[10px] font-bold uppercase tracking-wider px-2 transition-colors ${item.isActive
                                                        ? 'bg-primary text-on-primary'
                                                        : 'bg-outline-variant text-on-surface-variant'
                                                    }`}
                                            >
                                                {item.isActive ? 'On' : 'Off'}
                                            </button>

                                            {/* Edit / Move / Delete */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Edit item"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => openMove(item)}
                                                    className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Move to category"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">drive_file_move</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmItem(item)}
                                                    className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                                    title="Delete item"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* ─── Add / Edit Item Modal ───────────────────────────────── */}
            {(modal.mode === 'add' || modal.mode === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="font-headline font-bold text-2xl text-on-surface">
                                {modal.mode === 'add' ? `Add item to ${activeCategory?.name}` : 'Edit item'}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-surface-container rounded-full">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-1.5">Item Name</label>
                                <input
                                    id="modal-item-name"
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="e.g. Paneer Tikka"
                                    className="w-full border border-outline-variant/40 rounded-lg px-4 py-3 font-body text-base bg-surface-container outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-1.5">Price (₹)</label>
                                <input
                                    id="modal-item-price"
                                    type="number"
                                    value={editPrice}
                                    onChange={e => setEditPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border border-outline-variant/40 rounded-lg px-4 py-3 font-body text-base bg-surface-container outline-none focus:ring-2 focus:ring-primary/30 text-right"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-2">Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="modal-veg" checked={editIsVeg} onChange={() => setEditIsVeg(true)} />
                                        <span className="w-3 h-3 bg-green-600 rounded-sm inline-block" />
                                        <span className="font-body text-sm font-medium">Veg</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="modal-veg" checked={!editIsVeg} onChange={() => setEditIsVeg(false)} />
                                        <span className="w-3 h-3 bg-red-600 rounded-sm inline-block" />
                                        <span className="font-body text-sm font-medium">Non-Veg</span>
                                    </label>
                                </div>
                            </div>

                            {editName.trim() && (
                                <div className="flex items-center gap-3 p-3 bg-surface-container rounded-lg">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                        <img
                                            src={generateMenuImageUrl(editName.trim())}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-xs text-on-surface-variant font-medium">Photo preview — created automatically from the item name</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-3 rounded-lg border border-outline-variant/30 font-semibold text-sm text-on-surface hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                id={modal.mode === 'add' ? 'add-item-btn' : 'save-item-btn'}
                                onClick={() => modal.mode === 'add' ? void handleAddItem() : void handleEditItem()}
                                disabled={!isFormValid}
                                className="flex-[2] py-3 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {modal.mode === 'add' ? 'Add item' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Move Item Modal ──────────────────────────────────────── */}
            {modal.mode === 'move' && modal.item && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="font-headline font-bold text-2xl text-on-surface">Move item to another category</h2>
                            <button onClick={closeModal} className="p-2 hover:bg-surface-container rounded-full">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-4 bg-surface-container rounded-xl">
                            <p className="font-bold text-sm text-on-surface">{modal.item.name}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">Currently in: <span className="font-semibold">{activeCategory?.name}</span></p>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-outline block mb-2">Move to</label>
                            {otherCategories.length === 0 ? (
                                <p className="text-sm text-on-surface-variant italic">No other categories available. Please add a category first.</p>
                            ) : (
                                <div className="space-y-2">
                                    {otherCategories.map(cat => (
                                        <label
                                            key={cat.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${moveToCatId === cat.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-outline-variant/20 hover:border-outline-variant/50'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="move-target"
                                                value={cat.id}
                                                checked={moveToCatId === cat.id}
                                                onChange={() => setMoveToCatId(cat.id)}
                                                className="accent-primary"
                                            />
                                            <span className="font-semibold text-sm">{cat.name}</span>
                                            <span className="ml-auto text-xs text-on-surface-variant">{cat.items.length} items</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-3 rounded-lg border border-outline-variant/30 font-semibold text-sm text-on-surface hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void handleMoveItem()}
                                disabled={!moveToCatId || otherCategories.length === 0}
                                className="flex-[2] py-3 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">drive_file_move</span>
                                Move to {otherCategories.find(c => c.id === moveToCatId)?.name ?? '...'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirm Dialog ────────────────────────────────── */}
            {deleteConfirmItem && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm sm:mx-4 p-6 md:p-8 flex flex-col gap-5">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-error">delete_forever</span>
                            </div>
                            <div>
                                <h2 className="font-headline font-bold text-xl text-on-surface">Remove this item?</h2>
                                <p className="text-sm text-on-surface-variant mt-1">
                                    <span className="font-semibold text-on-surface">"{deleteConfirmItem.name}"</span> will be permanently removed from the menu. You cannot undo this.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmItem(null)}
                                className="flex-1 py-3 rounded-lg border border-outline-variant/30 font-semibold text-sm hover:bg-surface-container transition-colors"
                            >
                                No, keep it
                            </button>
                            <button
                                onClick={() => void handleDeleteItem(deleteConfirmItem)}
                                className="flex-[2] py-3 rounded-lg bg-error text-on-error font-semibold text-sm hover:opacity-90 transition-opacity"
                            >
                                Yes, remove it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
