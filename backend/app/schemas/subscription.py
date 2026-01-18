"""
Subscription and AI Provider schemas
"""
from pydantic import BaseModel, field_serializer
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# ============================================================================
# PLAN SCHEMAS
# ============================================================================

class PlanResponse(BaseModel):
    """Schema for plan response"""
    id: int
    name: str
    display_name: str
    description: Optional[str]
    price_monthly: Decimal
    price_yearly: Decimal
    currency: str
    max_users: int
    max_tasks: int
    max_teams: int
    max_storage_mb: int
    max_projects: int
    features: Dict[str, Any]
    is_active: bool
    is_public: bool
    sort_order: int

    class Config:
        from_attributes = True


# ============================================================================
# TENANT/SUBSCRIPTION SCHEMAS
# ============================================================================

class TenantResponse(BaseModel):
    """Schema for tenant response"""
    id: int
    uuid: Optional[UUID] = None
    name: str
    slug: str
    domain: Optional[str]
    logo_url: Optional[str]
    email: str
    timezone: str
    plan_id: int
    subscription_status: str
    trial_ends_at: Optional[datetime]
    subscription_ends_at: Optional[datetime]
    settings: Dict[str, Any]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer('uuid')
    def serialize_uuid(self, uuid: Optional[UUID]) -> Optional[str]:
        return str(uuid) if uuid else None


class TenantUpdate(BaseModel):
    """Schema for updating tenant"""
    name: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class SubscriptionInfo(BaseModel):
    """Combined subscription info for frontend"""
    tenant: TenantResponse
    plan: PlanResponse
    usage: Dict[str, Any]


# ============================================================================
# AI PROVIDER KEY SCHEMAS
# ============================================================================

class AIProviderKeyCreate(BaseModel):
    """Schema for creating an AI provider key"""
    provider: str  # openai, anthropic, google, azure, custom
    name: str
    api_key: str  # Plain API key (will be encrypted)
    model: Optional[str] = None
    base_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = {}


class AIProviderKeyUpdate(BaseModel):
    """Schema for updating an AI provider key"""
    name: Optional[str] = None
    api_key: Optional[str] = None  # If provided, will be re-encrypted
    model: Optional[str] = None
    base_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AIProviderKeyResponse(BaseModel):
    """Schema for AI provider key response (no actual key returned)"""
    id: int
    tenant_id: int
    user_id: Optional[int]
    provider: str
    name: str
    model: Optional[str]
    base_url: Optional[str]
    settings: Dict[str, Any]
    is_active: bool
    last_used_at: Optional[datetime]
    usage_count: int
    created_at: datetime
    updated_at: datetime
    # api_key_masked: masked version like "sk-...xxx"

    class Config:
        from_attributes = True


class AIProviderKeyWithMask(AIProviderKeyResponse):
    """Response with masked API key"""
    api_key_masked: str


class AIProviderTestRequest(BaseModel):
    """Schema for testing an AI provider connection"""
    provider: str
    api_key: str
    model: Optional[str] = None
    base_url: Optional[str] = None


class AIProviderTestResponse(BaseModel):
    """Schema for AI provider test response"""
    success: bool
    message: str
    models: Optional[List[str]] = None
