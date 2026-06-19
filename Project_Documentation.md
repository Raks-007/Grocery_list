# 📝 Project Documentation & Deployment Guide

## 🛠️ Technical Stack
This application is a **Full-Stack JavaScript/TypeScript** project, separated into a React frontend, an Express Node.js backend, and a MySQL database.

### Frontend
* **Framework:** React 18 with Vite (Fast build tool and development server)
* **Language:** TypeScript (for type safety and better developer experience)
* **Styling:** Tailwind CSS (Utility-first CSS framework for rapid UI development)
* **Icons:** Lucide React (Clean, consistent icon set)
* **Animations:** Framer Motion (`motion/react` for fluid page transitions and element animations)
* **Routing:** React Router DOM (Client-side routing for SPA experience)

### Backend
* **Runtime:** Node.js
* **Framework:** Express.js (RESTful API implementation)
* **Auth:** JSON Web Tokens (JWT) & bcryptjs (for password hashing and session management)
* **Transpiler/Bundler:** `tsx` for local dev, `esbuild` for production compilation

### Database
* **Database:** MySQL (Relational database management)
* **Driver:** `mysql2` (Promise-based Node.js MySQL client)


---

## 📁 Folder Structure & File Functionality

The codebase has been segregated into clean domain-specific folders (`frontend`, `backend`, `db`) for maintainability.

### `/frontend` (Client-Side Application)
* **`main.tsx`**: The entry point of the React application. Renders the root `<App />` component.
* **`App.tsx`**: Main router component mapping application URLs to specific Pages.
* **`index.css`**: Global Tailwind CSS imports and custom utility classes (like custom scrollbars).
* **`/components`**: Reusable UI components.
  * `MainLayout.tsx`: The primary wrapper layout, containing the sidebar navigation and main content area.
* **`/context`**: React Context providers.
  * `AuthContext.tsx`: Manages user authentication state, login/logout functions, and local storage tokens globally.
* **`/lib`**: Helper utilities and configuration.
  * `api.ts`: Central wrapper for `fetch` API. Automatically injects the JWT token into request headers and handles 401 Unauthorized responses.
  * `utils.ts`: Utility functions (e.g., `cn` for Tailwind class merging).
* **`/pages`**: Individual routed views.
  * `Auth.tsx`: Login & registration screens.
  * `Dashboard.tsx`: High-level aggregated metrics and active list overview.
  * `MasterItems.tsx`: Database of all available items to be used across shopping lists.
  * `Categories.tsx`: Item categorization management.
  * `ShoppingLists.tsx`: List of all pending and completed shopping trips.
  * `ShoppingListDetail.tsx`: The dynamic view for a specific shopping list to check off items while shopping.
  * `PurchaseHistory.tsx`: Historical view of completed shopping trips and expenses.

### `/backend` (Server-Side API)
* **`server.ts`**: The core Express API. It holds all the REST endpoints (`/api/auth`, `/api/master-items`, `/api/shopping-lists`), implements the `authMiddleware` for protecting routes, and integrates Vite middleware in development mode to serve the frontend on the same port.

### `/db` (Database Layer)
* **`index.ts`**: Handles connecting to the MySQL database via `mysql2/promise`. Contains the `initializeDb` function which creates the tables if they don't exist, and the `DBWrapper` helper class to simplify querying.

### Root Configuration Files
* **`package.json`**: NPM dependencies and crucial scripts (`dev`, `build`, `start`).
* **`vite.config.ts`**: Configuration for the Vite frontend bundler.
* **`.env.example`**: Template for environment variables (DB credentials, JWT secrets).

---

## 🚀 Deployment Guide (Frontend, Backend & Database)

Since you want to host these components separately, here is the cost-effective (and often free) deployment path for each layer.

### 1️⃣ Database Deployment (MySQL)
You must host your database first so your backend can connect to it.
* **Free Tier Options:** **Aiven** (Free MySQL plan), **TiDB Serverless** (MySQL compatible), or **Clever Cloud**. *(Note: PlanetScale removed their free tier recently, so Aiven or TiDB are your best bets for free MySQL).*
* **Steps:**
  1. Create an account on Aiven or TiDB.
  2. Create a new MySQL database instance.
  3. Retrieve your connection credentials: Host, Port, Username, Password, and Database Name.

### 2️⃣ Backend Deployment (Node.js API)
Host the Express.js backend on a platform designed for Node.js apps.
* **Free Tier Options:** **Render**, **Railway**, or **Koyeb**.
* **Steps (e.g., Render):**
  1. Push your code to a GitHub repository.
  2. Log into Render and create a new **Web Service**.
  3. Connect your GitHub repository.
  4. **Build Command:** `npm install && npm run build`
  5. **Start Command:** `npm run start` (This will start the bundled `dist/server.cjs` file).
  6. **Environment Variables:** Add the database credentials you got from Step 1 here:
     * `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
     * `JWT_SECRET` (Create a random long string for this).
  7. Deploy! Render will give you a backend URL (e.g., `https://my-backend.onrender.com`).

### 3️⃣ Frontend Deployment (React SPA)
Host your static frontend on a high-performance Content Delivery Network (CDN).
* **Free Tier Options:** **Vercel**, **Netlify**, or **Cloudflare Pages**.
* **Steps (e.g., Vercel):**
  1. Create a Vercel account and click "Add New Project".
  2. Import the same GitHub repository.
  3. Change the **Framework Preset** to Vite.
  4. **Build Command:** `npm run build`
  5. **Output Directory:** `dist`
  6. **Environment Variables:** You need to tell the frontend where to find your backend API. If you have any client-side environment variables, define them here.
  7. Deploy! 

*(Note: In the current repository configuration, `server.ts` is configured to serve both API and frontend together. If you choose to host them 100% separately, you would update `/frontend/lib/api.ts` to point to your new Render backend URL instead of relative `/api/...` paths).*
