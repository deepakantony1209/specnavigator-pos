import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    destructive?: boolean
    children?: React.ReactNode
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    destructive = false,
    children,
}: ConfirmDialogProps) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-on-surface/30 z-40" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-container-lowest rounded-xl p-6 w-[90vw] max-w-md shadow-lg">
                    <AlertDialog.Title className="font-headline font-bold text-xl text-on-surface mb-2">
                        {title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="font-body text-sm text-on-surface-variant mb-4">
                        {description}
                    </AlertDialog.Description>

                    {children && (
                        <div className="mb-4">
                            {children}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <AlertDialog.Cancel asChild>
                            <button
                                id="confirm-dialog-cancel"
                                className="min-h-[48px] px-5 rounded-lg bg-surface-container-high text-on-surface font-body font-semibold text-sm"
                            >
                                {cancelLabel}
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                id="confirm-dialog-confirm"
                                onClick={onConfirm}
                                className={`min-h-[48px] px-5 rounded-lg font-body font-bold text-sm ${destructive
                                        ? 'bg-error text-on-primary'
                                        : 'bg-primary text-on-primary'
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
