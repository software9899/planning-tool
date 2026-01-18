"""
Guest trial schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class GuestLoginResponse(BaseModel):
    """Response for guest login"""
    session_id: str
    username: str
    token: str
    usage_count: int
    max_uses: int
    remaining_uses: int
    expires_at: datetime


class GuestTranslateRequest(BaseModel):
    """Request for guest translation"""
    text: str
    session_id: str


class GuestTranslateResponse(BaseModel):
    """Response for guest translation"""
    original: str
    translated: str
    detected_language: str
    target_language: str
    usage_count: int
    remaining_uses: int


class GuestStatusResponse(BaseModel):
    """Response for guest status check"""
    session_id: str
    username: str
    usage_count: int
    max_uses: int
    remaining_uses: int
    expires_at: datetime
    is_valid: bool


# ============================================================================
# ADMIN SCHEMAS
# ============================================================================

class GuestTrialAdminResponse(BaseModel):
    """Admin view of guest trial"""
    id: int
    session_id: str  # Masked
    username: str
    ip_address: Optional[str]
    usage_count: int
    max_uses: int
    created_at: datetime
    expires_at: datetime
    last_used_at: Optional[datetime]
    is_active: bool


class GuestTranslationLogResponse(BaseModel):
    """Admin view of translation log"""
    id: int
    session_id: str  # Masked
    original_text: str
    translated_text: Optional[str]
    detected_language: Optional[str]
    created_at: datetime


class GuestTrialStats(BaseModel):
    """Overall statistics for guest trials"""
    total_guests: int
    active_guests: int
    total_translations: int
    translations_today: int
    top_translated_texts: List[Dict[str, Any]]
