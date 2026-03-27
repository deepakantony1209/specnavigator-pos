import { useState, useRef, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db, RESTAURANT_ID } from '../../lib/firebase'
import { useOrderStore } from '../../stores/useOrderStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { generateBillNumber, updateDailySummary, formatAmount, calculateTotals } from '../../lib/billing'
import { OrderTypeSelector } from './OrderTypeSelector'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { NotificationDialog } from '../shared/NotificationDialog'
import { Receipt } from './Receipt'
import { useTablesStore } from '../../stores/useTablesStore'
import type { Order, PaymentMethod } from '../../types/order'

export function OrderPanel() {
    const {
        items, orderType, tableNumber, sessionId, activeOrderId, billNumber: storeBillNumber,
        setOrderType, setTableNumber, setItemPreference,
        clearOrder, buildFinalPayload, addItem, decrementItem
    } = useOrderStore()

    const { occupiedSessions } = useTablesStore()
    const sessionLabel = sessionId ? occupiedSessions[sessionId]?.label : null

    const { cashier } = useAuthStore()
    const { settings } = useSettingsStore()

    const [clearDialogOpen, setClearDialogOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [lastOrder, setLastOrder] = useState<Order | null>(null)

    const [notification, setNotification] = useState<{
        open: boolean;
        title: string;
        description: string;
        type: 'success' | 'error' | 'info';
    }>({ open: false, title: '', description: '', type: 'info' })

    const receiptRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
    })

    const handlePay = useCallback(async (method: PaymentMethod) => {
        if (isProcessing || !cashier) return
        const payload = buildFinalPayload(method)
        if (!payload || !cashier) return

        setIsProcessing(true)
        try {
            const billToUse = storeBillNumber || await generateBillNumber(RESTAURANT_ID)
            const now = new Date()
            const order: Order = {
                id: activeOrderId || crypto.randomUUID(),
                billNumber: billToUse,
                ...payload,
                cashierId: cashier.id,
                cashierName: cashier.name,
                status: orderType === 'takeaway' ? 'preparing' : 'finalised',
                isPaid: true,
                paymentMethod: method,
                createdAt: now,
                printedAt: now,
            }

            await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/orders/${order.id}`), {
                ...order,
                createdAt: order.createdAt.toISOString(),
                printedAt: order.printedAt.toISOString(),
                isPaid: true,
                paymentMethod: method
            })

            await updateDailySummary(RESTAURANT_ID, order)

            setLastOrder(order)
            const currentType = orderType
            clearOrder()
            if (currentType === 'takeaway') {
                setOrderType('takeaway')
            }
            setNotification({
                open: true,
                title: 'Payment Successful',
                description: `Bill ${order.billNumber} has been finalised.`,
                type: 'success'
            })
            setTimeout(() => handlePrint(), 50)
        } catch (e: any) {
            console.error('Finalisation failed', e)
            setNotification({
                open: true,
                title: 'Payment Failed',
                description: `Error: ${e.message || 'Unknown error'}. Please contact administrator.`,
                type: 'error'
            })
        } finally {
            setIsProcessing(false)
        }
    }, [isProcessing, cashier, buildFinalPayload, clearOrder, handlePrint, orderType])

    const handlePlaceOrder = async () => {
        if (isProcessing || !cashier || items.length === 0) return

        setIsProcessing(true)
        try {
            const kitchenPayload = store.buildKitchenPayload()
            if (!kitchenPayload) {
                setNotification({
                    open: true,
                    title: 'Already Sent',
                    description: 'All items in this order are already being prepared in the kitchen.',
                    type: 'info'
                })
                setIsProcessing(false)
                return
            }

            const billToUse = storeBillNumber || await generateBillNumber(RESTAURANT_ID)

            if (activeOrderId) {
                // We are updating an existing KOT/Order document
                // Recalculate totals for all items currently in store
                const { cgstPercent, sgstPercent, packingChargePerItem } = useSettingsStore.getState().settings
                const totals = calculateTotals(
                    items,
                    cgstPercent,
                    sgstPercent,
                    packingChargePerItem,
                    orderType!
                )

                const ref = doc(db, `restaurants/${RESTAURANT_ID}/orders/${activeOrderId}`)
                await updateDoc(ref, {
                    items,
                    ...totals,
                    updatedAt: new Date().toISOString()
                })

                store.markItemsAsSent()
                setNotification({
                    open: true,
                    title: 'Order Updated',
                    description: `Order #${billToUse} has been updated in the kitchen.`,
                    type: 'success'
                })
            } else {
                // Brand new KOT
                const kitchenPayload = store.buildKitchenPayload()
                if (!kitchenPayload) {
                    setNotification({
                        open: true,
                        title: 'Already Sent',
                        description: 'All items in this order are already being prepared in the kitchen.',
                        type: 'info'
                    })
                    setIsProcessing(false)
                    return
                }

                const order: Order = {
                    id: crypto.randomUUID(),
                    billNumber: billToUse,
                    ...kitchenPayload,
                    items: kitchenPayload.itemsToCook, // Only send items not yet sent
                    cashierId: cashier.id,
                    cashierName: cashier.name,
                    status: 'pending',
                    createdAt: new Date(),
                    printedAt: new Date(),
                }

                await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/orders/${order.id}`), {
                    ...order,
                    createdAt: order.createdAt.toISOString(),
                    printedAt: order.printedAt.toISOString(),
                })

                store.markItemsAsSent()
                setNotification({
                    open: true,
                    title: 'Kitchen Link Active',
                    description: 'New items sent to kitchen.',
                    type: 'success'
                })
            }

            if (orderType === 'takeaway') {
                const currentType = orderType
                clearOrder()
                setOrderType(currentType)
            }
        } catch (e: any) {
            console.error('Order placement failed:', e)
            setNotification({
                open: true,
                title: 'Order Failed',
                description: `Error: ${e.message || 'Unknown error'}. Check connection or adblockers.`,
                type: 'error'
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const store = useOrderStore()
    const subtotal = store.getSubtotal()
    const cgst = store.getCgst()
    const sgst = store.getSgst()
    const packingCharge = store.getPackingCharge()
    const grandTotal = store.getGrandTotal()

    const canPay = items.length > 0 && orderType !== null

    return (
        <div className="flex flex-col h-full bg-surface-container-low border-l border-outline-variant/20">
            {/* Order type selector */}
            <OrderTypeSelector
                selected={orderType}
                onSelect={setOrderType}
                disabledTypes={sessionId ? ['takeaway'] : ['dine-in']}
            />

            {/* Platform order ID input removed */}

            {/* Table number context */}
            {orderType === 'dine-in' && (
                <div className="p-6 pb-2 shrink-0">
                    <div className="bg-surface-container-lowest p-4 rounded-lg flex items-center justify-between shadow-sm border border-outline-variant/10">
                        <div>
                            <p className="text-[10px] uppercase font-black text-on-surface-variant tracking-tighter">
                                Table {sessionLabel ? `• ${sessionLabel}` : ''}
                            </p>
                            <input
                                id="order-table-number"
                                type="text"
                                inputMode="numeric"
                                value={tableNumber}
                                onChange={e => setTableNumber(e.target.value)}
                                className="bg-transparent border-none p-0 font-headline font-black text-3xl focus:ring-0 w-32 text-on-surface"
                                placeholder="..."
                            />
                        </div>
                        <span className="material-symbols-outlined text-4xl text-outline-variant/50">grid_view</span>
                    </div>
                </div>
            )}

            {/* Order items list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <span className="material-symbols-outlined text-4xl mb-2 text-on-surface-variant">shopping_basket</span>
                        <p className="text-on-surface-variant text-sm font-bold">No items added</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.menuItemId} className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/10 shadow-sm space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-sm text-on-surface">{item.name}</h4>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2 bg-surface-container px-2 py-1 rounded-md">
                                        <button
                                        onClick={() => decrementItem(item.menuItemId)}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-base">remove</span>
                                    </button>
                                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                        <button
                                        onClick={() => addItem({ id: item.menuItemId, name: item.name, price: item.price }, 1)}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-base">add</span>
                                    </button>
                                    </div>
                                    <span className="font-bold text-sm min-w-[60px] text-right">₹{formatAmount(item.price * item.quantity)}</span>
                                </div>
                            </div>

                            {/* Cooking Preferences */}
                            <div className="flex items-center gap-2 px-2 py-1 bg-surface rounded border border-outline-variant/5">
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">edit_note</span>
                                <input
                                    type="text"
                                    placeholder="Special instructions (e.g. no spice)..."
                                    value={item.preferences || ''}
                                    onChange={(e) => setItemPreference(item.menuItemId, e.target.value)}
                                    className="bg-transparent border-none p-0 text-[11px] focus:ring-0 w-full text-on-surface placeholder:text-outline-variant"
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tax summary breakdown (simplified visually for sleekness) */}
            {items.length > 0 && (
                <div className="px-6 py-2 shrink-0 space-y-1">
                    <div className="flex justify-between font-body text-xs text-on-surface-variant">
                        <span>Subtotal</span>
                        <span>₹{formatAmount(subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-body text-xs text-on-surface-variant">
                        <span>Taxes (CGST + SGST)</span>
                        <span>₹{formatAmount(cgst + sgst)}</span>
                    </div>
                    {packingCharge > 0 && (
                        <div className="flex justify-between font-body text-xs text-on-surface-variant italic">
                            <span>Packing Charges</span>
                            <span>₹{formatAmount(packingCharge)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Section */}
            <div className="p-6 bg-surface-container border-t border-outline-variant/10 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-on-surface-variant font-bold text-xs uppercase tracking-widest">Total Payable</span>
                    <span className="text-3xl font-black font-headline text-primary">₹{formatAmount(grandTotal)}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <button
                        disabled={!canPay || isProcessing}
                        onClick={() => void handlePay('cash')}
                        className={`flex flex-col items-center justify-center py-4 min-h-[64px] rounded-lg border-2 transition-all ${canPay && !isProcessing ? 'bg-surface-container-lowest border-transparent hover:border-primary active:scale-[0.98] text-on-surface' : 'bg-surface-container-high border-transparent text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-2xl mb-1">payments</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
                    </button>
                    <button
                        disabled={!canPay || isProcessing}
                        onClick={() => void handlePay('upi')}
                        className={`flex flex-col items-center justify-center py-4 min-h-[64px] rounded-lg border-2 transition-all ${canPay && !isProcessing ? 'bg-surface-container-lowest border-transparent hover:border-primary active:scale-[0.98] text-on-surface' : 'bg-surface-container-high border-transparent text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">UPI</span>
                    </button>
                    <button
                        disabled={!canPay || isProcessing}
                        onClick={() => void handlePay('card')}
                        className={`flex flex-col items-center justify-center py-4 min-h-[64px] rounded-lg border-2 transition-all ${canPay && !isProcessing ? 'bg-surface-container-lowest border-transparent hover:border-primary active:scale-[0.98] text-on-surface' : 'bg-surface-container-high border-transparent text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-2xl mb-1">credit_card</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Card</span>
                    </button>
                </div>

                {/* Place Order / Send to Kitchen button */}
                <button
                    onClick={() => void handlePlaceOrder()}
                    disabled={items.length === 0 || isProcessing}
                    className="w-full mb-3 bg-secondary text-on-secondary py-4 rounded-xl font-body font-black uppercase tracking-widest text-xs shadow-md shadow-secondary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">cooking</span>
                        Send to Kitchen
                    </div>
                </button>

                {/* Clear button */}
                <button
                    id="clear-order-btn"
                    className="w-full text-xs text-error font-body font-bold py-2 hover:bg-error/10 rounded transition-colors"
                    onClick={() => items.length > 0 && setClearDialogOpen(true)}
                >
                    Clear Order
                </button>
            </div>

            {/* Hidden receipt for printing */}
            <div style={{ display: 'none' }}>
                {lastOrder && (
                    <Receipt
                        ref={receiptRef}
                        order={lastOrder}
                        restaurantName={settings.restaurantName}
                        address={settings.address}
                        phone={settings.phone}
                        cgstPercent={settings.cgstPercent}
                        sgstPercent={settings.sgstPercent}
                    />
                )}
            </div>

            {/* Clear Order confirm dialog */}
            <ConfirmDialog
                open={clearDialogOpen}
                onOpenChange={setClearDialogOpen}
                title="Clear Order?"
                description="This will remove all items from the current order. This cannot be undone."
                confirmLabel="Clear"
                cancelLabel="Keep"
                destructive
                onConfirm={() => {
                    clearOrder()
                    setClearDialogOpen(false)
                }}
            />
            <NotificationDialog
                open={notification.open}
                onOpenChange={(open) => setNotification(n => ({ ...n, open }))}
                title={notification.title}
                description={notification.description}
                type={notification.type}
            />
        </div>
    )
}
