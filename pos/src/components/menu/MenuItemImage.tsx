import { useState, useEffect } from 'react'

interface MenuItemImageProps {
    imageUrl: string
    itemName: string
    isVeg: boolean
}

export function MenuItemImage({ imageUrl, itemName, isVeg }: MenuItemImageProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [errored, setErrored] = useState(false)

    useEffect(() => {
        let active = true
        setLoaded(false)
        setErrored(false)

        const key = import.meta.env.VITE_POLLINATIONS_KEY || ''

        async function fetchImage() {
            try {
                const response = await fetch(imageUrl, {
                    headers: {
                        'Authorization': `Bearer ${key}`
                    }
                })

                if (!response.ok) throw new Error(`HTTP ${response.status}`)

                const blob = await response.blob()
                if (active) {
                    setBlobUrl(URL.createObjectURL(blob))
                    setLoaded(true)
                    console.log(`✅ Image fetched for ${itemName}`)
                }
            } catch (e) {
                console.error(`❌ Image fetch failed for ${itemName}:`, e)
                if (active) setErrored(true)
            }
        }

        fetchImage()

        return () => {
            active = false
            if (blobUrl) URL.revokeObjectURL(blobUrl)
        }
    }, [imageUrl, itemName])

    return (
        <div className="relative w-full h-full">
            {/* Veg/non-veg indicator */}
            <span
                className={`absolute top-2 left-2 z-20 w-2 h-2 rounded-none ${isVeg ? 'bg-green-600' : 'bg-red-600'}`}
                aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            />

            {/* Placeholder background */}
            <div
                className={`absolute inset-0 bg-surface-container z-0 ${loaded && !errored ? 'opacity-0' : 'opacity-100'}`}
            />

            {loaded && blobUrl && !errored && (
                <img
                    src={blobUrl}
                    alt={itemName}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                />
            )}
        </div>
    )
}
