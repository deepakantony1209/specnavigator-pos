import type { MenuItem } from '../../types/menu'
import { MenuItemButton } from './MenuItemButton'

interface MenuGridProps {
    items: MenuItem[]
    onAdd: (item: MenuItem) => void
    onDecrement: (id: string) => void
}

export function MenuGrid({ items, onAdd, onDecrement }: MenuGridProps) {
    if (items.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body text-sm">
                No items in this category.
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
                {items.map(item => (
                    <MenuItemButton
                        key={item.id}
                        item={item}
                        onAdd={onAdd}
                        onDecrement={onDecrement}
                    />
                ))}
            </div>
        </div>
    )
}
