# ============================================================
# auth.py
# SBOM Finder — Authentication & Authorization Utilities
# ============================================================
# Provides three things used across the entire API:
#   1. Password hashing (bcrypt via passlib)
#   2. JWT creation & verification (jose library)
#   3. FastAPI dependency functions injected into routes
#
# Security decisions:
#   - bcrypt is intentionally slow → brute-force is expensive
#   - JWT is stateless → no DB lookup per request (just signature verify)
#   - 24-hour expiry → balance between UX and security
# ============================================================

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models

# ── Security configuration ─────────────────────────────────────
# SECRET_KEY must be set via environment variable in production.
# The default value here is for local development ONLY — never
# ship a hardcoded secret to a real server.
SECRET_KEY = os.getenv("SECRET_KEY", "sbom-finder-secret-key")

# HS256 (HMAC-SHA256) is a symmetric signing algorithm.
# Both signing and verifying use the same SECRET_KEY.
# RS256 (asymmetric) would be better for multi-service architectures
# but adds complexity we don't need for a single-service API.
ALGORITHM = "HS256"

# Tokens are valid for 24 hours before the user must log in again.
# Shorter = more secure, longer = better UX; 24h is a reasonable balance.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


# ── Password hashing ───────────────────────────────────────────
# CryptContext abstracts over hashing algorithms.
# "bcrypt" is the only active scheme here.
# deprecated="auto" → if we ever add a second scheme, old hashes
#   are transparently re-hashed on the next successful login.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── OAuth2 Bearer token scheme ─────────────────────────────────
# Tells FastAPI to extract the token from the Authorization: Bearer <token> header.
# tokenUrl only matters for the Swagger /docs UI login form — it does not
# affect how the actual login endpoint works.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Password utilities ─────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt before storing it.

    bcrypt automatically generates a random salt, so calling this twice
    with the same password produces two different hashes — both verify
    correctly. The salt is embedded in the returned hash string.

    Never store plain-text passwords or reversible hashes (MD5, SHA-1).
    """
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against a stored bcrypt hash.

    Uses constant-time comparison internally (via hmac.compare_digest)
    to prevent timing attacks where an attacker could guess characters
    by measuring how long the comparison takes.

    Returns True on match, False on mismatch.
    """
    return pwd_context.verify(plain, hashed)


# ── JWT token creation ─────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """Create a signed JWT access token from an arbitrary payload dict.

    Typical usage:
        token = create_access_token({"sub": str(user.id)})

    The token encodes:
      - All key/value pairs from `data`
      - An "exp" (expiry) timestamp 24 hours in the future

    The token is signed with SECRET_KEY — any modification to the payload
    after signing will cause verification to fail on the next request.

    Returns a compact dot-separated JWT string: header.payload.signature
    """
    payload = data.copy()  # don't mutate the caller's dict

    # Expiry must use timezone-aware datetime for jose to compare correctly
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})  # "exp" is the standard JWT expiry claim

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Database session dependency ────────────────────────────────

def get_db():
    """FastAPI dependency — yields a SQLAlchemy session for one request.

    The generator pattern ensures db.close() is always called, even if
    the route handler raises an exception. This returns the connection
    to the pool promptly and prevents connection exhaustion under load.

    Inject into any route that needs database access:
        @app.get("/items")
        def list_items(db: Session = Depends(get_db)):
            return db.query(models.Item).all()
    """
    db = SessionLocal()
    try:
        yield db        # route handler runs here with an active session
    finally:
        db.close()      # always runs — connection returns to the pool


# ── Current user dependency ────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """FastAPI dependency — decode the JWT and return the authenticated User.

    Chain of validation:
      1. Extract the Bearer token from the Authorization header
      2. Decode and verify the JWT signature with SECRET_KEY
      3. Check the token hasn't expired (jose handles this automatically)
      4. Extract the user_id from the "sub" claim
      5. Look up the user in the DB — they may have been deleted since login

    Raises HTTP 401 at any failure point so the client knows to re-authenticate.

    Inject into protected routes:
        @app.get("/items")
        def list_items(current_user: models.User = Depends(get_current_user)):
            ...
    """
    try:
        # jose raises JWTError for: expired tokens, bad signature, malformed strings
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # "sub" is the standard JWT subject claim — we store the user's DB id here
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        # Covers all JWT failure modes — give the same generic message to
        # avoid leaking information about *why* validation failed
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Confirm the user still exists — they might have been deleted since logging in
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user