import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";
import path from "path";

// 1. Manually parse .env to get Firebase Config
const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found. Please create it first with your Firebase keys.");
    process.exit(1);
}

const envData = fs.readFileSync(envPath, "utf8");
const config = {};
envData.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
        let val = valueParts.join("=").trim();
        // Remove surrounding quotes if they exist
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        config[key.trim()] = val;
    }
});

const firebaseConfig = {
    apiKey: config.VITE_FIREBASE_API_KEY,
    authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: config.VITE_FIREBASE_PROJECT_ID,
    storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: config.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const RESTAURANT_ID = config.VITE_RESTAURANT_ID || "default";

async function seed() {
    try {
        console.log("Logging in as admin@pos.com...");
        await signInWithEmailAndPassword(auth, "deepakantony1209@gmail.com", "snapserve@123");
        console.log("✅ Authenticated!");

        // --- SEED SETTINGS ---
        console.log("Populating restaurant settings...");
        await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/settings/${RESTAURANT_ID}`), {
            restaurantName: "Fresh Biryani Hub",
            address: "123 Main St, Bangalore",
            phone: "+91 9876543210",
            cgstPercent: 2.5,
            sgstPercent: 2.5,
            adminPin: "0000"
        });

        // --- SEED CASHIER (PIN: 1234) ---
        console.log("Populating first cashier (Raju)...");
        await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/cashiers/cashier_001`), {
            id: "cashier_001",
            name: "Raju",
            role: "admin",
            isActive: true,
            pinHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", // CORRECT hash for 1234
            createdAt: new Date().toISOString()
        });

        // --- SEED SAMPLE CATEGORY ---
        console.log("Populating initial category (Starters)...");
        const categoryId = "cat_starters";
        await setDoc(doc(db, `restaurants/${RESTAURANT_ID}/menu/${categoryId}`), {
            id: categoryId,
            name: "Starters",
            sortOrder: 0,
            items: [
                {
                    id: "item_001",
                    name: "Paneer Tikka",
                    price: 240,
                    isVeg: true,
                    isActive: true,
                    sortOrder: 0,
                    imageUrl: "https://gen.pollinations.ai/image/Paneer-Tikka-Food-Photography?model=flux"
                }
            ]
        });

        console.log("✨ ALL DONE! Your POS is ready for Raju (PIN 1234) to log in.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
        process.exit(1);
    }
}

seed();
