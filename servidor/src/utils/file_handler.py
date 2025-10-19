"""
File handling utilities for image upload and management
"""
from pathlib import Path
from typing import List
import shutil
from fastapi import UploadFile, HTTPException, status

from src.config.settings import get_settings

settings = get_settings()


async def validate_image(file: UploadFile) -> None:
    """
    Validate uploaded image file.
    
    Args:
        file: Uploaded file to validate
        
    Raises:
        HTTPException: If file is invalid
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a filename"
        )
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )


def save_user_images(username: str, images: List[UploadFile]) -> List[str]:
    """
    Save user images to their dedicated folder.
    
    Args:
        username: Username for folder creation
        images: List of uploaded image files
        
    Returns:
        List of saved file paths
    """
    # Create user folder
    user_folder = Path(settings.UPLOAD_DIR) / username
    user_folder.mkdir(parents=True, exist_ok=True)

    saved_files = []

    try:
        for idx, image in enumerate(images, 1):
            # Generate filename
            file_ext = Path(image.filename).suffix
            filename = f"image_{idx}{file_ext}"
            file_path = user_folder / filename

            # Save file synchronously using the underlying file object
            # UploadFile.file is a SpooledTemporaryFile-like object and supports sync read
            # Seek to beginning then read
            try:
                image.file.seek(0)
            except Exception:
                pass
            content = image.file.read()

            with open(file_path, 'wb') as out_file:
                out_file.write(content)

            saved_files.append(str(file_path))

            # Reset file pointer for potential reuse
            try:
                image.file.seek(0)
            except Exception:
                pass

        return saved_files
    except Exception as e:
        # Clean up on error
        if user_folder.exists():
            shutil.rmtree(user_folder)
        raise e


def delete_user_folder(username: str) -> None:
    """
    Delete user's data folder.
    
    Args:
        username: Username whose folder should be deleted
    """
    user_folder = Path(settings.UPLOAD_DIR) / username
    
    if user_folder.exists():
        shutil.rmtree(user_folder)
