# 🚀 GrocerySync Deployment Guide

This guide will walk you through pushing your entire codebase to GitHub and deploying all three components of your architecture:
1. **The MySQL Database**
2. **The Web App & Backend API**
3. **The Android Mobile App**

---

## 1️⃣ Pushing Your Code to GitHub

First, you need to store your code safely on GitHub.

1. Go to [GitHub](https://github.com/) and create a new repository. Name it `grocery-sync` (leave it public or private, do not initialize with a README).
2. Open a new terminal in your project root folder (`c:\Users\raksh\Desktop\GrocerySho_List`).
3. Run the following commands to initialize git and push your code:

```bash
# Initialize a new git repository
git init

# Add all files (the .gitignore file will prevent node_modules from being added)
git add .

# Commit your code
git commit -m "Initial commit with offline-first architecture"

# Change the main branch name
git branch -M main

# Link your local repo to GitHub (REPLACE the URL with your actual GitHub repo URL)
git remote add origin https://github.com/YourUsername/grocery-sync.git

# Push your code to GitHub
git push -u origin main
```

---

## 2️⃣ Deploying the MySQL Database

Your database currently runs on `localhost`. For the mobile app to sync from anywhere in the world, the database needs to live in the cloud.

### Recommended Providers:
- **Railway** (Highly recommended, very easy to set up a MySQL instance)
- **Aiven** (Free tier available)
- **Render** (PostgreSQL is easier here, but MySQL is supported via Docker)

### Steps (using Railway as an example):
1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** -> **Provision MySQL**.
3. Once provisioned, click on the MySQL instance and go to the **Connect** tab.
4. You will see connection details: Host, Port, User, Password, and Database Name.

> [!IMPORTANT]
> Save these database connection details! You will need them for the next step.

---

## 3️⃣ Deploying the Web App & Backend API

Since your `server.ts` handles both the API routes and serving the React web app (from the `dist` folder), you can deploy them as a **single unified service**.

### Recommended Provider: Render or Railway

### Steps (using Render as an example):
1. Go to [Render.com](https://render.com/) and sign in with GitHub.
2. Click **New** -> **Web Service**.
3. Connect your GitHub account and select your `grocery-sync` repository.
4. Configure the Web Service:
   - **Name:** grocery-sync-api
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build` (This installs packages and builds both the React frontend and Express backend).
   - **Start Command:** `npm run start` (This runs the compiled backend).
5. Scroll down to **Environment Variables** and add the variables from your local `.env` file, but use the cloud database credentials you got in Step 2:
   - `DB_HOST`: (Your cloud DB host)
   - `DB_USER`: (Your cloud DB user)
   - `DB_PASSWORD`: (Your cloud DB password)
   - `DB_NAME`: (Your cloud DB name)
   - `DB_PORT`: (Usually 3306)
   - `JWT_SECRET`: (Create a random long string, e.g., `my_super_secret_production_key_123`)
6. Click **Create Web Service**.

Wait a few minutes for Render to build and deploy your app. Once finished, you will get a URL like `https://grocery-sync-api.onrender.com`. If you visit this URL in your browser, you should see your React web app!

---

## 4️⃣ Updating the Mobile App to Point to Production

Before building the Android app, you need to tell it to talk to your newly deployed cloud API instead of your local computer.

1. Open `frontend_mobile/lib/api.dart`.
2. Change the `_baseUrl` to your new cloud URL:

```dart
  static String get _baseUrl {
    // CHANGE THIS URL to your deployed Render or Railway URL
    return 'https://grocery-sync-api.onrender.com/api';
  }
```

3. Open `frontend_mobile/lib/data/sync_engine.dart`.
4. Change the `_baseUrl` there as well:

```dart
  String get _baseUrl {
    // CHANGE THIS URL to your deployed Render or Railway URL
    return 'https://grocery-sync-api.onrender.com/api';
  }
```

> [!TIP]
> After testing that the mobile app successfully logs in and syncs with the production server, commit and push these changes to GitHub!

---

## 5️⃣ Building and Deploying the Android App

Now that the app points to the cloud, it's time to generate the Android APK file.

### Step A: Generate the APK for Distribution
Open a terminal in the `frontend_mobile` folder and run:

```bash
cd frontend_mobile
flutter build apk --release
```

This will compile your app into an optimized release file. Once complete, you will find the file at:
`frontend_mobile/build/app/outputs/flutter-apk/app-release.apk`

You can transfer this `.apk` file directly to your Android phone to install and test the production app.

### Step B: Publishing to Google Play Store (Optional)
If you want to put the app on the Google Play Store:
1. You must build an **App Bundle** instead of an APK:
   ```bash
   flutter build appbundle --release
   ```
2. You will need to digitally sign your app using a Keystore file (see the [Flutter Deployment Guide](https://docs.flutter.dev/deployment/android#signing-the-app) for instructions on creating a `key.jks` file).
3. Create a Google Play Developer account ($25 one-time fee).
4. Upload the generated `.aab` file to the Google Play Console.
