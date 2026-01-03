"""
Bookmark routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.models import Bookmark
from app.schemas import BookmarkCreate, BookmarkUpdate, BookmarkResponse
from app.utils.database import get_db

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.get("", response_model=dict)
def get_bookmarks(db: Session = Depends(get_db)):
    """Get all bookmarks"""
    bookmarks = db.query(Bookmark).order_by(Bookmark.created_at.desc()).all()
    bookmark_responses = [BookmarkResponse.model_validate(b) for b in bookmarks]
    return {"bookmarks": bookmark_responses}


@router.post("", response_model=BookmarkResponse, status_code=201)
def create_bookmark(bookmark: BookmarkCreate, db: Session = Depends(get_db)):
    """Create a new bookmark"""
    db_bookmark = Bookmark(
        title=bookmark.title,
        url=bookmark.url,
        favicon=bookmark.favicon,
        description=bookmark.description,
        tags=bookmark.tags,
        user_id=None
    )
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
def get_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    """Get a specific bookmark"""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.put("/{bookmark_id}", response_model=BookmarkResponse)
def update_bookmark(
    bookmark_id: int,
    bookmark_update: BookmarkUpdate,
    db: Session = Depends(get_db)
):
    """Update a bookmark"""
    db_bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not db_bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    # Update fields
    update_data = bookmark_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_bookmark, field, value)

    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark


@router.delete("/{bookmark_id}")
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    """Delete a bookmark"""
    db_bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not db_bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(db_bookmark)
    db.commit()
    return {"message": "Bookmark deleted successfully"}
