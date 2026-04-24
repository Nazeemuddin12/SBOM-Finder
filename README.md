# SBOM Finder

SBOM Finder is a full-stack web application built to simplify how developers, security professionals, and compliance teams discover, manage, and analyze Software Bill of Materials (SBOMs). An SBOM is essentially a detailed ingredient list for software — it tells you exactly which open-source libraries, packages, and components are bundled inside any application or device.

The problem SBOM Finder solves is straightforward: most organizations have no easy way to answer the question "what software components are we actually running, and are any of them vulnerable?" When a critical vulnerability like Log4Shell drops, teams scramble to figure out which of their products are affected. SBOM Finder gives you a searchable, comparable, and continuously discoverable inventory so you are never caught off guard.

The application lets users import SBOMs in standard formats (CycloneDX, SPDX), automatically generate SBOMs from uploaded files using Anchore Syft, pull live dependency data from public registries like npm and PyPI, and even use Claude AI to discover component lists for products just by typing a name. A public community catalog allows verified SBOMs to be shared across users, with an admin moderation layer to ensure quality.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [SBOM Formats Supported](#sbom-formats-supported)
- [User Roles](#user-roles)
- [Contributing](#contributing)

---

## Features

| Feature | Description |
|---|---|
| Search and Browse | Search your SBOM library by name, type, manufacturer, OS, and more |
| Import SBOMs | Upload CycloneDX or SPDX JSON files to ingest into your workspace |
| AI Discovery | Use Claude AI to auto-generate an SBOM for any product by name |
| Live Fetch | Pull live dependency data from deps.dev for npm, PyPI, Maven, Go, and Cargo packages |
| Syft Scanner | Upload any binary or package file and auto-generate its SBOM using Anchore Syft |
| Compare | Side-by-side component comparison between 2 to 4 items |
| Reverse Lookup | Find all products in your library that contain a specific component |
| Stats Dashboard | Visual overview of your workspace — total items, devices, apps, and components |
| Public Catalog | Browse community-approved, verified SBOMs without needing to log in |
| Admin Panel | Approve or reject public submissions, flag vulnerable components, manage users |
| Authentication | JWT-based login with role-based access control (user and admin) |

---

## Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — Python API framework used for all backend routes
- **[SQLAlchemy](https://www.sqlalchemy.org/)** — ORM for all database models and queries
- **[Supabase (PostgreSQL)](https://supabase.com/)** — production database hosted on Supabase
- **[python-jose](https://github.com/mpdavis/python-jose)** — JWT token creation and verification
- **[passlib + bcrypt](https://passlib.readthedocs.io/)** — secure password hashing
- **[Anthropic Claude API](https://www.anthropic.com/)** — AI-powered SBOM discovery
- **[Anchore Syft](https://github.com/anchore/syft)** — file-based SBOM generation
- **[deps.dev API](https://deps.dev/)** — live package dependency data from Google

### Frontend
- **[React 19](https://react.dev/)** — component-based UI
- **[React Router v7](https://reactrouter.com/)** — client-side routing
- **[Vite](https://vitejs.dev/)** — build tooling and dev server
- **Custom CSS** — no UI framework, fully custom styles

### Deployment
- **Frontend** — deployed on [Vercel](https://vercel.com/)
- **Backend** — deployed on [Render](https://render.com/) at `https://sbom-finder-1.onrender.com`
- **Database** — [Supabase](https://supabase.com/) managed PostgreSQL

---

## Project Structure

SBOM-Finder/
├── backend/
│   ├── app/
│   │   ├── main.py           # All FastAPI routes and startup logic
│   │   ├── models.py         # SQLAlchemy database models
│   │   ├── schemas.py        # Pydantic request and response schemas
│   │   ├── auth.py           # JWT auth, password hashing, user dependency
│   │   ├── database.py       # DB engine, session, and Base setup
│   │   ├── fetchers.py       # External package registry search (npm, PyPI, Maven, etc.)
│   │   ├── importers.py      # CycloneDX and SPDX JSON parsers
│   │   ├── ai_discoverer.py  # Claude AI SBOM generation
│   │   └── syft_scanner.py   # Syft binary scanning wrapper
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Root component with all route definitions
│   │   ├── api.js                # Shared fetch helper with automatic JWT injection
│   │   ├── config.js             # API base URL (points to Render backend)
│   │   ├── context/
│   │   │   └── Authcontext.jsx   # Auth state (token, user) via React Context
│   │   ├── components/
│   │   │   ├── Header.jsx        # Top navigation bar
│   │   │   └── ProtectedRoute.jsx # Auth guard wrapper for protected pages
│   │   └── pages/
│   │       ├── Home.jsx          # User dashboard and SBOM library
│   │       ├── Browse.jsx        # Public catalog (no login required)
│   │       ├── Discover.jsx      # AI-powered SBOM discovery
│   │       ├── Generate.jsx      # Syft file upload and SBOM generation
│   │       ├── Import.jsx        # CycloneDX and SPDX file import
│   │       ├── Compare.jsx       # Side-by-side item comparison
│   │       ├── ReverseLookup.jsx # Component to products reverse search
│   │       ├── Stats.jsx         # Usage statistics
│   │       ├── TrackedProducts.jsx # Product watchlist
│   │       ├── ItemDetails.jsx   # Single SBOM detail view
│   │       ├── Admin.jsx         # Admin moderation panel
│   │       ├── Login.jsx         # Login form
│   │       └── Register.jsx      # Registration form
│   ├── Vercel.json               # Vercel SPA rewrite rule
│   ├── package.json
│   └── vite.config.js
│
├── sample-cyclonedx.json     # Sample CycloneDX SBOM for testing imports
├── sample-spdx.json          # Sample SPDX SBOM for testing imports
└── README.md

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- A [Supabase](https://supabase.com/) project with a PostgreSQL database
- (Optional) An [Anthropic API key](https://console.anthropic.com/) for the AI Discovery feature
- (Optional) [Anchore Syft](https://github.com/anchore/syft) installed on the server for SBOM generation

---

### Backend Setup

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
venv\Scripts\activate          # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set your environment variables
#    Copy these into a .env file or set them in your deployment dashboard

export DATABASE_URL="postgresql://user:password@your-supabase-host:5432/postgres"
export SECRET_KEY="your-random-secret-key"
export ANTHROPIC_API_KEY="sk-ant-..."
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="yourpassword"
export ADMIN_EMAIL="admin@yourdomain.com"

# 5. Start the backend server
uvicorn app.main:app --reload --port 8000
```

The API will be running at `http://localhost:8000`.
Interactive Swagger docs are available at `http://localhost:8000/docs`.

On first startup, the app automatically creates all database tables and an admin user using the credentials from your environment variables.

---

### Frontend Setup

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will open at `http://localhost:5173`.

By default the frontend points to the live Render backend (`https://sbom-finder-1.onrender.com`). To point it at your local backend instead, edit `src/config.js`:

```js
export const API_BASE_URL = "http://localhost:8000";
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | none | PostgreSQL connection string from Supabase |
| `SECRET_KEY` | `sbom-finder-secret-key` | JWT signing secret — always change this in production |
| `ANTHROPIC_API_KEY` | none | Required for the AI Discovery feature |
| `ADMIN_USERNAME` | `admin` | Username for the auto-created admin account |
| `ADMIN_PASSWORD` | `sbomadmin2024` | Password for the auto-created admin account |
| `ADMIN_EMAIL` | `admin@sbomfinder.com` | Email for the auto-created admin account |
| `ADMIN_SECRET` | `sbom-secret-2026` | Secret key for the `/auth/make-admin` endpoint |

Never commit real credentials to version control. Use a `.env` file locally and set secrets through your deployment platform's environment variable dashboard in production.

---

## Deployment

### Frontend (Vercel)
The frontend is deployed on Vercel. The `Vercel.json` file at the root of the frontend folder contains a catch-all rewrite rule that sends all routes to `index.html`, which is required for React Router to work correctly on page refresh.

### Backend (Render)
The backend is deployed as a web service on Render. Set all environment variables listed above in the Render dashboard under your service's Environment tab. The live backend URL is `https://sbom-finder-1.onrender.com`.

### Database (Supabase)
The production database is a PostgreSQL instance hosted on Supabase. The `DATABASE_URL` must be set to your Supabase connection string. The app handles the SSL requirement for Supabase automatically — if the word "supabase" appears in the connection string, SSL mode is set to require.

---

## API Overview

All protected routes require an `Authorization: Bearer <token>` header. The token is obtained by calling `/auth/login`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create a new account |
| POST | `/auth/login` | No | Log in and receive a JWT |
| GET | `/auth/me` | Yes | Get current user info |
| GET | `/items` | Yes | List all your SBOMs |
| GET | `/items/{id}` | Yes | Get a single SBOM with its full component list |
| DELETE | `/items/{id}` | Yes | Delete an SBOM from your workspace |
| GET | `/search` | Yes | Filter your SBOM library |
| GET | `/search-smart` | Yes | Search locally, falls back to external registries |
| GET | `/compare` | Yes | Compare 2 SBOMs |
| GET | `/compare-multi` | Yes | Compare 2 to 4 SBOMs side by side |
| GET | `/reverse-search` | Yes | Find all products containing a component |
| GET | `/stats` | Yes | Your workspace statistics |
| POST | `/import/cyclonedx` | Yes | Import a CycloneDX JSON file |
| POST | `/import/spdx` | Yes | Import an SPDX JSON file |
| POST | `/discover` | Yes | AI-powered SBOM discovery via Claude |
| POST | `/fetch-live-sbom` | Yes | Fetch live dependency data from deps.dev |
| POST | `/generate-sbom` | Yes | Generate an SBOM from an uploaded file via Syft |
| GET | `/public/items` | No | Browse the community-approved public catalog |
| GET | `/admin/stats` | Admin only | System-wide statistics |
| GET | `/admin/pending` | Admin only | Items pending approval |
| POST | `/admin/items/{id}/approve` | Admin only | Approve a public submission |

Full interactive docs are available at `https://sbom-finder-1.onrender.com/docs`.

---

## SBOM Formats Supported

| Format | Notes |
|---|---|
| CycloneDX JSON | Industry standard format, produced by tools like Syft and cdxgen |
| SPDX JSON | SPDX 2.x JSON format, widely used in open source compliance |
| AI-Generated | Claude AI constructs a component list from a product name |
| Live Fetch | Real-time dependency data pulled from deps.dev (npm, PyPI, Maven, Go, Cargo) |
| Syft Scanned | Generated automatically by scanning an uploaded binary or package file |

---

## User Roles

| Role | Capabilities |
|---|---|
| User | Manage personal workspace, import and discover SBOMs, submit items to the public catalog |
| Admin | Everything a user can do, plus approve or reject public submissions, flag vulnerable components, manage all users, and view the audit log |

An admin account is created automatically on first startup using the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.
