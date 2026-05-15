# ============================================================
# database.py
# SBOM Finder — Database Configuration
# ============================================================
# Responsible for setting up the SQLAlchemy engine, session
# factory, and declarative base that every ORM model inherits
# from. Import these three symbols in other modules:
#   - Base       → subclass for all ORM models
#   - SessionLocal → call to open a DB session
#   - engine     → pass to Base.metadata.create_all()
# ============================================================

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ── Database URL ─────────────────────────────────────────────
# Read from environment so the same code works in three contexts:
#   1. Local dev   → SQLite file (no setup required)
#   2. Render/Heroku → PostgreSQL via DATABASE_URL env var
#   3. Supabase    → PostgreSQL with SSL required
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sbom.db"  # fallback: local SQLite file
)

# Heroku and some older providers emit "postgres://" which
# SQLAlchemy 1.4+ no longer accepts. Rewrite it here before
# it reaches the engine so we never have to think about it again.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ── Connection arguments ──────────────────────────────────────
# SSL is mandatory for Supabase connections but must NOT be
# set for SQLite or plain local Postgres (it breaks them).
connect_args = {}
if "supabase" in DATABASE_URL:
    connect_args = {"sslmode": "require"}

# ── Engine ────────────────────────────────────────────────────
# pool_pre_ping=True  → test each connection before use so we
#   don't silently hand out a stale socket after the DB server
#   drops idle connections (very common on Render's free tier).
# pool_recycle=300    → forcibly replace connections every 5 min
#   as a belt-and-suspenders guard against the same problem.
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)

# ── Session factory ───────────────────────────────────────────
# Call SessionLocal() to get a fresh session for a request.
# autocommit=False  → we call db.commit() / db.rollback() manually
# autoflush=False   → SQLAlchemy won't flush before every query,
#   giving us explicit control and avoiding subtle ordering bugs
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Declarative base ──────────────────────────────────────────
# Every ORM model (Item, Component, User, …) inherits from Base.
# SQLAlchemy uses this to discover the full schema when we call
# Base.metadata.create_all(bind=engine) at startup.
Base = declarative_base()