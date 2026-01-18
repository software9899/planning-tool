"""
Guest trial model for Virtual Office translation feature
"""
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship
from app.utils.database import Base


class GuestTrial(Base):
    """Guest trial tracking for Virtual Office translation"""
    __tablename__ = "guest_trials"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    ip_address = Column(INET, nullable=True)
    username = Column(String(100), nullable=True)
    usage_count = Column(Integer, default=0)
    max_uses = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=24))
    last_used_at = Column(DateTime, nullable=True)

    # Relationship to translation logs
    translation_logs = relationship("GuestTranslationLog", back_populates="guest_trial")

    def can_use(self) -> bool:
        """Check if guest can still use translation"""
        if datetime.utcnow() > self.expires_at:
            return False
        return self.usage_count < self.max_uses

    def remaining_uses(self) -> int:
        """Get remaining translation uses"""
        return max(0, self.max_uses - self.usage_count)


class GuestTranslationLog(Base):
    """Log all guest translations for admin review"""
    __tablename__ = "guest_translation_logs"

    id = Column(Integer, primary_key=True, index=True)
    guest_trial_id = Column(Integer, ForeignKey("guest_trials.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(String(64), nullable=False, index=True)
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    detected_language = Column(String(20), nullable=True)
    ip_address = Column(INET, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to guest trial
    guest_trial = relationship("GuestTrial", back_populates="translation_logs")
