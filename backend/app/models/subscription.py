"""
Subscription and AI Provider models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Numeric, JSON
from app.utils.database import Base


class Plan(Base):
    """Subscription plan model"""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    price_monthly = Column(Numeric(10, 2), default=0)
    price_yearly = Column(Numeric(10, 2), default=0)
    currency = Column(String(3), default='USD')
    max_users = Column(Integer, default=3)
    max_tasks = Column(Integer, default=100)
    max_teams = Column(Integer, default=1)
    max_storage_mb = Column(Integer, default=100)
    max_projects = Column(Integer, default=1)
    features = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Tenant(Base):
    """Tenant (organization) model"""
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    domain = Column(String(255))
    logo_url = Column(Text)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    address = Column(Text)
    country = Column(String(100))
    timezone = Column(String(50), default='UTC')
    plan_id = Column(Integer, ForeignKey("plans.id"), default=1)
    subscription_status = Column(String(20), default='trialing')
    trial_ends_at = Column(DateTime)
    subscription_ends_at = Column(DateTime)
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    settings = Column(JSON, default={})
    database_type = Column(String(20), default='shared')
    database_host = Column(String(255))
    database_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)


class AIProviderKey(Base):
    """AI Provider API key model"""
    __tablename__ = "ai_provider_keys"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    provider = Column(String(50), nullable=False)  # openai, anthropic, google, azure, custom
    name = Column(String(100), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    model = Column(String(100))
    base_url = Column(Text)
    settings = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
