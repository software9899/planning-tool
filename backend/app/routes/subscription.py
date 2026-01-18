"""
Subscription and AI Provider Key routes
"""
import os
import base64
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from cryptography.fernet import Fernet

from app.models import Plan, Tenant, AIProviderKey, User, Task, Team
from app.schemas.subscription import (
    PlanResponse,
    TenantResponse,
    TenantUpdate,
    SubscriptionInfo,
    AIProviderKeyCreate,
    AIProviderKeyUpdate,
    AIProviderKeyResponse,
    AIProviderKeyWithMask,
    AIProviderTestRequest,
    AIProviderTestResponse
)
from app.utils.database import get_db

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


# ============================================================================
# ENCRYPTION UTILITIES
# ============================================================================

def get_encryption_key() -> bytes:
    """Get or generate encryption key from environment"""
    secret = os.environ.get('JWT_SECRET', 'default-secret-key-change-in-production')
    # Derive a Fernet-compatible key from JWT_SECRET
    key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key"""
    fernet = Fernet(get_encryption_key())
    return fernet.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key"""
    fernet = Fernet(get_encryption_key())
    return fernet.decrypt(encrypted_key.encode()).decode()


def mask_api_key(api_key: str) -> str:
    """Mask API key for display (e.g., sk-...xxxx)"""
    if len(api_key) <= 8:
        return "***"
    return f"{api_key[:4]}...{api_key[-4:]}"


# ============================================================================
# PLANS ENDPOINTS
# ============================================================================

@router.get("/plans", response_model=List[PlanResponse])
def get_plans(db: Session = Depends(get_db)):
    """Get all available subscription plans"""
    plans = db.query(Plan).filter(
        Plan.is_active == True,
        Plan.is_public == True
    ).order_by(Plan.sort_order).all()
    return plans


@router.get("/plans/{plan_id}", response_model=PlanResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    """Get a specific plan"""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


# ============================================================================
# TENANT/SUBSCRIPTION ENDPOINTS
# ============================================================================

@router.get("/info", response_model=SubscriptionInfo)
def get_subscription_info(tenant_id: int = 1, db: Session = Depends(get_db)):
    """Get current subscription info for a tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    plan = db.query(Plan).filter(Plan.id == tenant.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Get usage statistics
    users_count = db.query(func.count(User.id)).filter(User.tenant_id == tenant_id).scalar()
    tasks_count = db.query(func.count(Task.id)).filter(Task.tenant_id == tenant_id).scalar()
    teams_count = db.query(func.count(Team.id)).filter(Team.tenant_id == tenant_id).scalar()

    usage = {
        "users": {"current": users_count, "limit": plan.max_users},
        "tasks": {"current": tasks_count, "limit": plan.max_tasks},
        "teams": {"current": teams_count, "limit": plan.max_teams},
        "storage_mb": {"current": 0, "limit": plan.max_storage_mb},  # TODO: Calculate actual storage
        "projects": {"current": 0, "limit": plan.max_projects}
    }

    return SubscriptionInfo(
        tenant=TenantResponse.model_validate(tenant),
        plan=PlanResponse.model_validate(plan),
        usage=usage
    )


@router.put("/tenant", response_model=TenantResponse)
def update_tenant(
    tenant_update: TenantUpdate,
    tenant_id: int = 1,
    db: Session = Depends(get_db)
):
    """Update tenant settings"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = tenant_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    tenant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tenant)
    return tenant


# ============================================================================
# AI PROVIDER KEYS ENDPOINTS
# ============================================================================

@router.get("/ai-keys", response_model=List[AIProviderKeyWithMask])
def get_ai_provider_keys(tenant_id: int = 1, db: Session = Depends(get_db)):
    """Get all AI provider keys for a tenant (masked)"""
    keys = db.query(AIProviderKey).filter(
        AIProviderKey.tenant_id == tenant_id
    ).order_by(AIProviderKey.created_at.desc()).all()

    result = []
    for key in keys:
        try:
            decrypted = decrypt_api_key(key.api_key_encrypted)
            masked = mask_api_key(decrypted)
        except Exception:
            masked = "***invalid***"

        key_response = AIProviderKeyWithMask(
            id=key.id,
            tenant_id=key.tenant_id,
            user_id=key.user_id,
            provider=key.provider,
            name=key.name,
            model=key.model,
            base_url=key.base_url,
            settings=key.settings or {},
            is_active=key.is_active,
            last_used_at=key.last_used_at,
            usage_count=key.usage_count,
            created_at=key.created_at,
            updated_at=key.updated_at,
            api_key_masked=masked
        )
        result.append(key_response)

    return result


@router.post("/ai-keys", response_model=AIProviderKeyWithMask, status_code=201)
def create_ai_provider_key(
    key_data: AIProviderKeyCreate,
    tenant_id: int = 1,
    user_id: int = None,
    db: Session = Depends(get_db)
):
    """Create a new AI provider key"""
    # Encrypt the API key
    encrypted_key = encrypt_api_key(key_data.api_key)

    db_key = AIProviderKey(
        tenant_id=tenant_id,
        user_id=user_id,
        provider=key_data.provider,
        name=key_data.name,
        api_key_encrypted=encrypted_key,
        model=key_data.model,
        base_url=key_data.base_url,
        settings=key_data.settings or {}
    )

    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    return AIProviderKeyWithMask(
        id=db_key.id,
        tenant_id=db_key.tenant_id,
        user_id=db_key.user_id,
        provider=db_key.provider,
        name=db_key.name,
        model=db_key.model,
        base_url=db_key.base_url,
        settings=db_key.settings or {},
        is_active=db_key.is_active,
        last_used_at=db_key.last_used_at,
        usage_count=db_key.usage_count,
        created_at=db_key.created_at,
        updated_at=db_key.updated_at,
        api_key_masked=mask_api_key(key_data.api_key)
    )


@router.put("/ai-keys/{key_id}", response_model=AIProviderKeyWithMask)
def update_ai_provider_key(
    key_id: int,
    key_update: AIProviderKeyUpdate,
    tenant_id: int = 1,
    db: Session = Depends(get_db)
):
    """Update an AI provider key"""
    db_key = db.query(AIProviderKey).filter(
        AIProviderKey.id == key_id,
        AIProviderKey.tenant_id == tenant_id
    ).first()

    if not db_key:
        raise HTTPException(status_code=404, detail="AI provider key not found")

    update_data = key_update.model_dump(exclude_unset=True)

    # Handle API key update separately (needs encryption)
    if 'api_key' in update_data:
        new_api_key = update_data.pop('api_key')
        if new_api_key:
            db_key.api_key_encrypted = encrypt_api_key(new_api_key)

    for field, value in update_data.items():
        setattr(db_key, field, value)

    db_key.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_key)

    # Get masked key for response
    try:
        decrypted = decrypt_api_key(db_key.api_key_encrypted)
        masked = mask_api_key(decrypted)
    except Exception:
        masked = "***"

    return AIProviderKeyWithMask(
        id=db_key.id,
        tenant_id=db_key.tenant_id,
        user_id=db_key.user_id,
        provider=db_key.provider,
        name=db_key.name,
        model=db_key.model,
        base_url=db_key.base_url,
        settings=db_key.settings or {},
        is_active=db_key.is_active,
        last_used_at=db_key.last_used_at,
        usage_count=db_key.usage_count,
        created_at=db_key.created_at,
        updated_at=db_key.updated_at,
        api_key_masked=masked
    )


@router.delete("/ai-keys/{key_id}")
def delete_ai_provider_key(
    key_id: int,
    tenant_id: int = 1,
    db: Session = Depends(get_db)
):
    """Delete an AI provider key"""
    db_key = db.query(AIProviderKey).filter(
        AIProviderKey.id == key_id,
        AIProviderKey.tenant_id == tenant_id
    ).first()

    if not db_key:
        raise HTTPException(status_code=404, detail="AI provider key not found")

    db.delete(db_key)
    db.commit()
    return {"message": "AI provider key deleted successfully"}


@router.post("/ai-keys/test", response_model=AIProviderTestResponse)
async def test_ai_provider_key(test_data: AIProviderTestRequest):
    """Test an AI provider API key connection"""
    import httpx

    provider = test_data.provider.lower()
    api_key = test_data.api_key

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if provider == "openai":
                # Test OpenAI API
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if response.status_code == 200:
                    data = response.json()
                    models = [m["id"] for m in data.get("data", [])][:10]
                    return AIProviderTestResponse(
                        success=True,
                        message="Connection successful",
                        models=models
                    )
                else:
                    return AIProviderTestResponse(
                        success=False,
                        message=f"API error: {response.status_code}"
                    )

            elif provider == "anthropic":
                # Test Anthropic API (simple ping)
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": test_data.model or "claude-3-haiku-20240307",
                        "max_tokens": 10,
                        "messages": [{"role": "user", "content": "Hi"}]
                    }
                )
                if response.status_code == 200:
                    return AIProviderTestResponse(
                        success=True,
                        message="Connection successful",
                        models=["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
                    )
                else:
                    error_msg = response.json().get("error", {}).get("message", "Unknown error")
                    return AIProviderTestResponse(
                        success=False,
                        message=f"API error: {error_msg}"
                    )

            elif provider == "google":
                # Test Google AI (Gemini)
                response = await client.get(
                    f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
                )
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name", "").split("/")[-1] for m in data.get("models", [])][:10]
                    return AIProviderTestResponse(
                        success=True,
                        message="Connection successful",
                        models=models
                    )
                else:
                    return AIProviderTestResponse(
                        success=False,
                        message=f"API error: {response.status_code}"
                    )

            else:
                return AIProviderTestResponse(
                    success=False,
                    message=f"Unsupported provider: {provider}"
                )

    except Exception as e:
        return AIProviderTestResponse(
            success=False,
            message=f"Connection error: {str(e)}"
        )


# ============================================================================
# HELPER: Get decrypted key for AI services
# ============================================================================

def get_active_ai_key(tenant_id: int, provider: str, db: Session) -> str:
    """Get decrypted API key for a provider (used by AI services)"""
    key = db.query(AIProviderKey).filter(
        AIProviderKey.tenant_id == tenant_id,
        AIProviderKey.provider == provider,
        AIProviderKey.is_active == True
    ).first()

    if not key:
        raise HTTPException(
            status_code=404,
            detail=f"No active API key found for provider: {provider}"
        )

    # Update usage
    key.last_used_at = datetime.utcnow()
    key.usage_count += 1
    db.commit()

    return decrypt_api_key(key.api_key_encrypted)
