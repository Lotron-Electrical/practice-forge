import os
import tempfile
import logging

from fastapi import APIRouter, UploadFile, File

from app.models.schemas import OmrResponse
from app.services.audiveris import process_file
from app.config import DATA_DIR

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/process", response_model=OmrResponse)
async def process_omr(file: UploadFile = File(...)):
    """Process an uploaded sheet music image/PDF through Audiveris OMR."""
    temp_path = None
    try:
        os.makedirs(DATA_DIR, exist_ok=True)

        # Save uploaded file to temp dir
        suffix = os.path.splitext(file.filename or "upload.pdf")[1]
        with tempfile.NamedTemporaryFile(
            dir=DATA_DIR, suffix=suffix, delete=False
        ) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_path = tmp.name

        # Run Audiveris
        result = process_file(temp_path)

        if not result.get("success"):
            return OmrResponse(
                success=False,
                error=result.get("error", "OMR processing failed"),
            )

        musicxml_content = result.get("musicxml_content", "")

        # Parse briefly with music21 to extract metadata
        measure_count = None
        extracted_title = None
        extracted_composer = None
        try:
            import music21

            score = music21.converter.parse(musicxml_content)
            measure_count = len(score.parts[0].getElementsByClass("Measure")) if score.parts else None

            if score.metadata:
                extracted_title = score.metadata.title
                extracted_composer = score.metadata.composer
        except Exception as e:
            logger.warning(f"music21 metadata extraction failed: {e}")

        return OmrResponse(
            success=True,
            musicxml_content=musicxml_content,
            confidence=result.get("confidence"),
            page_count=result.get("page_count"),
            measure_count=measure_count,
            extracted_title=extracted_title,
            extracted_composer=extracted_composer,
        )

    except Exception as e:
        logger.exception("OMR processing error")
        return OmrResponse(success=False, error=str(e))

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                pass
