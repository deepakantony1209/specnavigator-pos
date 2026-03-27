import { forwardRef } from 'react'
import { format } from 'date-fns'
import type { Order } from '../../types/order'

interface ReceiptProps {
    order: Order
    restaurantName: string
    address: string
    phone: string
    cgstPercent: number
    sgstPercent: number
}

function pad(str: string, width: number, right = false): string {
    const s = String(str)
    if (s.length >= width) return s
    const padding = ' '.repeat(width - s.length)
    return right ? padding + s : s + padding
}

function formatAmt(n: number): string {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
    ({ order, restaurantName, address, phone, cgstPercent, sgstPercent }, ref) => {
        const LINE = '─'.repeat(32)

        return (
            <div
                ref={ref}
                style={{
                    width: '302px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000',
                    background: '#fff',
                    padding: '8px',
                }}
            >
                <style>{`@page { size: 80mm auto; margin: 4mm; } @media print { body { margin: 0; } }`}</style>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {restaurantName}
                </div>
                {address && <div style={{ textAlign: 'center' }}>{address}</div>}
                {phone && <div style={{ textAlign: 'center' }}>{phone}</div>}

                <div>{LINE}</div>

                <div>Bill No: {order.billNumber}</div>
                <div>Date: {format(order.createdAt, 'dd/MM/yyyy HH:mm')}</div>
                {order.tableNumber && <div>Table: {order.tableNumber}</div>}
                <div>Type: {order.orderType.replace('-', ' ').toUpperCase()}</div>
                {order.platformOrderId && <div>Order ID: {order.platformOrderId}</div>}
                <div>Cashier: {order.cashierName}</div>

                <div>{LINE}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ flex: 2 }}>Item</span>
                    <span style={{ width: '32px', textAlign: 'right' }}>Qty</span>
                    <span style={{ width: '70px', textAlign: 'right' }}>Amt</span>
                </div>

                {order.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pad(item.name, 16)}
                        </span>
                        <span style={{ width: '32px', textAlign: 'right' }}>{item.quantity}</span>
                        <span style={{ width: '70px', textAlign: 'right' }}>
                            {formatAmt(item.price * item.quantity)}
                        </span>
                    </div>
                ))}

                <div>{LINE}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>{formatAmt(order.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST ({cgstPercent}%):</span>
                    <span>{formatAmt(order.cgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SGST ({sgstPercent}%):</span>
                    <span>{formatAmt(order.sgst)}</span>
                </div>
                {order.packingCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Packing Charges:</span>
                        <span>{formatAmt(order.packingCharge)}</span>
                    </div>
                )}

                <div>{LINE}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                    <span>TOTAL:</span>
                    <span>{formatAmt(order.grandTotal)}</span>
                </div>

                <div>{LINE}</div>

                <div>Payment: {order.paymentMethod.toUpperCase()}</div>
                {order.status === 'voided' && (
                    <div style={{ fontWeight: 'bold' }}>*** VOIDED: {order.voidReason} ***</div>
                )}

                <div>{LINE}</div>

                <div style={{ textAlign: 'center' }}>Thank you. Visit again!</div>
            </div>
        )
    }
)

Receipt.displayName = 'Receipt'
