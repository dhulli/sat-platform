# SAT Platform

SAT Platform is a full-stack TypeScript application designed to support SAT practice workflows. The repository is structured as a monorepo with a React-based frontend and a Node.js backend, enabling clear separation of concerns and independent development of client and server components.

The project serves as a foundation for SAT-related functionality such as exam flows, question handling, scoring logic, and user interaction.

---

## Repository Structure

```text
sat-platform/
├── backend/                 # Node.js + TypeScript backend API
│   ├── src/
│   │   ├── index.ts         # Backend entry point
│   │   ├── routes/          # HTTP route definitions
│   │   ├── controllers/     # Request handling logic
│   │   ├── services/        # Business logic
│   │   └── utils/           # Shared utilities
│   └── tsconfig.json
│
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context state management
│   │   ├── pages/           # Page-level components
│   │   ├── test/            # Test scaffolding
│   │   └── App.tsx
│   └── tsconfig.json
│
├── package.json             # Root workspace configuration
└── .gitignore
````

---

## Tech Stack

### Frontend

* React
* TypeScript
* React Context API for application state

### Backend

* Node.js
* TypeScript
* Express-style routing
* Layered architecture (routes → controllers → services)

### Tooling

* npm
* TypeScript compiler

---

## Running the Project Locally

This section describes how to set up and run the SAT Platform on a local development machine.

### Prerequisites

Ensure the following are installed:

* **Node.js** (v18 or later recommended)
* **npm** (included with Node.js)

Verify installation:

```bash
node -v
npm -v
```

---

### 1. Clone the Repository

```bash
git clone https://github.com/dhulli/sat-platform.git
cd sat-platform
```

---

### 2. Install Dependencies

From the repository root:

```bash
npm install
```

If workspace installation fails, install dependencies separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

---

### 3. Run the Backend Server

From the `backend` directory:

```bash
npm run dev
```

Expected behavior:

* The backend server starts successfully
* API endpoints become available on the configured port (see `backend/src/index.ts`)

---

### 4. Run the Frontend Application

In a **separate terminal**, from the `frontend` directory:

```bash
npm start
```

Expected behavior:

* The React development server starts
* The application opens in the browser
* The frontend communicates with the backend via HTTP

---

### 5. Development Notes

* Backend source code: `backend/src/`
* Frontend source code: `frontend/src/`
* Backend changes may require a server restart depending on tooling
* Frontend supports hot reload by default

---

## Backend Architecture Overview

The backend follows a layered design:

* **Routes** define HTTP endpoints
* **Controllers** handle request and response logic
* **Services** encapsulate core business logic
* **Utils** contain shared helper functions

This structure isolates HTTP concerns from business logic and improves maintainability.

---

## Frontend Architecture Overview

The frontend is organized around:

* **Pages** for route-level views
* **Components** for reusable UI elements
* **Contexts** for shared application state

State related to exams or workflows is centralized using React Context to avoid excessive prop drilling.

---

## Contributing Guidelines

* Keep frontend and backend responsibilities clearly separated
* Add backend features using the route → controller → service pattern
* Prefer explicit TypeScript types over `any`
* Keep components small and focused

---

Below is a **clean, copy-paste ready documentation section** you can add directly to your **`README.md`**.
It is written for **local developers**, assumes **Docker Desktop**, and matches your current setup (CRA frontend + Express backend + MySQL via env vars).

No placeholders, no hand-waving.

---

## 🐳 Docker: Build and Run Locally

This project can be run locally using Docker to mirror a production-like environment. The Docker image bundles:

* React frontend (prebuilt)
* Node.js / Express backend
* API + frontend served from a single container

---

### Prerequisites

Ensure the following are installed:

* **Docker Desktop** (Windows / macOS / Linux)
* **Node.js 18.x** (only required if building frontend outside Docker)

Verify Docker:

```bash
docker --version
```

---

## Docker Image Structure (High Level)

* **Frontend**: Built using Create React App and served as static files
* **Backend**: Express API server
* **Port**: Single exposed port (default `3000`)
* **Database**: External (e.g., AWS RDS MySQL)

---

## Environment Variables

The backend expects environment variables for database and auth.

You should already have:

```
backend/.env
```

Example (do not commit secrets):

```env
PORT=3000

DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=sat_platform
DB_PORT=3306

JWT_SECRET=your-secret-key
```

---

## Build the Docker Image

From the **repository root**:

```bash
docker build -t sat-platform .
```

Explanation:

* Builds frontend
* Builds backend
* Produces a single runnable image named `sat-platform`

---

## Run the Application (Local)

```bash
docker run -p 3000:3000 --env-file backend/.env sat-platform
```

What this does:

* Maps container port `3000` → host port `3000`
* Loads environment variables from `backend/.env`
* Starts the Express server

---

## Access the Application

After startup:

* **Frontend UI**
  👉 [http://localhost:3000](http://localhost:3000)

* **Health Check**
  👉 [http://localhost:3000/health](http://localhost:3000/health)

* **API Base**
  👉 [http://localhost:3000/api](http://localhost:3000/api)

---

## Stop the Container

If running in the foreground:

```text
Ctrl + C
```

If running in detached mode (`-d`):

```bash
docker ps
docker stop <container-id>
```

---

## Common Troubleshooting

### Frontend loads without styling

* Ensure frontend was built successfully
* Ensure Tailwind is compiled locally (no CDN usage)
* Hard refresh browser (`Ctrl + Shift + R`)

---

### API returns HTML instead of JSON

* Ensure API routes are mounted **before** React catch-all
* Verify `/api/*` routes exist in backend entry file

---

### Database connection fails

* Verify `backend/.env` is correct
* Ensure DB is accessible from Docker (public RDS / security group)

---

## Rebuild After Code Changes

Any backend or frontend change requires rebuilding:

```bash
docker build -t sat-platform .
docker run -p 3000:3000 --env-file backend/.env sat-platform
```

---

## Notes for Developers

* This setup intentionally mirrors **ECS / production behavior**
* React dev server is **not used**
* All routing and static assets are served by Express
* Use Docker logs for debugging:

```bash
docker logs <container-id>
```

## Project Status

This project is under active development. Some behaviors are inferred from existing structure and may evolve as features are added.

```
