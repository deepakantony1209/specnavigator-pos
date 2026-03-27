interface CategoryTabsProps {
    categories: Array<{ id: string; name: string }>
    activeId: string
    onSelect: (id: string) => void
}

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
    return (
        <div
            className="flex gap-2 overflow-x-auto pb-2 shrink-0 hide-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {categories.map(cat => (
                <button
                    key={cat.id}
                    id={`category-tab-${cat.id}`}
                    onClick={() => onSelect(cat.id)}
                    className={`
            shrink-0 px-4 py-2 min-h-[44px] rounded-full font-body font-semibold text-sm whitespace-nowrap
            ${cat.id === activeId
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-highest text-on-surface'
                        }
          `}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    )
}
