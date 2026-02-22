import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.document import VereinsDocument
from app.core.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "/app/uploads/documents"
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/gif",
    "text/plain",
    "text/csv",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

CATEGORIES = ["satzung", "protokoll", "formular", "finanzen", "sonstiges"]


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    title: Optional[str]
    description: Optional[str]
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(VereinsDocument).where(VereinsDocument.user_id == current_user.id)
    if category:
        query = query.where(VereinsDocument.category == category)
    query = query.order_by(VereinsDocument.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    description: Optional[str] = None,
    category: str = "sonstiges",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Dateityp nicht erlaubt. Erlaubt: PDF, Word, Excel, Bilder, Text")

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Datei zu groß. Maximum: 10 MB")

    # Create upload directory
    user_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(file.filename or "file")[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(user_upload_dir, unique_filename)

    # Write file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    doc = VereinsDocument(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename or unique_filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        title=title or file.filename,
        description=description,
        category=category if category in CATEGORIES else "sonstiges",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VereinsDocument).where(
            VereinsDocument.id == doc_id,
            VereinsDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    return FileResponse(
        doc.file_path,
        filename=doc.original_filename,
        media_type=doc.mime_type,
    )


@router.patch("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VereinsDocument).where(
            VereinsDocument.id == doc_id,
            VereinsDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")

    if title is not None:
        doc.title = title
    if description is not None:
        doc.description = description
    if category is not None and category in CATEGORIES:
        doc.category = category

    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VereinsDocument).where(
            VereinsDocument.id == doc_id,
            VereinsDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")

    # Delete physical file
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    await db.commit()
