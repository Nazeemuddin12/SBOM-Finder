# SBOM Finder

SBOM Finder is a full-stack web application for exploring and comparing Software Bill of Materials (SBOM) data for both devices and applications.

The system allows users to search items, view SBOM component details, compare multiple items side by side, and view high-level statistics from the SBOM directory.

## Features

- View a directory of devices and applications
- Search by item name
- Filter by item type and manufacturer
- View detailed SBOM information for each item
- Compare multiple items at once
- See component presence, version, license, and supplier differences
- View a statistics dashboard with total counts

## Tech Stack

### Frontend
- React
- Vite
- React Router

### Backend
- FastAPI
- SQLAlchemy

### Database
- SQLite

## Project Structure

```text
SBOM-Finder/
  backend/
    app/
      main.py
      database.py
      models.py
      schemas.py
      seed_data.py
    venv/
  frontend/
    src/
      pages/
        Home.jsx
        ItemDetails.jsx
        Compare.jsx
        Stats.jsx
      App.jsx
      main.jsx