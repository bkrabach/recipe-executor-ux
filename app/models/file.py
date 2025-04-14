from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class FileInfo(BaseModel):
    """File information - simplified to directly represent physical files"""
    
    id: str = Field(..., description="File identifier (the filename)")
    name: str = Field(..., description="Display name")
    content_type: str = Field(..., description="File content type")
    size: int = Field(..., description="File size in bytes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class FileList(BaseModel):
    """List of files"""
    
    files: List[FileInfo] = Field([], description="List of files")