import { useState, useCallback, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { db, auth, RESTAURANT_ID } from '../../lib/firebase'
import { hashPin } from '../../lib/auth'
import { useAuthStore } from '../../stores/useAuthStore'
import type { Cashier } from '../../types/cashier'

const MAX_ATTEMPTS = 3

export function PinEntry() {
    const [digits, setDigits] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [attempts, setAttempts] = useState(0)
    const [locked, setLocked] = useState(false)

    const login = useAuthStore(s => s.login)

    // Log in anonymously to satisfy Firestore rules for reading cashiers
    useEffect(() => {
        signInAnonymously(auth).catch(err => {
            console.error('Anonymous auth failed', err)
            setError('Could not connect. Please check the internet and try again.')
        })
    }, [])

    const handleDigit = useCallback(async (digit: string) => {
        if (locked) return
        setError(null)

        const next = [...digits, digit]
        setDigits(next)

        if (next.length < 4) return

        // Auto-submit on 4 digits
        const pin = next.join('')
        setDigits([])

        try {
            const pinHash = await hashPin(pin)
            const snap = await getDocs(collection(db, `restaurants/${RESTAURANT_ID}/cashiers`))
            const cashiers: Cashier[] = snap.docs.map(d => d.data() as Cashier)
            console.log(`Debug: Found ${cashiers.length} cashiers in restaurants/${RESTAURANT_ID}/cashiers`)
            console.log('Debug: Current hash', pinHash)

            const matched = cashiers.find(c => c.isActive && c.pinHash === pinHash)

            if (matched) {
                login(matched)
            } else {
                const newAttempts = attempts + 1
                setAttempts(newAttempts)
                if (newAttempts >= MAX_ATTEMPTS) {
                    setLocked(true)
                    setError('Too many wrong PINs. Please ask your manager to unlock.')
                } else {
                    setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} left.`)
                }
            }
        } catch (e: any) {
            console.error('PIN verification failed', e)
            setError(`Something went wrong. Please try again.`)
            setDigits([])
        }
    }, [digits, locked, attempts, login])

    const handleClear = useCallback(() => {
        setDigits([])
        if (!locked) setError(null)
    }, [locked])

    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '✓']

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <div className="w-full max-w-[320px] flex flex-col gap-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">
                        Restaurant POS
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-1 font-body">
                        Enter your PIN to continue
                    </p>
                </div>

                {/* PIN dots */}
                <div className="flex justify-center gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 border-primary transition-none ${digits.length > i ? 'bg-primary' : 'bg-transparent'
                                }`}
                        />
                    ))}
                </div>

                {/* Error message — stays until dismissed */}
                {error && (
                    <div className="bg-error-container text-error rounded p-3 text-sm font-body font-medium flex items-start justify-between gap-2">
                        <span>{error}</span>
                        {!locked && (
                            <button
                                id="pin-dismiss-error"
                                onClick={() => setError(null)}
                                className="text-error font-bold shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                aria-label="Dismiss error"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                {/* PIN pad */}
                <div className="grid grid-cols-3 gap-4">
                    {buttons.map((btn) => {
                        const isClr = btn === 'CLR'
                        const isConfirm = btn === '✓'
                        return (
                            <button
                                key={btn}
                                id={`pin-btn-${btn === 'CLR' ? 'clr' : btn === '✓' ? 'confirm' : btn}`}
                                disabled={locked}
                                onClick={() => {
                                    if (isClr) { handleClear(); return }
                                    if (isConfirm) return // auto-submit on 4 digits
                                    void handleDigit(btn)
                                }}
                                className={`
                  min-h-[80px] min-w-[72px] rounded-lg font-headline font-bold text-xl
                  flex items-center justify-center select-none
                  ${isClr
                                        ? 'bg-surface-container-high text-error'
                                        : isConfirm
                                            ? 'bg-surface-container-high text-on-surface-variant'
                                            : 'bg-surface-container-lowest text-on-surface border border-outline-variant'
                                    }
                  ${locked ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.97]'}
                `}
                                onContextMenu={e => e.preventDefault()}
                            >
                                {btn}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
