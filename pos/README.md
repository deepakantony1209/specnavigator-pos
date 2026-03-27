# Snap Serve — POS Dashboard

A robust, offline-first point-of-sale system tailored for restaurants. Built with React, TypeScript, and Firebase. Features real-time Kitchen Display System (KDS) synchronization, table management, role-based staff access, and analytical reporting.

---

## 🚀 Key Features

*   **Offline-First Native Experience:** Core POS logic runs directly on local data caching, enabling seamless order entry even during network blackouts. Data automatically syncs when the connection is restored.
*   **Dining Floor / Table Management:** Highly visual grid interface to manage table capacities, assign servers, merge bills, and track session durations.
*   **Live Kitchen Display System (KDS):** Real-time monitoring for the kitchen crew to manage ticket preparation, mark items ready, and orchestrate deliveries.
*   **Role-Based Access Control (RBAC):** Custom capabilities for distinct roles — Server, Kitchen Crew, Cashier, and Admin. Secure PIN-based login.
*   **Powerful Reporting:** Live breakdown of revenue, payment channel analytics, top bestsellers, and tax tracking.
*   **Responsive PWA App:** Fully responsive interface optimized heavily for standard tablet form factors and desktop touchscreens alike.

---

## 🛠 Tech Stack

*   **Framework:** React 19 + TypeScript
*   **Build Tooling:** Vite
*   **Styling:** Tailwind CSS + Radix UI Primitives
*   **State Management:** Zustand
*   **Full-Stack Backing:** Firebase (Firestore, Authentication)
*   **PWA Integrations:** vite-plugin-pwa, Workbox
*   **Testing:** Vitest, React Testing Library

---

## 💻 Local Development Setup

Follow these instructions to set up the codebase and get the application running on your local machine.

### 1. Prerequisites

Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/en/) (v18.0.0 or higher recommended)
*   [Git](https://git-scm.com/)

### 2. Clone the Repository

Clone the project down and move into the application directory:

```bash
git clone <your-repository-url>
cd pos
```

### 3. Install Dependencies

Install the project node modules:

```bash
npm install
```

### 4. Environment Configuration

Create a `.env` file in the root of the directory. Copy the required environment variables below and populate them with the appropriate Firebase credentials for your development environment.

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="snap-serve-1234.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="snap-serve-1234"
VITE_FIREBASE_STORAGE_BUCKET="snap-serve-1234.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

# Points the application towards a specific restaurant tenant document.
VITE_RESTAURANT_ID="default" 

# Key for pollination-based abstract image menu generations
VITE_POLLINATIONS_KEY="your-pollinations-key"
```

### 5. Seed the Database (First Run Only)

If this is your first time setting up the database, you need to populate the remote Firestore collections with default configurations, a mock menu, tables, and a default admin user.

Run the seeding script via Node:
```bash
node seed.js
```
*(Note: Your `.env` variables must be correct for the seed script to authenticate with Firestore successfully).*

### 6. Run the Development Server

Start Vite's rapid local dev server:

```bash
npm run dev
```

Visit the local development address (typically `http://localhost:5173`) in your browser. The default admin login PIN is configured during the `seed.js` run (usually `1234`).

---

## 🏗️ Building for Production

To create a minified, production-optimized and tree-shaken build in the `/dist` directory:

```bash
npm run build
```

To run a preview of the built asset exactly how it would perform in production:

```bash
npm run preview
```

## 🧪 Testing

This project utilizes `Vitest` for lightweight, fast unit tests alongside React Testing Library.

```bash
# Execute the entire test suite once
npm run test

# Run tests continuously in watch mode as you develop
npm run test:watch
```
