import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { useOrderStore } from '../stores/useOrderStore'
import { useTablesStore } from '../stores/useTablesStore'
import type { TableDef } from '../stores/useTablesStore'
import type { Cashier } from '../types/cashier'

interface TablesScreenProps {
    onStartOrder: () => void
}

type FilterType = 'all' | 'occupied' | 'vacant'

export function TablesScreen({ onStartOrder }: TablesScreenProps) {
    const { setTableNumber, setOrderType, setSessionId, clearOrder, setItems } = useOrderStore()
    const { tables: storeTables, addTable, updateTable, deleteTable, occupiedSessions, startSession, endSession } = useTablesStore()
    const [selectedTable, setSelectedTable] = useState<string | null>(null)
    const [filter, setFilter] = useState<FilterType>('all')

    const [cashiers, setCashiers] = useState<Cashier[]>([])

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `restaurants/${RESTAURANT_ID}/cashiers`), snap => {
            setCashiers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Cashier)))
        })
        return () => unsub()
    }, [])

    const getHashColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
        // Add multiplying factor (Golden Angle) to spread similar ID hashes across the 360 hue spectrum
        return `hsl(${Math.abs(hash * 137.5) % 360}, 70%, 60%)`;
    }

    // Table Modal State
    const [isTableModalOpen, setIsTableModalOpen] = useState(false)
    const [editingTable, setEditingTable] = useState<TableDef | null>(null)
    const [tableForm, setTableForm] = useState({ id: '', capacity: 4, shape: 'rectangle' as 'rectangle' | 'circle' })

    // Server Assignment Modal State
    const [isServerModalOpen, setIsServerModalOpen] = useState(false)
    const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
    const [isOrderSummaryModalOpen, setIsOrderSummaryModalOpen] = useState(false)

    const toggleServerAssignment = async (cashier: Cashier, tableId: string) => {
        const currentAssigned = cashier.assignedTables || []
        const isAssigned = currentAssigned.includes(tableId)
        
        const newAssigned = isAssigned 
            ? currentAssigned.filter(id => id !== tableId)
            : [...currentAssigned, tableId]
            
        try {
            await updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers`, cashier.id), {
                assignedTables: newAssigned
            })
        } catch (e) {
            console.error("Failed to update server assignment", e)
        }
    }

    // Canvas Designer State (Now simplified for Grid Mode)
    const [designMode, setDesignMode] = useState(false)

    const openAddModal = () => {
        const nextNum = storeTables.length + 1
        setTableForm({ id: `TBL-${nextNum.toString().padStart(2, '0')}`, capacity: 4, shape: 'rectangle' })
        setEditingTable(null)
        setIsTableModalOpen(true)
    }

    const openEditModal = (table: TableDef) => {
        setTableForm({ id: table.id, capacity: table.capacity, shape: table.shape })
        setEditingTable(table)
        setIsTableModalOpen(true)
    }

    const handleSaveTable = (e: React.FormEvent) => {
        e.preventDefault()
        if (!tableForm.id.trim()) return

        if (editingTable) {
            updateTable(editingTable.id, {
                ...editingTable,
                id: tableForm.id.trim(),
                capacity: tableForm.capacity,
                shape: tableForm.shape
            })
        } else {
            addTable({
                id: tableForm.id.trim(),
                capacity: tableForm.capacity,
                shape: tableForm.shape,
                x: 0, y: 0, width: 120, height: 120
            })
        }
        setIsTableModalOpen(false)
    }

    const handleDeleteTable = () => {
        if (!editingTable) return
        if (confirm(`Delete table ${editingTable.id}?`)) {
            deleteTable(editingTable.id)
            setIsTableModalOpen(false)
            if (selectedTable === editingTable.id) setSelectedTable(null)
        }
    }

    const tables = storeTables.map(t => {
        const sessions = Object.values(occupiedSessions).filter(s => s.tableId === t.id)
        if (sessions.length > 0) {
            const oldest = sessions.reduce((prev, curr) => (prev.startedAt < curr.startedAt ? prev : curr))
            const mins = Math.floor((Date.now() - new Date(oldest.startedAt).getTime()) / 60000)
            const timeLabel = mins < 1 ? 'Just Started' : `${mins}m Active`
            return { ...t, status: 'occupied' as const, sessions, time: timeLabel }
        }
        return { ...t, status: 'vacant' as const, sessions: [], time: undefined }
    })

    const occupiedCount = tables.filter(t => t.status === 'occupied').length

    const displayedTables = tables.filter(t => {
        if (filter === 'occupied') return t.status === 'occupied'
        if (filter === 'vacant') return t.status === 'vacant'
        return true
    })

    const handleStartNewSession = (tableId: string, groupName?: string) => {
        const sid = startSession(tableId, groupName)
        clearOrder()
        setOrderType('dine-in')
        setTableNumber(tableId)
        setSessionId(sid)
        onStartOrder()
    }

    const handleContinueSession = (sessionId: string, tableId: string) => {
        const session = occupiedSessions[sessionId]
        if (!session) return
        setItems(session.items ?? [])
        setOrderType('dine-in')
        setTableNumber(tableId)
        setSessionId(sessionId)
        setIsSessionsModalOpen(false)
        onStartOrder()
    }

    const focusedTable = tables.find(t => t.id === selectedTable) ||
        (selectedTable ? {
            id: selectedTable,
            status: 'vacant' as const,
            sessions: [],
            time: undefined,
            capacity: 4,
            x: 0, y: 0,
            width: 120, height: 120,
            shape: 'rectangle' as const
        } : null)

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full">
            <div className="flex-1 w-full bg-surface flex flex-col h-full overflow-hidden">
                <div className="px-3 py-2 md:p-8 md:pb-4 shrink-0">
                    {/* Mobile: compact one-line header */}
                    <div className="flex items-center justify-between gap-2 mb-2 md:hidden">
                        <div className="flex items-center gap-2">
                            <h1 className="font-headline font-black text-lg text-on-surface tracking-tight">Tables</h1>
                        </div>
                        <button onClick={openAddModal} className="bg-primary text-on-primary pl-3 pr-4 py-2 rounded-full flex items-center gap-1.5 font-bold text-xs hover:opacity-90 min-h-[36px]">
                            <span className="material-symbols-outlined text-base">add</span>
                            Add Table
                        </button>
                    </div>

                    {/* Desktop: full header */}
                    <div className="hidden md:flex justify-between items-end mb-8">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                                    <span className="material-symbols-outlined text-2xl">grid_view</span>
                                </div>
                                <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Tables</h1>
                            </div>
                            <p className="text-on-surface-variant font-medium ml-1">Select a table to start or view an order.</p>
                        </div>
                        <button onClick={openAddModal} className="bg-primary text-on-primary px-4 py-3 rounded-lg flex items-center gap-2 font-semibold text-sm hover:opacity-90 transition-colors">
                            <span className="material-symbols-outlined">add</span>
                            Add Table
                        </button>
                    </div>

                    {/* Toolbar — scrollable on mobile */}
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                        <button onClick={() => setFilter('all')} className={`shrink-0 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${filter === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface'}`}>
                            <span className="material-symbols-outlined text-sm">filter_list</span> All
                        </button>
                        <button onClick={() => setFilter('occupied')} className={`shrink-0 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filter === 'occupied' ? 'bg-error text-white shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}>
                            Busy ({occupiedCount})
                        </button>
                        <div className="w-[1px] self-stretch bg-outline-variant/30 mx-1 shrink-0"></div>
                        <button onClick={() => {
                            if (document.startViewTransition) {
                                document.startViewTransition(() => {
                                    setDesignMode(prev => !prev)
                                })
                            } else {
                                setDesignMode(!designMode)
                            }
                        }} className={`shrink-0 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${designMode ? 'bg-warning text-on-warning shadow-lg animate-pulse' : 'bg-surface-container-low text-on-surface-variant'}`}>
                            <span className="material-symbols-outlined text-sm">{designMode ? 'done' : 'edit'}</span>
                            {designMode ? 'Done' : 'Edit Tables'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 md:px-8 md:pb-8 custom-scrollbar">
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                        {displayedTables.map(table => {
                            const isOccupied = table.status === 'occupied'
                            const isSelected = selectedTable === table.id
                            return (
                                <button
                                    key={`grid-${table.id}`}
                                    onClick={() => {
                                        if (designMode) {
                                            openEditModal(table)
                                        } else {
                                            setSelectedTable(table.id)
                                            setIsOrderSummaryModalOpen(true)
                                        }
                                    }}
                                    className={`
                                        relative flex flex-col items-center justify-center p-6 rounded-3xl border transition-all min-h-[120px] shadow-sm select-none
                                        ${designMode ? 'border-dashed border-outline-variant/60 hover:bg-surface-container hover:border-primary' : ''}
                                        ${isOccupied 
                                            ? 'bg-error/10 border-error/20 text-error' 
                                            : (!designMode ? 'bg-surface-container-lowest border-outline-variant/10 text-on-surface hover:bg-surface-container-highest/80' : '')
                                        }
                                        ${isSelected && !designMode ? '!ring-2 !ring-primary !border-primary shadow-md' : ''}
                                        ${designMode ? 'animate-in zoom-in-95 duration-200' : ''}
                                    `}
                                >
                                    <span className="font-headline font-black text-3xl">{table.id.replace('TBL-', '')}</span>
                                    <span className="text-sm font-bold opacity-60 uppercase tracking-widest mt-1">{table.capacity} Seats</span>
                                    
                                    {table.needsCleaning && !designMode && (
                                        <div className="absolute top-2 right-2 bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md animate-pulse">
                                            <span className="material-symbols-outlined text-[16px] font-bold">cleaning_services</span>
                                        </div>
                                    )}

                                    {/* Server Flag */}
                                    {!designMode && cashiers.filter(c => c.role === 'server' && c.assignedTables?.includes(table.id)).map((c, idx) => (
                                        <div
                                            key={`grid-${c.id}`}
                                            className="absolute bottom-3 right-3 w-6 h-6 rounded-full shadow-sm flex items-center justify-center text-[10px] font-bold text-white border-2 border-surface"
                                            style={{ backgroundColor: getHashColor(c.id), right: `${idx * -12 + 12}px` }}
                                            title={`Assigned to ${c.name}`}
                                        >
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                    ))}

                                    {designMode && (
                                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-surface-container-high text-primary rounded-full shadow-lg flex items-center justify-center border border-primary/20 hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                        {designMode && (
                            <button
                                onClick={openAddModal}
                                className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all min-h-[120px] shadow-sm select-none"
                            >
                                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-xl">add</span>
                                </div>
                                <span className="font-bold text-sm tracking-wide">Add Table</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isTableModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsTableModalOpen(false)}>
                    <div className="bg-surface rounded-3xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 md:p-8 border-b border-outline-variant/20">
                            <h2 className="text-2xl font-headline font-black text-on-surface">{editingTable ? 'Edit Table' : 'Add Table'}</h2>
                            <button onClick={() => setIsTableModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveTable} className="p-6 md:p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant px-1">Table Name or Number</label>
                                <input type="text" required value={tableForm.id} onChange={e => setTableForm({ ...tableForm, id: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl px-6 py-4 text-on-surface font-headline font-bold focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="e.g. TBL-01" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant px-1">Number of Seats</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[2, 4, 6, 8, 10, 12, 16].map(c => (
                                        <button key={c} type="button" onClick={() => setTableForm({ ...tableForm, capacity: c })} className={`py-4 rounded-2xl border-2 font-black transition-all ${tableForm.capacity === c ? 'bg-primary border-primary text-white scale-105 shadow-lg' : 'bg-surface-container-lowest border-outline-variant/20 hover:border-primary/30'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant px-1">Table Shape</label>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setTableForm({ ...tableForm, shape: 'rectangle' })} className={`flex-1 py-4 rounded-2xl border-2 font-black flex items-center justify-center gap-2 transition-all ${tableForm.shape === 'rectangle' ? 'bg-primary border-primary text-white' : 'bg-surface-container-lowest border-outline-variant/20'}`}>
                                        <span className="material-symbols-outlined">square</span> Rectangle
                                    </button>
                                    <button type="button" onClick={() => setTableForm({ ...tableForm, shape: 'circle' })} className={`flex-1 py-4 rounded-2xl border-2 font-black flex items-center justify-center gap-2 transition-all ${tableForm.shape === 'circle' ? 'bg-primary border-primary text-white' : 'bg-surface-container-lowest border-outline-variant/20'}`}>
                                        <span className="material-symbols-outlined">circle</span> Round
                                    </button>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                {editingTable && (
                                    <button type="button" onClick={handleDeleteTable} className="px-8 py-4 bg-error/10 text-error hover:bg-error rounded-xl font-black transition-all hover:text-white mr-auto">Remove Table</button>
                                )}
                                <button type="submit" className="flex-1 py-4 bg-primary text-on-primary font-black rounded-2xl hover:opacity-90 shadow-xl shadow-primary/20 transition-all">{editingTable ? 'Save Changes' : 'Add Table'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isServerModalOpen && focusedTable && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsServerModalOpen(false)}>
                    <div className="bg-surface rounded-3xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
                            <div>
                                <h2 className="text-xl font-headline font-black text-on-surface">Assign Staff to Table</h2>
                                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Table {focusedTable.id.replace('TBL-', '')}</p>
                            </div>
                            <button onClick={() => setIsServerModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2">
                            {cashiers.filter(c => c.role === 'server').length === 0 ? (
                                <p className="text-center text-sm font-bold text-on-surface-variant py-8">No staff with a Server role found. Add staff in Settings.</p>
                            ) : (
                                cashiers.filter(c => c.role === 'server').map(server => {
                                    const isAssigned = server.assignedTables?.includes(focusedTable.id)
                                    return (
                                        <button
                                            key={server.id}
                                            onClick={() => toggleServerAssignment(server, focusedTable.id)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isAssigned ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface hover:border-primary/50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm" style={{ backgroundColor: getHashColor(server.id) }}>
                                                    {server.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-headline font-black text-lg">{server.name}</span>
                                            </div>
                                            {isAssigned && <span className="material-symbols-outlined font-black">check_circle</span>}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isSessionsModalOpen && focusedTable && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsSessionsModalOpen(false)}>
                    <div className="bg-surface rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-outline-variant/20">
                            <div>
                                <h2 className="text-xl font-headline font-black text-on-surface">Active Sessions</h2>
                                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Table {focusedTable.id.replace('TBL-', '')}</p>
                            </div>
                            <button onClick={() => setIsSessionsModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {(!focusedTable.sessions || focusedTable.sessions.length === 0) ? (
                                <p className="text-center text-sm font-bold text-on-surface-variant py-8">No active orders for this table.</p>
                            ) : (
                                focusedTable.sessions.map(session => (
                                    <div key={session.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 flex flex-col shadow-sm hover:border-primary/30 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="font-headline font-black text-on-surface">{session.label}</p>
                                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">₹{session.items?.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)} • {session.items?.reduce((s, i) => s + i.quantity, 0)} Items</p>
                                            </div>
                                            <button onClick={() => {
                                                endSession(session.id);
                                                if (focusedTable.sessions?.length === 1) setIsSessionsModalOpen(false); // Close if it was the last session
                                            }} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-colors">
                                                <span className="material-symbols-outlined text-lg">logout</span>
                                            </button>
                                        </div>
                                        <button onClick={() => handleContinueSession(session.id, focusedTable.id)} className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">Open this order</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isOrderSummaryModalOpen && focusedTable && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsOrderSummaryModalOpen(false)}>
                    <div className="bg-surface rounded-3xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-outline-variant/20 bg-surface-container-lowest">
                            <div>
                                <h2 className="text-2xl font-headline font-black text-on-surface">Table {focusedTable.id.replace('TBL-', '')}</h2>
                                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">{focusedTable.status === 'occupied' ? 'Occupied' : 'Vacant'}</p>
                            </div>
                            <button onClick={() => setIsOrderSummaryModalOpen(false)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Capacity</span>
                                    <span className="font-bold text-on-surface">{focusedTable.capacity} Seats</span>
                                </div>
                                <div 
                                    onClick={() => { setIsOrderSummaryModalOpen(false); setIsServerModalOpen(true); }}
                                    className="flex justify-between items-center cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Servers</span>
                                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                                    </div>
                                    <div className="flex gap-1 justify-end flex-wrap max-w-[200px]">
                                        {cashiers.filter(c => c.role === 'server' && c.assignedTables?.includes(focusedTable.id)).map(c => (
                                            <div key={c.id} className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-sm" style={{ backgroundColor: getHashColor(c.id) }}>{c.name}</div>
                                        ))}
                                        {cashiers.filter(c => c.role === 'server' && c.assignedTables?.includes(focusedTable.id)).length === 0 && (
                                            <span className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Unassigned</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Cleaning needed</span>
                                    <button 
                                        onClick={() => updateTable(focusedTable.id, { ...focusedTable, needsCleaning: !focusedTable.needsCleaning } as TableDef)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${focusedTable.needsCleaning ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">{focusedTable.needsCleaning ? 'cleaning_services' : 'mop'}</span>
                                        {focusedTable.needsCleaning ? 'Mark as clean' : 'Mark as dirty'}
                                    </button>
                                </div>
                                {focusedTable.status === 'occupied' && 'time' in focusedTable && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Time at table</span>
                                        <span className="font-bold text-error">{focusedTable.time}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-outline-variant/20 space-y-3">
                                {focusedTable.status === 'occupied' ? (
                                    <>
                                        <button onClick={() => { setIsOrderSummaryModalOpen(false); setIsSessionsModalOpen(true); }} className="w-full py-4 bg-primary text-on-primary rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">receipt_long</span>
                                            View Orders ({focusedTable.sessions?.length || 0})
                                        </button>
                                        <button onClick={() => { setIsOrderSummaryModalOpen(false); handleStartNewSession(focusedTable.id, `Group ${String.fromCharCode(65 + (focusedTable.sessions?.length || 0))}`); }} className="w-full py-3 bg-surface-container-lowest text-primary border-2 border-primary/20 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-sm">add</span> Add New Group
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => { setIsOrderSummaryModalOpen(false); handleStartNewSession(focusedTable.id); }} className="w-full py-4 bg-primary text-on-primary rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined">restaurant</span>
                                        Start New Order
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
