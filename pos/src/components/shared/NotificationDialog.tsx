import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface NotificationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    type: 'success' | 'error' | 'info'
    confirmLabel?: string
}

export function NotificationDialog({
    open,
    onOpenChange,
    title,
    description,
    type,
    confirmLabel = 'Got it',
}: NotificationDialogProps) {
    const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'
    const colorClass = type === 'success' ? 'text-green-500' : type === 'error' ? 'text-error' : 'text-primary'

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-surface-container-lowest rounded-2xl p-8 w-[90vw] max-w-sm shadow-2xl border border-outline-variant/10 animate-in fade-in zoom-in duration-200">
                    <div className="flex flex-col items-center text-center">
                        <div className={`mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-surface-container-high ${colorClass}`}>
                            <span className="material-symbols-outlined text-4xl">{icon}</span>
                        </div>

                        <AlertDialog.Title className="font-headline font-black text-2xl text-on-surface mb-2 tracking-tight">
                            {title}
                        </AlertDialog.Title>

                        <AlertDialog.Description className="font-body text-base text-on-surface-variant mb-8 leading-relaxed">
                            {description}
                        </AlertDialog.Description>

                        <AlertDialog.Action asChild>
                            <button
                                id="notification-dialog-confirm"
                                className={`w-full py-4 rounded-xl font-body font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] ${type === 'error'
                                        ? 'bg-error text-on-error shadow-lg shadow-error/20'
                                        : 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                                    }`}
                            >
                                {confirmLabel}
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
