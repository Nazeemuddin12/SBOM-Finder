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

# ---------------------------------------------------------------------------
# Security configuration
# ---------------------------------------------------------------------------

# SECRET_KEY is used to sign and verify JWT tokens.
# Always set this via environment variable in production — never hardcode it.
SECRET_KEY = os.getenv("SECRET_KEY", "sbom-finder-secret-key")

# HS256 is a symmetric signing algorithm — same key is used to sign and verify.
ALGORITHM = "HS256"

# Tokens expire after 24 hours (60 minutes x 24).
# After expiry the user must log in again to get a fresh token.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

# CryptContext handles all password hashing logic.
# bcrypt is used because it is slow by design, making brute-force attacks expensive.
# deprecated="auto" means if a weaker scheme was used before, it gets re-hashed
# automatically the next time the user logs in.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# OAuth2 scheme
# ---------------------------------------------------------------------------

# This tells FastAPI to look for a Bearer token in the Authorization header.
# tokenUrl is only used by the /docs Swagger UI to know where to POST credentials.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# Password utilities
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt before storing it in the database.
    The output is a salted hash — two identical passwords produce different hashes.
    Never store plain-text passwords.
    """
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Compare a plain-text password against a stored bcrypt hash.
    Uses constant-time comparison internally to prevent timing attacks.
    Returns True if they match, False otherwise.
    """
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT token creation
# ---------------------------------------------------------------------------

def create_access_token(data: dict) -> str:
    """
    Create a signed JWT access token from the given payload data.

    Adds an expiration timestamp to the payload before signing.
    The token is signed with SECRET_KEY so any tampering will be detected
    when the token is decoded on the next request.

    Args:
        data: Dictionary of claims to include — typically {"sub": str(user.id)}

    Returns:
        A compact JWT string that the client stores and sends with each request.
    """
    payload = data.copy()

    # Calculate expiry time in UTC and add it to the payload as the "exp" claim
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})

    # Encode and sign the token — returns a compact string like "eyJ..."
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Database session dependency
# ---------------------------------------------------------------------------

def get_db():
    """
    FastAPI dependency that provides a database session for the duration of a request.

    Uses a generator so the session is always properly closed after the request
    finishes, even if an exception was raised. This prevents connection leaks.

    Usage in a route:
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db        # session is active while the route handler runs
    finally:
        db.close()      # always close — frees the connection back to the pool


# ---------------------------------------------------------------------------
# Current user dependency
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    FastAPI dependency that validates the JWT and returns the logged-in user.

    Injected into any route that requires authentication. Performs three checks:
      1. Decodes and verifies the JWT signature and expiry
      2. Extracts the user ID from the "sub" claim
      3. Confirms the user still exists in the database

    Raises HTTP 401 if any check fails so the client knows to re-authenticate.

    Usage in a route:
        def my_route(current_user: models.User = Depends(get_current_user)):
            ...
    """
    try:
        # Decode the token — raises JWTError if expired or signature is invalid
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # "sub" holds the user ID as a string (standard JWT claim name)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        # Covers expired tokens, bad signatures, and malformed JWT strings
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Look up the user in the database — they may have been deleted since login
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user