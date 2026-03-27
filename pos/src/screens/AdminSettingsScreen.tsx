import { useState, useEffect } from 'react'
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useTablesStore } from '../stores/useTablesStore'
import { hashPin } from '../lib/auth'
import type { Cashier } from '../types/cashier'
import type { RestaurantSettings } from '../types/settings'

export function AdminSettingsScreen() {
    const { settings, setSettings } = useSettingsStore()
    const [form, setForm] = useState<RestaurantSettings>(settings)
    const [saved, setSaved] = useState(false)

    const [cashiers, setCashiers] = useState<Cashier[]>([])
    const [newStaff, setNewStaff] = useState({ name: '', pin: '', role: 'server' as Cashier['role'], tables: [] as string[] })
    const [adding, setAdding] = useState(false)
    const { tables } = useTablesStore()

    // unified Staff editing state
    const [editingStaff, setEditingStaff] = useState<Cashier | null>(null)
    const [editForm, setEditForm] = useState({ name: '', pin: '', role: 'server' as Cashier['role'], tables: [] as string[] })
    const [showEditPin, setShowEditPin] = useState(false)
    const [handoverFrom, setHandoverFrom] = useState<string>('')
    const [handoverTo, setHandoverTo] = useState<string>('')
    const [isHandoverProcessing, setIsHandoverProcessing] = useState(false)
    const [activeTab, setActiveTab] = useState<'profile' | 'staff' | 'handover'>('profile')

    useEffect(() => {
        const ref = doc(db, `restaurants/${RESTAURANT_ID}/settings/${RESTAURANT_ID}`)
        const unsub = onSnapshot(ref, snap => {
            if (snap.exists()) {
                const data = snap.data() as RestaurantSettings
                setSettings(data)
                setForm(data)
            }
        })
        return () => unsub()
    }, [setSettings])

    useEffect(() => {
        const unsub = onSnapshot(collection(db, `restaurants/${RESTAURANT_ID}/cashiers`), snap => {
            setCashiers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Cashier)))
        })
        return () => unsub()
    }, [])

    const handleSave = async () => {
        await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/settings/${RESTAURANT_ID}`), form)
        setSettings(form)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const handleAddStaff = async () => {
        if (!newStaff.name || newStaff.pin.length !== 4) return
        setAdding(true)
        try {
            const id = crypto.randomUUID()
            const pinHash = await hashPin(newStaff.pin)
            const staff: Cashier = {
                id,
                name: newStaff.name,
                role: newStaff.role,
                pin: newStaff.pin,
                pinHash,
                isActive: true,
                createdAt: new Date(),
                assignedTables: newStaff.role === 'server' ? newStaff.tables : []
            }
            await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers/${id}`), staff)
            setNewStaff({ name: '', pin: '', role: 'server', tables: [] })
        } catch (e) {
            console.error(e)
        } finally {
            setAdding(false)
        }
    }

    const deleteStaff = async (id: string) => {
        if (confirm('Delete this staff member?')) {
            await deleteDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers/${id}`))
            setEditingStaff(null)
        }
    }

    const handleSaveStaff = async () => {
        if (!editingStaff) return
        const updates: any = {
            name: editForm.name,
            role: editForm.role,
            assignedTables: editForm.tables
        }
        if (editForm.pin.length === 4) {
            updates.pin = editForm.pin
            updates.pinHash = await hashPin(editForm.pin)
        }
        await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers/${editingStaff.id}`), updates, { merge: true })
        setEditingStaff(null)
    }

    const handleHandover = async () => {
        if (!handoverFrom || !handoverTo || handoverFrom === handoverTo) return
        setIsHandoverProcessing(true)
        try {
            const fromServer = cashiers.find(c => c.id === handoverFrom)
            const toServer = cashiers.find(c => c.id === handoverTo)
            if (!fromServer || !toServer) return

            // Combine tables, ensure no duplicates
            const mergedTables = [...new Set([...(toServer.assignedTables || []), ...(fromServer.assignedTables || [])])]

            // Update backup server
            await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers/${toServer.id}`), {
                assignedTables: mergedTables
            }, { merge: true })

            // Clear departing server
            await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers/${fromServer.id}`), {
                assignedTables: []
            }, { merge: true })

            setHandoverFrom('')
            setHandoverTo('')
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (e) {
            console.error(e)
        } finally {
            setIsHandoverProcessing(false)
        }
    }

    const openEdit = (staff: Cashier) => {
        setEditingStaff(staff)
        setEditForm({
            name: staff.name,
            pin: staff.pin || '', // Use the stored plain PIN
            role: staff.role,
            tables: staff.assignedTables || []
        })
    }

    const toggleTable = (tableId: string) => {
        setEditForm(prev => ({
            ...prev,
            tables: prev.tables.includes(tableId)
                ? prev.tables.filter(t => t !== tableId)
                : [...prev.tables, tableId]
        }))
    }

    const toggleNewTable = (tableId: string) => {
        setNewStaff(prev => ({
            ...prev,
            tables: prev.tables.includes(tableId)
                ? prev.tables.filter(t => t !== tableId)
                : [...prev.tables, tableId]
        }))
    }

    return (
        <div className="flex-1 w-full h-full bg-surface overflow-y-auto custom-scrollbar pb-20">
            <div className="w-full px-4 py-6 md:px-8 md:py-10">
                {/* Standardized Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                            </div>
                            <h1 className="font-headline font-black text-4xl text-on-surface tracking-tighter">Management Center</h1>
                        </div>
                        <p className="text-on-surface-variant font-medium ml-1">Set up your restaurant profile, taxes, and staff accounts.</p>
                    </div>

                    <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/20 shadow-inner gap-1 w-full md:w-fit mt-4 md:mt-0">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 md:flex-none px-2 md:px-6 py-3 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 md:gap-2 ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                        >
                            <span className="material-symbols-outlined text-[16px] md:text-sm">settings</span>
                            <span className="hidden sm:inline">Restaurant</span>
                            <span className="sm:hidden">Info</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('staff')}
                            className={`flex-1 md:flex-none px-2 md:px-6 py-3 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 md:gap-2 ${activeTab === 'staff' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                        >
                            <span className="material-symbols-outlined text-[16px] md:text-sm">badge</span>
                            Staff
                        </button>
                        <button 
                            onClick={() => setActiveTab('handover')}
                            className={`flex-1 md:flex-none px-2 md:px-6 py-3 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 md:gap-2 ${activeTab === 'handover' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                        >
                            <span className="material-symbols-outlined text-[16px] md:text-sm">sync_alt</span>
                            <span className="hidden sm:inline">Table Transfer</span>
                            <span className="sm:hidden">Transfer</span>
                        </button>
                    </div>

                </div>


                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="w-full max-w-2xl mx-auto">
                            <section className="bg-surface-container-lowest p-10 rounded-[2.5rem] border border-outline-variant/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                
                                <div className="relative z-10 space-y-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">restaurant</span>
                                            Restaurant Info
                                        </h2>
                                        {saved && (
                                            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                Saved
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {([
                                            { id: 'restaurantName', label: 'Business Name', icon: 'store' },
                                            { id: 'address', label: 'Location / Address', icon: 'location_on' },
                                            { id: 'phone', label: 'Contact Number', icon: 'call' },
                                        ] as const).map(({ id, label, icon }) => (
                                            <div key={id}>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">{label}</label>
                                                <div className="relative group">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">{icon}</span>
                                                    <input
                                                        type="text"
                                                        value={form[id as keyof RestaurantSettings] as string}
                                                        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                                                        className="w-full border border-outline-variant/30 rounded-2xl pl-12 pr-4 py-4 font-body text-sm bg-surface-container-low outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-on-surface hover:bg-surface-container-high shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">CGST Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={form.cgstPercent}
                                                onChange={e => setForm(f => ({ ...f, cgstPercent: parseFloat(e.target.value) || 0 }))}
                                                className="w-full border border-outline-variant/30 rounded-2xl px-4 py-4 font-headline font-black text-lg bg-surface-container-low outline-none focus:ring-4 focus:ring-primary/10 text-center transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">SGST Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={form.sgstPercent}
                                                onChange={e => setForm(f => ({ ...f, sgstPercent: parseFloat(e.target.value) || 0 }))}
                                                className="w-full border border-outline-variant/30 rounded-2xl px-4 py-4 font-headline font-black text-lg bg-surface-container-low outline-none focus:ring-4 focus:ring-primary/10 text-center transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">Packing Fee (per item)</label>
                                        <div className="relative group">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">₹</span>
                                            <input
                                                type="number"
                                                value={form.packingChargePerItem}
                                                onChange={e => setForm(f => ({ ...f, packingChargePerItem: parseFloat(e.target.value) || 0 }))}
                                                className="w-full border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-4 font-headline font-black text-lg bg-surface-container-low focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">Master Admin PIN (4 Digits)</label>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            value={form.adminPin}
                                            onChange={e => setForm(f => ({ ...f, adminPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                            className="w-full border border-outline-variant/30 rounded-2xl px-4 py-4 font-headline text-3xl tracking-[1em] text-center font-black bg-surface-container-low focus:ring-4 focus:ring-primary/10 outline-none"
                                            placeholder="••••"
                                        />
                                    </div>

                                    <button
                                        onClick={() => void handleSave()}
                                        className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0.5 transition-all mt-6"
                                    >
                                        Save Everything
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* STAFF TAB CONTENT */}
                    {activeTab === 'staff' && (
                        <div className="space-y-10">
                            {/* Staff Directory Section */}
                            <section className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <span className="material-symbols-outlined">group</span>
                                        Active Staff ({cashiers.length})
                                    </h2>
                                    <div className="text-[10px] font-bold text-on-surface-variant/40 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        System Ready
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {cashiers.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => openEdit(c)}
                                            className="group relative bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/20 hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors"></div>
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center font-black text-sm uppercase relative">
                                                {c.name.substring(0, 2)}
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface ${c.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-headline font-black text-on-surface truncate">{c.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 px-2 py-0.5 bg-surface-container rounded-md">{c.role}</span>
                                                    {c.role === 'server' && (
                                                        <span className="text-[9px] font-bold text-primary flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">grid_view</span>
                                                            {c.assignedTables?.length || 0}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">edit</span>
                                        </div>
                                    ))}
                                    
                                    <button 
                                        onClick={() => document.getElementById('staff-registry-form')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="bg-dashed border-2 border-dashed border-outline-variant/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all text-outline hover:text-primary group"
                                    >
                                        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">person_add</span>
                                        <span className="text-xs font-black uppercase tracking-widest">Add Staff Member</span>
                                    </button>
                                </div>
                            </section>

                            {/* Section Mapping (Visual) */}
                            <section className="bg-surface-container-low/30 p-8 rounded-[2rem] border border-outline-variant/10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    Table Assignment Overview
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                    {tables.map(t => {
                                        const assignee = cashiers.find(c => c.assignedTables?.includes(t.id));
                                        return (
                                            <div key={t.id} className={`shrink-0 w-32 p-4 rounded-2xl border text-center transition-all ${assignee ? 'bg-white border-primary/20 shadow-md scale-100' : 'bg-surface-half border-dashed border-outline-variant/20 opacity-80'}`}>
                                                <div className="w-10 h-10 mx-auto rounded-full bg-surface-container flex items-center justify-center text-[10px] font-black text-primary mb-3">
                                                    {t.id.replace('TBL-', '') || t.id}
                                                </div>
                                                <p className={`text-[10px] font-black truncate ${assignee ? 'text-on-surface' : 'text-outline italic opacity-50'}`}>
                                                    {assignee ? assignee.name : 'Not assigned'}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>

                            {/* Staff Registry Form */}
                            <section id="staff-registry-form" className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/30 shadow-inner">
                                <div className="max-w-4xl mx-auto space-y-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                            <span className="material-symbols-outlined text-lg">how_to_reg</span>
                                        </div>
                                        <div>
                                            <h3 className="font-headline font-black text-lg leading-tight">Add New Staff Member</h3>
                                            <p className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60 tracking-widest">Register a new staff account</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-3 px-1">Staff Name</label>
                                            <input
                                                type="text"
                                                value={newStaff.name}
                                                onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))}
                                                placeholder="e.g. Samuel"
                                                className="w-full border border-outline-variant/50 rounded-2xl px-4 py-4 text-sm bg-surface-container-low outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-3 px-1">Role</label>
                                            <select
                                                value={newStaff.role}
                                                onChange={e => setNewStaff(s => ({ ...s, role: e.target.value as any }))}
                                                className="w-full border border-outline-variant/50 rounded-2xl px-4 py-4 text-sm bg-surface-container-low outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer font-bold"
                                            >
                                                <option value="server">Server</option>
                                                <option value="kitchen">Kitchen Staff</option>
                                                <option value="cashier">Cashier</option>
                                                <option value="admin">Admin / Manager</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-3 px-1 flex justify-between">
                                                Login PIN
                                                <span className="opacity-50">(4 digits)</span>
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={4}
                                                value={newStaff.pin}
                                                onChange={e => setNewStaff(s => ({ ...s, pin: e.target.value.replace(/\D/g, '') }))}
                                                className="w-full border border-outline-variant/50 rounded-2xl px-4 py-4 text-sm bg-surface-container-low outline-none focus:ring-4 focus:ring-primary/10 text-center tracking-[1em] font-black"
                                                placeholder="0000"
                                            />
                                        </div>
                                    </div>

                                    {newStaff.role === 'server' && (
                                        <div className="bg-surface-container-low/50 p-6 rounded-3xl border border-outline-variant/10 animate-in slide-in-from-top-4 duration-300">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Assign Tables to This Staff</h4>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setNewStaff(p => ({ ...p, tables: tables.map(t => t.id) }))} className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest">Select All</button>
                                                    <button onClick={() => setNewStaff(p => ({ ...p, tables: [] }))} className="text-[9px] font-black text-error hover:underline uppercase tracking-widest">Reset</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
                                                {tables.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => toggleNewTable(t.id)}
                                                        className={`h-12 rounded-xl border-2 font-headline font-black text-[11px] transition-all flex items-center justify-center ${newStaff.tables.includes(t.id) ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-outline-variant/20 text-on-surface-variant hover:border-primary/50'}`}
                                                    >
                                                        {t.id.replace('TBL-', '')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => void handleAddStaff()}
                                        disabled={adding || !newStaff.name || newStaff.pin.length !== 4}
                                        className="w-full py-5 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
                                    >
                                        {adding ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Add Staff Member'}
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* HANDOVER TAB CONTENT */}
                    {activeTab === 'handover' && (
                        <div className="w-full max-w-3xl mx-auto py-12">
                            <section className="bg-surface-container-lowest p-12 rounded-[3rem] border border-outline-variant/30 shadow-sm relative overflow-hidden text-on-surface">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-error/5 rounded-full -ml-32 -mb-32 blur-[80px] pointer-events-none"></div>

                                <div className="relative z-10 space-y-12">
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/5">
                                            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                        </div>
                                        <h2 className="text-3xl font-headline font-black tracking-tight text-on-surface">Transfer Tables</h2>
                                        <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed">Move all tables from one staff member to another. Use this when a server is leaving their shift.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                                        <div className="absolute left-1/2 top-11 -translate-x-1/2 hidden md:flex w-10 h-10 rounded-full bg-primary/10 items-center justify-center border border-outline-variant/30 text-primary">
                                            <span className="material-symbols-outlined text-xl">trending_flat</span>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline block px-2">Staff leaving</label>
                                            <select
                                                value={handoverFrom}
                                                onChange={e => setHandoverFrom(e.target.value)}
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-6 py-5 text-sm font-bold text-on-surface outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer hover:bg-surface-container-high transition-colors"
                                            >
                                                <option value="">Select staff...</option>
                                                {cashiers.filter(c => c.role === 'server' && c.assignedTables?.length).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.assignedTables?.length} Tables)</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline block px-2">Staff taking over</label>
                                            <select
                                                value={handoverTo}
                                                onChange={e => setHandoverTo(e.target.value)}
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-6 py-5 text-sm font-bold text-on-surface outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer hover:bg-surface-container-high transition-colors"
                                            >
                                                <option value="">Select staff...</option>
                                                {cashiers.filter(c => c.role === 'server' && c.id !== handoverFrom).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleHandover}
                                        disabled={isHandoverProcessing || !handoverFrom || !handoverTo}
                                        className="w-full py-6 bg-primary text-on-primary rounded-[2rem] font-black uppercase tracking-[0.4em] text-sm shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-4 group"
                                    >
                                        {isHandoverProcessing ? (
                                            <span className="material-symbols-outlined animate-spin text-2xl">autorenew</span>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-2xl group-hover:rotate-180 transition-transform duration-500">sync</span>
                                                Transfer Tables
                                            </>
                                        )}
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Modal remains outside tabs as a global overlay */}
            {editingStaff && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-[3rem] w-full max-w-2xl mx-4 shadow-2xl overflow-hidden border border-outline-variant/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-10 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center font-headline font-black text-xl uppercase shadow-lg shadow-primary/20">
                                    {editingStaff.name.substring(0, 2)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-headline font-black text-on-surface">Edit Staff</h3>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant opacity-60">Editing: {editingStaff.name}</p>
                                </div>
                            </div>
                            <button onClick={() => deleteStaff(editingStaff.id)} className="w-12 h-12 rounded-2xl text-error hover:bg-error/10 transition-colors flex items-center justify-center group" title="Delete Profile">
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete</span>
                            </button>
                        </div>

                        <div className="p-10 overflow-y-auto flex-1 custom-scrollbar space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">person</span>
                                        Account Details
                                    </h4>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full border border-outline-variant/50 rounded-2xl px-5 py-4 text-sm bg-surface-container-low focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1">Role</label>
                                        <select
                                            value={editForm.role}
                                            onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                                            className="w-full border border-outline-variant/50 rounded-2xl px-5 py-4 text-sm bg-surface-container-low outline-none font-bold cursor-pointer"
                                        >
                                            <option value="server">Server</option>
                                            <option value="kitchen">Kitchen</option>
                                            <option value="cashier">Cashier</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-outline block mb-2 px-1 flex justify-between">
                                            Change PIN
                                            <span className="text-[8px] opacity-40 italic">Must be 4 digits</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showEditPin ? "text" : "password"}
                                                maxLength={4}
                                                value={editForm.pin}
                                                onChange={e => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '') })}
                                                className="w-full border border-outline-variant/50 rounded-2xl px-5 py-4 text-sm bg-surface-container-low outline-none text-center font-black tracking-[1em]"
                                                placeholder={editingStaff.pin ? "••••" : "•••• (Hashed)"}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditPin(!showEditPin)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                                            >
                                                <span className="material-symbols-outlined text-sm">{showEditPin ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {editForm.role === 'server' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">grid_view</span>
                                                Table Allocation
                                            </h4>
                                            <div className="flex gap-3">
                                                <button onClick={() => setEditForm(p => ({ ...p, tables: tables.map(t => t.id) }))} className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">All</button>
                                                <button onClick={() => setEditForm(p => ({ ...p, tables: [] }))} className="text-[8px] font-black text-error uppercase tracking-widest hover:underline">None</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {tables.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => toggleTable(t.id)}
                                                    className={`h-11 rounded-xl border-2 font-headline font-black text-[10px] transition-all ${editForm.tables.includes(t.id) ? 'bg-primary border-primary text-white shadow-md' : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant'}`}
                                                >
                                                    {t.id.replace('TBL-', '')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-10 bg-surface-container/50 flex gap-4 border-t border-outline-variant/10">
                            <button
                                onClick={() => setEditingStaff(null)}
                                className="flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:bg-surface-container-high transition-all rounded-2xl"
                            >
                                Discard Changes
                            </button>
                            <button
                                onClick={() => void handleSaveStaff()}
                                className="flex-[2] py-5 bg-primary text-on-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:-translate-y-1 active:translate-y-0.5 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
