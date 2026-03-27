import { useNotificationStore } from '../../stores/useNotificationStore'
import { format } from 'date-fns'

interface NotificationPanelProps {
    onClose: () => void
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
    const { notifications, markAsRead, markAllAsRead } = useNotificationStore()

    return (
        <div className="absolute right-0 top-12 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl z-[100] flex flex-col max-h-[480px]">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
                <h3 className="font-headline font-black text-sm uppercase tracking-wider text-on-surface">Alerts</h3>
                <button
                    onClick={() => markAllAsRead()}
                    className="text-[10px] font-black uppercase text-primary hover:underline hover:underline-offset-4"
                >
                    Mark all as read
                </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-4xl">notifications_off</span>
                        <p className="text-xs text-on-surface-variant font-medium">Nothing here yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {notifications.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => {
                                    markAsRead(n.id)
                                    // Maybe navigate to order?
                                }}
                                className={`p-4 border-b border-outline-variant/30 text-left transition-colors hover:bg-surface-container-high relative ${!n.isRead ? 'bg-primary/5' : ''}`}
                            >
                                {!n.isRead && (
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                                )}
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${n.type === 'item_ready' ? 'text-green-500' : 'text-primary'}`}>
                                        {n.type === 'item_ready' ? 'Food Ready' : 'Notice'}
                                    </span>
                                    <span className="text-[10px] text-outline font-medium">
                                        {format(new Date(n.createdAt), 'HH:mm')}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-on-surface leading-tight">
                                    {n.itemName} — Table {n.tableNumber || 'TKW'}
                                </p>
                                <p className="text-[10px] text-on-surface-variant mt-1 line-clamp-1">
                                    Order #{n.orderId?.substring(0, 8)} is ready to be picked up.
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={onClose}
                className="p-3 text-center text-[10px] font-black uppercase text-outline hover:text-on-surface transition-colors border-t border-outline-variant/50"
            >
                Dismiss
            </button>
        </div>
    )
}
