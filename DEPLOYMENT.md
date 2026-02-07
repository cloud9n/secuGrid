# Deploying SecuGrid to Render

This guide outlines the steps to deploy both the SecuGrid backend (Node.js/Express) and frontend (React/Vite) to [Render.com](https://render.com).

## Prerequisites

1.  A GitHub repository containing the `secuGrid` code.
2.  A [Render](https://render.com) account.
3.  (Optional but Recommended) A managed PostgreSQL database for production persistence. By default, this project uses SQLite, which is **ephemeral** on Render's free tier (data will be lost on restart).

---

## Part 1: Deploying the Backend

1.  **Create a New Web Service**
    - Go to your Render Dashboard.
    - Click **New +** -> **Web Service**.
    - Connect your GitHub repository.

2.  **Configure the Service**
    - **Name**: `secugrid-api` (or similar)
    - **Root Directory**: `server`
    - **Environment**: `Node`
    - **Build Command**: `npm install && npx prisma migrate deploy && npm run build`
    - **Start Command**: `npm start`

3.  **Environment Variables**
    Add the following environment variables under "Environment":

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `NODE_VERSION` | `20.11.0` | Or your development version |
    | `DATABASE_URL` | `file:./dev.db` | Default SQLite. Use a Postgres URL for production. |
    | `JWT_SECRET` | `your-secure-secret` | Generate a strong random string. |
    | `PAYSTACK_SECRET_KEY` | `sk_test_...` | Your Paystack Secret Key. |

    > **Warning**: With `DATABASE_URL="file:./dev.db"`, your database will reset every time the server restarts. For a persistent database:
    > 1. Create a **New PostgreSQL** database on Render.
    > 2. Copy the `Internal Database URL`.
    > 3. Update `DATABASE_URL` in your Web Service to this value.
    > 4. Update `schema.prisma` provider from `sqlite` to `postgresql` in your code.

4.  **Deploy**
    - Click **Create Web Service**.
    - Wait for the build to finish.
    - Copy the service URL (e.g., `https://secugrid-api.onrender.com`). You will need this for the frontend.

---

## Part 2: Deploying the Frontend

1.  **Create a New Static Site**
    - Go to your Render Dashboard.
    - Click **New +** -> **Static Site**.
    - Connect the **same** GitHub repository.

2.  **Configure the Site**
    - **Name**: `secugrid-app`
    - **Root Directory**: `.` (leave empty)
    - **Build Command**: `npm install && npm run build`
    - **Publish Directory**: `dist`

3.  **Environment Variables**
    Add the backend URL you copied earlier:

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `VITE_API_URL` | `https://secugrid-api.onrender.com/api` | **Must** end with `/api` |
    | `VITE_GEMINI_API_KEY` | `your-gemini-key` | Your Google Gemini API Key. |

4.  **Rewrite Rules**
    Since this is a Single Page Application (SPA), you need to handle client-side routing.
    - Go to the **Redirects/Rewrites** tab.
    - Add a new rule:
        - **Source**: `/*`
        - **Destination**: `/index.html`
        - **Action**: `Rewrite`

5.  **Deploy**
    - Click **Create Static Site**.
    - Once deployed, your app will be live!

---

## Troubleshooting

-   **CORS Errors**: If the frontend cannot talk to the backend, check the browser console. You might need to configure `cors` options in `server/src/index.ts` to explicitly allow your frontend domain:
    ```typescript
    app.use(cors({
      origin: 'https://secugrid-app.onrender.com'
    }));
    ```
-   **Database Errors**: If using SQLite, ensure the `server` directory has write permissions (standard on Render). If data disappears, switch to PostgreSQL.
