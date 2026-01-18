"""
API Routes
"""
from app.routes.bookmarks import router as bookmarks_router
from app.routes.subscription import router as subscription_router

__all__ = ['bookmarks_router', 'subscription_router']
