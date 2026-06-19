# Local Setup Guide: GrocerySho_List

This guide will walk you through the process of setting up and running the complete GrocerySho_List application (Frontend, Backend, and Database) on your local machine.

---

## 1. Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js**: (Version 18 or higher recommended). You can download it from [nodejs.org](https://nodejs.org/).
- **MySQL Server**: You need a local instance of MySQL running. You can download MySQL Community Server from [mysql.com](https://dev.mysql.com/downloads/mysql/).

---

## 2. Database Setup

The application uses MySQL to store data. You need to create a database before starting the application.

1. Open your MySQL client (like MySQL Workbench, DBeaver, or the command line).
2. Create a new database for the application. You can name it `grocery_db` by running the following SQL command:
   ```sql
   CREATE DATABASE grocery_db;
   ```
*(Note: You do not need to create tables manually. The application will automatically initialize the database schema when you start the server for the first time.)*

---

## 3. Environment Configuration

The backend needs to know how to connect to your local MySQL database. This is handled using environment variables.

1. In the root directory of your project (`GrocerySho_List`), create a new file named `.env`.
2. Copy the contents of the provided `.env.example` file into your new `.env` file.
3. Update the MySQL configuration variables in the `.env` file with your local MySQL credentials:

   ```env
   # MySQL Database Configuration
   DB_HOST=localhost
   DB_USER=root           # Or your MySQL username
   DB_PASSWORD=your_password_here # Your MySQL password
   DB_NAME=grocery_db     # The name of the database you created
   DB_PORT=3306           # Default is usually 3306
   ```

---

## 4. Install Dependencies

Now, install the required packages for the project.

1. Open a terminal or command prompt.
2. Navigate to your project directory:
   ```bash
   cd path/to/GrocerySho_List
   ```
3. Run the following command to install all frontend and backend dependencies:
   ```bash
   npm install
   ```

---

## 5. Running the Application

This project is configured to run both the frontend (React/Vite) and the backend (Express) concurrently using a single command. The backend uses Vite's programmatic API to serve the frontend in development mode.

1. Start the application by running:
   ```bash
   npm run dev
   ```
2. You should see output indicating that the server is running.
3. Open your web browser and navigate to:
   **http://localhost:3000**

Congratulations! Your local environment is fully set up, and the frontend is successfully connected to your local backend and MySQL database.

---

## Troubleshooting

- **Database Connection Error**: Double-check your `.env` file to ensure the `DB_USER`, `DB_PASSWORD`, and `DB_NAME` perfectly match your local MySQL setup.
- **Port Conflicts**: If port `3000` is already in use, you may need to stop the conflicting service or adjust the `PORT` variable in `backend/server.ts`.
