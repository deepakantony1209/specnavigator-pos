import type { OrderType } from '../../types/order'

const TYPES: Array<{ value: OrderType; label: string }> = [
    { value: 'dine-in', label: 'Dine In' },
    { value: 'takeaway', label: 'Takeaway' },
]

interface OrderTypeSelectorProps {
    selected: OrderType | null
    onSelect: (type: OrderType) => void
    disabledTypes?: OrderType[]
}

export function OrderTypeSelector({ selected, onSelect, disabledTypes = [] }: OrderTypeSelectorProps) {
    return (
        <div className="flex h-14 shrink-0 border-b border-outline-variant">
            {TYPES.map(({ value, label }) => {
                const isDisabled = disabledTypes.includes(value)
                return (
                    <button
                        key={value}
                        id={`order-type-${value}`}
                        onClick={() => !isDisabled && onSelect(value)}
                        disabled={isDisabled}
                        className={`
                            flex-1 text-xs font-body font-bold uppercase tracking-widest flex items-center justify-center
                            ${selected === value
                                ? 'bg-surface-container-lowest text-primary border-b-2 border-primary'
                                : 'bg-transparent text-on-surface-variant'
                            }
                            ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                        `}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    )
}
