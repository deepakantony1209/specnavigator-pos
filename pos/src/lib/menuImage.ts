export function generateMenuImageUrl(itemName: string): string {
    const slug = itemName.trim().replace(/\s+/g, "-")
    return `https://gen.pollinations.ai/image/${slug}-Food-Photography?model=flux`
}
