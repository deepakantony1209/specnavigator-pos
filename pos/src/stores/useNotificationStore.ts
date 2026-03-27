import { create } from 'zustand'
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../lib/firebase'

export interface AppNotification {
    id: string
    type: 'item_ready' | 'order_ready' | 'system'
    title: string
    message: string
    orderId?: string
    tableNumber?: string
    itemName?: string
    createdAt: string
    isRead: boolean
}

interface NotificationState {
    notifications: AppNotification[]
    unreadCount: number
    isLoading: boolean
    init: () => () => void
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: true,

    init: () => {
        const q = query(
            collection(db, `restaurants/${RESTAURANT_ID}/notifications`),
            orderBy('createdAt', 'desc')
        )

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as AppNotification))
            set({
                notifications: list,
                unreadCount: list.filter(n => !n.isRead).length,
                isLoading: false
            })
        })

        return unsub
    },

    markAsRead: async (id) => {
        const ref = doc(db, `restaurants/${RESTAURANT_ID}/notifications/${id}`)
        await updateDoc(ref, { isRead: true })
    },

    markAllAsRead: async () => {
        const { notifications } = get()
        const unread = notifications.filter(n => !n.isRead)
        const promises = unread.map(n =>
            updateDoc(doc(db, `restaurants/${RESTAURANT_ID}/notifications/${n.id}`), { isRead: true })
        )
        await Promise.all(promises)
    }
}))
