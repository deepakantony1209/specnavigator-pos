import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'

const app = initializeApp({
    apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
    authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
    projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
    storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'],
    messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
    appId: import.meta.env['VITE_FIREBASE_APP_ID'],
})

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
})

export const auth = getAuth(app)

// Fire-and-forget — persistence is best-effort on first call
void setPersistence(auth, browserLocalPersistence)

export const RESTAURANT_ID: string = import.meta.env['VITE_RESTAURANT_ID'] as string ?? 'default'
