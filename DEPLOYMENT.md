# Deploying Taskify publicly

Taskify uses a Next.js frontend and a FastAPI backend. The frontend sends `/api/*` requests through the Next.js rewrite, so the backend URL stays server-side.

## 1. Deploy the backend and database on Render

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select this repository. Render reads `render.yaml` to create the API and PostgreSQL database.
3. Wait for the `taskify-api` service to finish deploying. Its public URL will look like `https://taskify-api.onrender.com`.

The included Blueprint uses Render's free plans to make a no-cost preview possible. Free web services can sleep when idle, and a free Render PostgreSQL database expires after 30 days. Upgrade the database before relying on it for lasting user data.

## 2. Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `taskify/frontend` and keep the detected Next.js build settings.
3. Add `TASKIFY_BACKEND_URL` in the Vercel project's Production environment, using the Render API URL from step 1 (for example, `https://taskify-api.onrender.com`, with no trailing slash).
4. Deploy. Vercel will provide the public website URL.

Do not set `NEXT_PUBLIC_API_URL` for this setup; the browser should use the same-origin `/api` path and let the server-side rewrite forward requests. Render generates the database password, admin key, and token signing secret through the Blueprint. Keep those values private.

## Data and account security

The deployed app starts with an empty PostgreSQL database; the local SQLite database is not copied. Account and task routes require the signed token returned at login, and task access is restricted to the owning account.
