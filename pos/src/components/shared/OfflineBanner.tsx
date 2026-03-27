import { useOfflineStatus } from '../../hooks/useOfflineStatus'

export function OfflineBanner() {
    const isOffline = useOfflineStatus()

    if (!isOffline) return null

    return (
        <div
            id="offline-banner"
            className="w-full bg-error text-on-primary text-xs font-body font-bold uppercase tracking-widest py-2 text-center"
        >
            You're offline. New orders will save and sync when you reconnect.
        </div>
    )
}
