import os
import shutil
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from fastapi.responses import FileResponse
import tempfile
import subprocess
from datetime import datetime

class TemplateFileStorage:
    def __init__(self):
        # Create uploads directory in current working directory (backend when server runs)
        self.base_path = Path.cwd() / "uploads" / "templates"
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save_docx_file(self, file: UploadFile, template_id: int) -> dict:
        """Save DOCX file and return metadata"""
        if not file.filename or not file.filename.endswith('.docx'):
            raise HTTPException(status_code=400, detail="Only DOCX files are supported")

        # Accept both standard and potential browser-sent content types
        valid_content_types = [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream",  # Some browsers send this
            None  # Some uploads might not set content type
        ]

        if file.content_type not in valid_content_types:
            print(f"Warning: Unexpected content type: {file.content_type}")
            # Only check file extension as fallback

        # Generate file path
        file_name = f"template_{template_id}.docx"
        file_path = self.base_path / file_name

        # Save file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        # Get file size
        file_size = os.path.getsize(file_path)

        return {
            "file_path": f"uploads/templates/{file_name}",  # Store relative path
            "file_name": file.filename,
            "file_size": file_size,
            "mime_type": file.content_type,
            "saved_at": datetime.utcnow().isoformat()
        }

    def get_docx_file(self, template_id: int) -> FileResponse:
        """Serve DOCX file for OnlyOffice editor"""
        file_path = self.base_path / f"template_{template_id}.docx"

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Template file not found")

        # Use inline disposition for OnlyOffice compatibility
        response = FileResponse(
            path=str(file_path),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"template_{template_id}.docx"
        )
        # Override Content-Disposition header explicitly
        response.headers["Content-Disposition"] = f'inline; filename="template_{template_id}.docx"'
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        return response

    async def replace_docx_file(self, file: UploadFile, template_id: int) -> dict:
        """Replace existing DOCX file (used by OnlyOffice save callback)"""
        return await self.save_docx_file(file, template_id)

    def save_docx_content(self, file_content: bytes, template_id: int) -> dict:
        """Save DOCX content from bytes (used by OnlyOffice callback)"""
        file_path = self.base_path / f"template_{template_id}.docx"

        try:
            with open(file_path, 'wb') as f:
                f.write(file_content)

            return {
                "file_size": len(file_content),
                "file_path": str(file_path)
            }
        except Exception as e:
            raise Exception(f"Failed to save DOCX content: {str(e)}")

    def delete_docx_file(self, template_id: int) -> bool:
        """Delete DOCX file"""
        file_path = self.base_path / f"template_{template_id}.docx"

        if file_path.exists():
            try:
                os.remove(file_path)
                return True
            except Exception:
                return False
        return False

    def file_exists(self, template_id: int) -> bool:
        """Check if DOCX file exists"""
        file_path = self.base_path / f"template_{template_id}.docx"
        return file_path.exists()

    def get_docx_content(self, template_id: int) -> bytes:
        """Get DOCX file content as bytes"""
        file_path = self.base_path / f"template_{template_id}.docx"

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Template file not found")

        try:
            with open(file_path, 'rb') as f:
                return f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    async def generate_html_preview(self, template_id: int) -> Optional[str]:
        """Generate HTML preview from DOCX using Pandoc (optional)"""
        file_path = self.base_path / f"template_{template_id}.docx"

        if not file_path.exists():
            return None

        try:
            with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as temp_html:
                # Use Pandoc to convert DOCX to HTML
                result = subprocess.run([
                    'pandoc',
                    str(file_path),
                    '-t', 'html',
                    '-o', temp_html.name,
                    '--extract-media', str(self.base_path / 'media')
                ], capture_output=True, text=True, check=True)

                # Read the generated HTML
                with open(temp_html.name, 'r', encoding='utf-8') as f:
                    html_content = f.read()

                # Clean up temp file
                os.unlink(temp_html.name)

                return html_content

        except subprocess.CalledProcessError as e:
            print(f"Pandoc conversion failed: {e}")
            return None
        except Exception as e:
            print(f"HTML generation error: {e}")
            return None

# Global instance
file_storage = TemplateFileStorage()