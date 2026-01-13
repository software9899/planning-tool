"""
Collection routes for managing shared bookmark collections
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.models import Collection, CollectionMember, User
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    CollectionMemberAdd,
    CollectionMemberResponse,
    CollectionWithMembers
)
from app.utils.database import get_db

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=List[CollectionResponse])
def get_collections(db: Session = Depends(get_db)):
    """Get all collections"""
    collections = db.query(Collection).order_by(Collection.created_at.desc()).all()
    return collections


@router.post("", response_model=CollectionResponse, status_code=201)
def create_collection(collection: CollectionCreate, db: Session = Depends(get_db)):
    """Create a new collection"""
    # Check if collection name already exists
    existing = db.query(Collection).filter(Collection.name == collection.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Collection name already exists")

    db_collection = Collection(
        name=collection.name,
        owner_id=None  # TODO: Get from authenticated user
    )
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection


@router.get("/{collection_name}", response_model=CollectionWithMembers)
def get_collection(collection_name: str, db: Session = Depends(get_db)):
    """Get a collection by name with its members"""
    collection = db.query(Collection).filter(Collection.name == collection_name).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get members with user info
    members = db.query(CollectionMember, User).join(
        User, CollectionMember.user_id == User.id
    ).filter(
        CollectionMember.collection_id == collection.id
    ).all()

    member_responses = [
        {
            "id": member.CollectionMember.id,
            "collection_id": member.CollectionMember.collection_id,
            "user_id": member.CollectionMember.user_id,
            "username": member.User.name,
            "role": member.CollectionMember.role,
            "created_at": member.CollectionMember.created_at
        }
        for member in members
    ]

    return {
        "id": collection.id,
        "name": collection.name,
        "owner_id": collection.owner_id,
        "members": member_responses,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at
    }


@router.post("/{collection_name}/members", response_model=CollectionMemberResponse, status_code=201)
def add_member_to_collection(
    collection_name: str,
    member: CollectionMemberAdd,
    db: Session = Depends(get_db)
):
    """Add a member to a collection"""
    # Find collection
    collection = db.query(Collection).filter(Collection.name == collection_name).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Find user by username
    user = db.query(User).filter(User.name == member.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is already a member
    existing_member = db.query(CollectionMember).filter(
        CollectionMember.collection_id == collection.id,
        CollectionMember.user_id == user.id
    ).first()

    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this collection")

    # Add member
    db_member = CollectionMember(
        collection_id=collection.id,
        user_id=user.id,
        role=member.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)

    return {
        "id": db_member.id,
        "collection_id": db_member.collection_id,
        "user_id": db_member.user_id,
        "username": user.name,
        "role": db_member.role,
        "created_at": db_member.created_at
    }


@router.delete("/{collection_name}/members/{username}")
def remove_member_from_collection(
    collection_name: str,
    username: str,
    db: Session = Depends(get_db)
):
    """Remove a member from a collection"""
    # Find collection
    collection = db.query(Collection).filter(Collection.name == collection_name).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Find user by username
    user = db.query(User).filter(User.name == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find and delete membership
    member = db.query(CollectionMember).filter(
        CollectionMember.collection_id == collection.id,
        CollectionMember.user_id == user.id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="User is not a member of this collection")

    db.delete(member)
    db.commit()

    return {"message": "Member removed successfully"}


@router.delete("/{collection_name}")
def delete_collection(collection_name: str, db: Session = Depends(get_db)):
    """Delete a collection"""
    collection = db.query(Collection).filter(Collection.name == collection_name).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    db.delete(collection)
    db.commit()

    return {"message": "Collection deleted successfully"}
