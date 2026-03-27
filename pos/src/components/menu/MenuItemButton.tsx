import { useRef, useCallback } from 'react'
import type { MenuItem } from '../../types/menu'
import { MenuItemImage } from './MenuItemImage'
import { formatAmount } from '../../lib/billing'

interface MenuItemButtonProps {
    item: MenuItem
    onAdd: (item: MenuItem) => void
    onDecrement: (id: string) => void
}

const LONG_PRESS_MS = 500

export function MenuItemButton({ item, onAdd, onDecrement }: MenuItemButtonProps) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const longPressedRef = useRef(false)

    const startPress = useCallback(() => {
        longPressedRef.current = false
        timerRef.current = setTimeout(() => {
            longPressedRef.current = true
            onDecrement(item.id)
        }, LONG_PRESS_MS)
    }, [item.id, onDecrement])

    const endPress = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        if (!longPressedRef.current) {
            onAdd(item)
        }
        longPressedRef.current = false
    }, [item, onAdd])

    return (
        <button
            id={`menu-item-${item.id}`}
            className="group relative bg-surface-container-lowest rounded-xl flex flex-col overflow-hidden active:scale-95 transition-all duration-200 select-none w-full border border-outline-variant/5 shadow-sm hover:shadow-md hover:border-primary/20"
            style={{ aspectRatio: '1 / 1' }}
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={() => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current)
                    timerRef.current = null
                }
            }}
            onContextMenu={e => e.preventDefault()}
        >
            {/* Item Code Badge */}
            {item.itemCode && (
                <div className="absolute top-2 right-2 z-10 scale-90 group-hover:scale-110 transition-transform origin-top-right">
                    <div className="bg-surface-container-lowest shadow-md border border-outline-variant px-2 py-1 rounded-md min-w-[32px] text-center">
                        <span className="text-[11px] font-black text-primary font-headline">#{item.itemCode}</span>
                    </div>
                </div>
            )}

            <div className="relative w-full h-[58%]">
                <MenuItemImage
                    imageUrl={item.imageUrl}
                    itemName={item.name}
                    isVeg={item.isVeg}
                />
            </div>
            <div className="flex-1 flex flex-col justify-center px-4 py-3 bg-surface-container-lowest">
                <span className="font-headline font-black text-sm md:text-base leading-tight text-on-surface line-clamp-2">
                    {item.name}
                </span>
                <div className="flex items-center justify-between mt-1">
                    <span className="font-body font-black text-sm text-primary">
                        ₹{formatAmount(item.price)}
                    </span>
                    {item.isVeg !== undefined && (
                        <div className={`w-3 h-3 border-2 p-[1px] flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                            <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </div>
                    )}
                </div>
            </div>
        </button>
    )
}
