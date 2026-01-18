"""
Guest trial routes for Virtual Office translation feature
"""
import os
import secrets
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.models import GuestTrial, GuestTranslationLog, AIProviderKey
from app.schemas.guest import (
    GuestLoginResponse,
    GuestTranslateRequest,
    GuestTranslateResponse,
    GuestStatusResponse,
    GuestTrialAdminResponse,
    GuestTranslationLogResponse,
    GuestTrialStats
)
from app.utils.database import get_db
from app.routes.subscription import decrypt_api_key
from typing import List
from sqlalchemy import func, desc

router = APIRouter(prefix="/api/guest", tags=["guest"])


# ============================================================================
# GUEST SESSION MANAGEMENT
# ============================================================================

def generate_session_id() -> str:
    """Generate a unique session ID"""
    return secrets.token_hex(32)


def generate_guest_username() -> str:
    """Generate a guest username"""
    return f"Guest_{secrets.token_hex(4).upper()}"


def get_client_ip(request: Request) -> str:
    """Get client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=GuestLoginResponse)
def guest_login(request: Request, db: Session = Depends(get_db)):
    """
    Create a new guest session for Virtual Office.
    Guest users get 10 free translation uses.
    """
    session_id = generate_session_id()
    username = generate_guest_username()
    ip_address = get_client_ip(request)

    # Check if IP already has too many active sessions (prevent abuse)
    active_sessions = db.query(GuestTrial).filter(
        GuestTrial.ip_address == ip_address,
        GuestTrial.expires_at > datetime.utcnow()
    ).count()

    if active_sessions >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many active guest sessions from this IP"
        )

    # Create new guest trial
    guest = GuestTrial(
        session_id=session_id,
        ip_address=ip_address,
        username=username,
        usage_count=0,
        max_uses=10,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db.add(guest)
    db.commit()
    db.refresh(guest)

    # Generate a simple token (session_id is the token)
    return GuestLoginResponse(
        session_id=guest.session_id,
        username=guest.username,
        token=guest.session_id,  # Use session_id as token for simplicity
        usage_count=guest.usage_count,
        max_uses=guest.max_uses,
        remaining_uses=guest.max_uses - guest.usage_count,
        expires_at=guest.expires_at
    )


@router.get("/status/{session_id}", response_model=GuestStatusResponse)
def get_guest_status(session_id: str, db: Session = Depends(get_db)):
    """Get guest session status and remaining uses"""
    guest = db.query(GuestTrial).filter(
        GuestTrial.session_id == session_id
    ).first()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest session not found")

    is_valid = (
        datetime.utcnow() < guest.expires_at and
        guest.usage_count < guest.max_uses
    )

    return GuestStatusResponse(
        session_id=guest.session_id,
        username=guest.username,
        usage_count=guest.usage_count,
        max_uses=guest.max_uses,
        remaining_uses=max(0, guest.max_uses - guest.usage_count),
        expires_at=guest.expires_at,
        is_valid=is_valid
    )


# ============================================================================
# GUEST TRANSLATION
# ============================================================================

def detect_thai(text: str) -> bool:
    """Check if text contains Thai characters"""
    import re
    thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
    return bool(thai_pattern.search(text))


async def translate_with_openai(text: str, api_key: str) -> str:
    """Translate Thai text to English using OpenAI"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a Thai to English translator. Translate the Thai text to natural English. Only respond with the translation, nothing else."
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                "max_tokens": 500,
                "temperature": 0.3
            }
        )

        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            raise Exception(f"OpenAI API error: {response.status_code}")


def get_system_openai_key(db: Session) -> str:
    """Get system OpenAI key (tenant_id=1)"""
    key = db.query(AIProviderKey).filter(
        AIProviderKey.tenant_id == 1,
        AIProviderKey.provider == "openai",
        AIProviderKey.is_active == True
    ).first()

    if not key:
        raise HTTPException(
            status_code=503,
            detail="Translation service unavailable. No system API key configured."
        )

    return decrypt_api_key(key.api_key_encrypted)


@router.post("/translate", response_model=GuestTranslateResponse)
async def guest_translate(
    data: GuestTranslateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Translate Thai text to English for guest users.
    Uses tenant_id=1's OpenAI key for translation.
    Limited to 10 uses per session.
    """
    # Validate guest session
    guest = db.query(GuestTrial).filter(
        GuestTrial.session_id == data.session_id
    ).first()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest session not found")

    # Check if session is valid
    if datetime.utcnow() > guest.expires_at:
        raise HTTPException(
            status_code=403,
            detail="Guest session has expired. Please start a new session."
        )

    if guest.usage_count >= guest.max_uses:
        raise HTTPException(
            status_code=403,
            detail="Translation limit reached. Please register for unlimited access."
        )

    # Detect language
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    is_thai = detect_thai(text)
    ip_address = get_client_ip(request)

    if not is_thai:
        # If not Thai, just return the original text (don't log non-Thai)
        return GuestTranslateResponse(
            original=text,
            translated=text,
            detected_language="English",
            target_language="English",
            usage_count=guest.usage_count,
            remaining_uses=guest.max_uses - guest.usage_count
        )

    # Get system OpenAI key
    api_key = get_system_openai_key(db)

    try:
        # Translate using OpenAI
        translated = await translate_with_openai(text, api_key)

        # Update usage count
        guest.usage_count += 1
        guest.last_used_at = datetime.utcnow()

        # Save translation log for admin review
        log = GuestTranslationLog(
            guest_trial_id=guest.id,
            session_id=data.session_id,
            original_text=text,
            translated_text=translated,
            detected_language="Thai",
            ip_address=ip_address
        )
        db.add(log)
        db.commit()

        return GuestTranslateResponse(
            original=text,
            translated=translated,
            detected_language="Thai",
            target_language="English",
            usage_count=guest.usage_count,
            remaining_uses=guest.max_uses - guest.usage_count
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.get("/admin/stats", response_model=GuestTrialStats)
def get_guest_trial_stats(db: Session = Depends(get_db)):
    """Get overall statistics for guest trials (Admin only)"""
    total_guests = db.query(func.count(GuestTrial.id)).scalar()
    active_guests = db.query(func.count(GuestTrial.id)).filter(
        GuestTrial.expires_at > datetime.utcnow()
    ).scalar()
    total_translations = db.query(func.count(GuestTranslationLog.id)).scalar()

    # Get translations in last 24 hours
    yesterday = datetime.utcnow() - timedelta(hours=24)
    translations_today = db.query(func.count(GuestTranslationLog.id)).filter(
        GuestTranslationLog.created_at > yesterday
    ).scalar()

    # Get top translated words (most common original texts)
    top_texts = db.query(
        GuestTranslationLog.original_text,
        func.count(GuestTranslationLog.id).label('count')
    ).group_by(GuestTranslationLog.original_text).order_by(
        desc('count')
    ).limit(10).all()

    return GuestTrialStats(
        total_guests=total_guests,
        active_guests=active_guests,
        total_translations=total_translations,
        translations_today=translations_today,
        top_translated_texts=[{"text": t[0], "count": t[1]} for t in top_texts]
    )


@router.get("/admin/trials", response_model=List[GuestTrialAdminResponse])
def get_guest_trials(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get list of guest trials (Admin only)"""
    query = db.query(GuestTrial)

    if active_only:
        query = query.filter(GuestTrial.expires_at > datetime.utcnow())

    guests = query.order_by(desc(GuestTrial.created_at)).offset(skip).limit(limit).all()

    return [
        GuestTrialAdminResponse(
            id=g.id,
            session_id=g.session_id[:16] + "...",  # Mask for security
            username=g.username,
            ip_address=str(g.ip_address) if g.ip_address else None,
            usage_count=g.usage_count,
            max_uses=g.max_uses,
            created_at=g.created_at,
            expires_at=g.expires_at,
            last_used_at=g.last_used_at,
            is_active=datetime.utcnow() < g.expires_at
        )
        for g in guests
    ]


@router.get("/admin/translations", response_model=List[GuestTranslationLogResponse])
def get_translation_logs(
    skip: int = 0,
    limit: int = 100,
    session_id: str = None,
    db: Session = Depends(get_db)
):
    """Get translation logs for admin review"""
    query = db.query(GuestTranslationLog)

    if session_id:
        query = query.filter(GuestTranslationLog.session_id.like(f"{session_id}%"))

    logs = query.order_by(desc(GuestTranslationLog.created_at)).offset(skip).limit(limit).all()

    return [
        GuestTranslationLogResponse(
            id=log.id,
            session_id=log.session_id[:16] + "...",  # Mask for security
            original_text=log.original_text,
            translated_text=log.translated_text,
            detected_language=log.detected_language,
            created_at=log.created_at
        )
        for log in logs
    ]
