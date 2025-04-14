import logging
import os
import pathlib
from datetime import datetime
from typing import Optional

import magic
from fastapi import UploadFile

from app.models.file import FileInfo, FileList

logger = logging.getLogger("recipe-executor-ux")


def detect_content_type(content: bytes) -> str:
    """
    Determine the content type based on file content using libmagic

    Args:
        content: The file content as bytes

    Returns:
        str: The detected MIME type
    """
    try:
        # Use python-magic to detect the MIME type from file content
        mime = magic.Magic(mime=True)
        content_type = mime.from_buffer(content)

        # Additional adjustments for specific formats
        if content_type == "text/plain":
            # Check if it might be a common text format
            if content[:5] == b"<?xml":
                return "text/xml"
            elif content.startswith(b"{") or content.startswith(b"["):
                # Potential JSON, check if it's valid
                try:
                    import json

                    json.loads(content)
                    return "application/json"
                except Exception:
                    pass
            elif content.startswith(b"---") or content.startswith(b"```"):
                # Likely markdown or YAML
                return "text/markdown"

        # Special case for Python files
        if content_type == "text/plain" and (
            b"import " in content or b"def " in content or b"class " in content
        ):
            return "text/x-python"

        return content_type
    except Exception as e:
        logger.error(f"Error detecting content type: {str(e)}")
        return "application/octet-stream"


class FileService:
    """Service for managing files - directly uses filenames for storage"""

    def __init__(self, files_dir: str):
        """Initialize with the files directory path"""
        self.files_dir = files_dir

        # Create files directory if it doesn't exist
        if not os.path.exists(files_dir):
            os.makedirs(files_dir)
            logger.info(f"Created files directory: {files_dir}")

    async def upload_file(
        self, file: UploadFile, description: Optional[str] = None
    ) -> FileInfo:
        """
        Upload a file - uses the actual filename for storage

        Args:
            file: The file to upload
            description: Optional description (unused in simplified version)

        Returns:
            FileInfo: Information about the uploaded file
        """
        # Use the original filename, ensuring it's safe and unique
        original_filename = file.filename or "unnamed_file"
        safe_filename = self._get_safe_filename(original_filename)

        # Build full path
        file_path = os.path.join(self.files_dir, safe_filename)

        try:
            # Read file contents and save to disk
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)

            # Detect content type
            content_type = file.content_type
            if not content_type or content_type == "application/octet-stream":
                content_type = detect_content_type(contents)
                logger.info(
                    f"Detected content type for {safe_filename}: {content_type}"
                )

            # Get file stats for created/modified times
            file_stats = os.stat(file_path)
            created_time = datetime.fromtimestamp(file_stats.st_ctime)
            modified_time = datetime.fromtimestamp(file_stats.st_mtime)

            # Build FileInfo directly from the file
            file_info = FileInfo(
                id=safe_filename,  # Use filename as ID
                name=original_filename,
                content_type=content_type,
                size=len(contents),
                created_at=created_time,
                updated_at=modified_time,
            )

            logger.info(f"Uploaded file: {file_info.name} as {safe_filename}")
            return file_info

        except Exception as e:
            logger.error(f"Error uploading file {safe_filename}: {str(e)}")
            # Clean up if file was partially created
            if os.path.exists(file_path):
                os.remove(file_path)
            raise

    def list_files(self) -> FileList:
        """
        List all files in the files directory

        Returns:
            FileList: List of file information
        """
        files = []

        # Ensure the directory exists
        if not os.path.exists(self.files_dir):
            os.makedirs(self.files_dir)
            return FileList(files=[])

        # Scan all files in directory
        for filename in os.listdir(self.files_dir):
            file_path = os.path.join(self.files_dir, filename)

            # Skip directories
            if os.path.isdir(file_path):
                continue

            try:
                # Get file information
                file_info = self._create_file_info_from_path(file_path)
                if file_info:
                    files.append(file_info)
            except Exception as e:
                logger.error(f"Error processing file {filename}: {str(e)}")

        # Sort by updated_at (newest first)
        files.sort(key=lambda f: f.updated_at, reverse=True)
        return FileList(files=files)

    def get_file(self, file_id: str) -> Optional[FileInfo]:
        """
        Get file information by ID (which is now the filename)

        Args:
            file_id: The filename

        Returns:
            Optional[FileInfo]: File information or None if not found
        """
        file_path = os.path.join(self.files_dir, file_id)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            return None

        return self._create_file_info_from_path(file_path)

    def get_file_path(self, file_id: str) -> Optional[str]:
        """
        Get the file system path for a file

        Args:
            file_id: The filename

        Returns:
            Optional[str]: File path or None if not found
        """
        file_path = os.path.join(self.files_dir, file_id)
        return (
            file_path
            if os.path.exists(file_path) and not os.path.isdir(file_path)
            else None
        )

    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file

        Args:
            file_id: The filename

        Returns:
            bool: True if deleted, False if not found
        """
        file_path = os.path.join(self.files_dir, file_id)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            return False

        try:
            os.remove(file_path)
            logger.info(f"Deleted file: {file_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {str(e)}")
            return False

    def save_generated_file(
        self,
        filename: str,
        content: bytes,
        content_type: Optional[str] = None,
    ) -> FileInfo:
        """
        Save a file generated during recipe execution

        Args:
            filename: The name for the file
            content: The file content
            content_type: The content type (or None to auto-detect)

        Returns:
            FileInfo: Information about the saved file
        """
        # Ensure the filename is safe and unique
        safe_filename = self._get_safe_filename(filename)
        file_path = os.path.join(self.files_dir, safe_filename)

        # Determine content type if not provided
        if not content_type or content_type == "application/octet-stream":
            content_type = detect_content_type(content)

        try:
            # Write content to file
            with open(file_path, "wb") as f:
                f.write(content)

            # Get file information
            file_info = self._create_file_info_from_path(file_path, content_type)

            logger.info(f"Saved generated file: {filename} as {safe_filename}")
            return file_info

        except Exception as e:
            logger.error(f"Error saving generated file {filename}: {str(e)}")
            # Clean up if file was partially created
            if os.path.exists(file_path):
                os.remove(file_path)
            raise

    def _get_safe_filename(self, filename: str) -> str:
        """
        Create a safe filename that can be used on disk.
        If a file with the same name exists, append a number to make it unique.

        Args:
            filename: The original filename

        Returns:
            A sanitized unique filename
        """
        # Replace problematic characters
        safe_base = "".join(c if c.isalnum() or c in "._- " else "_" for c in filename)
        safe_base = safe_base.strip()

        # If empty after sanitizing, use a default
        if not safe_base:
            safe_base = "unnamed_file"

        # Check if file exists and make unique if needed
        file_path = os.path.join(self.files_dir, safe_base)
        counter = 1

        stem = pathlib.Path(safe_base).stem
        suffix = pathlib.Path(safe_base).suffix

        while os.path.exists(file_path):
            safe_name = f"{stem}_{counter}{suffix}"
            file_path = os.path.join(self.files_dir, safe_name)
            counter += 1

        return os.path.basename(file_path)

    def _create_file_info_from_path(
        self, file_path: str, override_content_type: Optional[str] = None
    ) -> FileInfo:
        """
        Create a FileInfo object from a file path

        Args:
            file_path: The path to the file
            override_content_type: Optional content type to use instead of detecting

        Returns:
            FileInfo: Information about the file
        """
        # Get file stats
        file_stats = os.stat(file_path)
        filename = os.path.basename(file_path)

        # Detect content type if not overridden
        content_type = override_content_type
        if not content_type:
            try:
                with open(file_path, "rb") as f:
                    content = f.read(8192)  # Read first 8KB to detect type
                content_type = detect_content_type(content)
            except Exception as e:
                logger.error(f"Error detecting content type for {filename}: {str(e)}")
                content_type = "application/octet-stream"

        # Create FileInfo
        return FileInfo(
            id=filename,  # Use filename as ID
            name=filename,  # Display name is same as filename
            content_type=content_type,
            size=file_stats.st_size,
            created_at=datetime.fromtimestamp(file_stats.st_ctime),
            updated_at=datetime.fromtimestamp(file_stats.st_mtime),
        )
