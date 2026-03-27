import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrderItem } from '../types/order'

export interface TableSession {
    id: string
    tableId: string
    label: string
    startedAt: Date
    items: OrderItem[]
}

export interface TableDef {
    id: string
    capacity: number
    x: number
    y: number
    width: number
    height: number
    shape: 'rectangle' | 'circle'
    needsCleaning?: boolean
}

interface TablesState {
    tables: TableDef[]
    occupiedSessions: Record<string, TableSession>

    // Config Actions
    addTable: (table: TableDef) => void
    updateTable: (id: string, table: TableDef) => void
    deleteTable: (id: string) => void

    // Session Actions
    startSession: (tableId: string, groupLabel?: string) => string // returns sessionId
    endSession: (sessionId: string) => void
    updateSessionItems: (sessionId: string, items: OrderItem[]) => void
}

const BASE_TABLES: TableDef[] = [
    { id: 'TBL-01', capacity: 4, x: 5, y: 5, width: 120, height: 120, shape: 'rectangle' },
    { id: 'TBL-02', capacity: 2, x: 20, y: 5, width: 80, height: 80, shape: 'circle' },
    { id: 'TBL-03', capacity: 6, x: 35, y: 5, width: 180, height: 100, shape: 'rectangle' },
    { id: 'TBL-04', capacity: 4, x: 5, y: 25, width: 120, height: 120, shape: 'rectangle' },
    { id: 'TBL-05', capacity: 8, x: 25, y: 25, width: 220, height: 100, shape: 'rectangle' },
    { id: 'TBL-06', capacity: 2, x: 50, y: 25, width: 80, height: 80, shape: 'circle' },
]

export const useTablesStore = create<TablesState>()(
    persist(
        (set) => ({
            tables: BASE_TABLES,
            occupiedSessions: {},

            addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
            updateTable: (id, newTable) => set((state) => ({
                tables: state.tables.map(t => t.id === id ? newTable : t)
            })),
            deleteTable: (id) => set((state) => {
                const nextSessions = { ...state.occupiedSessions }
                Object.keys(nextSessions).forEach(sid => {
                    const session = nextSessions[sid]
                    if (session && session.tableId === id) delete nextSessions[sid]
                })
                return {
                    tables: state.tables.filter(t => t.id !== id),
                    occupiedSessions: nextSessions
                }
            }),

            startSession: (tableId, groupLabel) => {
                const sessionId = `${tableId}-${Date.now()}`
                set((state) => ({
                    occupiedSessions: {
                        ...state.occupiedSessions,
                        [sessionId]: {
                            id: sessionId,
                            tableId,
                            label: groupLabel || `Table ${tableId}`,
                            startedAt: new Date(),
                            items: [],
                        },
                    },
                }))
                return sessionId
            },

            endSession: (sessionId) =>
                set((state) => {
                    const next = { ...state.occupiedSessions }
                    delete next[sessionId]
                    return { occupiedSessions: next }
                }),

            updateSessionItems: (sessionId, items) =>
                set((state) => {
                    const session = state.occupiedSessions[sessionId]
                    if (!session) return state
                    return {
                        occupiedSessions: {
                            ...state.occupiedSessions,
                            [sessionId]: { ...session, items }
                        }
                    }
                }),
        }),
        {
            name: 'pos-tables-storage',
            // since dates get serialized to strings in localStorage, we must revive them
            onRehydrateStorage: () => (state) => {
                if (state?.occupiedSessions) {
                    for (const key in state.occupiedSessions) {
                        const session = state.occupiedSessions[key];
                        if (session) {
                            session.startedAt = new Date(session.startedAt)
                        }
                    }
                }
            }
        }
    )
)
