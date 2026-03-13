import os
import glob
import shutil
import logging
import subprocess
import tempfile

from app.config import AUDIVERIS_JAR, DATA_DIR

logger = logging.getLogger(__name__)


def process_file(file_path: str) -> dict:
    """Run Audiveris OMR on the given file and return MusicXML content.

    Returns a dict with keys: success, musicxml_content, error, confidence, page_count.
    """
    # Check prerequisites
    if not AUDIVERIS_JAR:
        return {
            "success": False,
            "error": "AUDIVERIS_JAR environment variable not set. "
            "Audiveris is not configured on this server.",
        }

    if not os.path.isfile(AUDIVERIS_JAR):
        return {
            "success": False,
            "error": f"Audiveris JAR not found at: {AUDIVERIS_JAR}",
        }

    # Check Java is available
    try:
        subprocess.run(
            ["java", "-version"],
            capture_output=True,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return {
            "success": False,
            "error": "Java JRE is not installed or not on PATH. "
            "Audiveris requires Java to run.",
        }

    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp(dir=DATA_DIR, prefix="audiveris_")

        # Run Audiveris
        cmd = [
            "java",
            "-jar",
            AUDIVERIS_JAR,
            "-batch",
            "-export",
            "-output",
            temp_dir,
            file_path,
        ]

        logger.info(f"Running Audiveris: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip()
            return {
                "success": False,
                "error": f"Audiveris processing failed (exit code {result.returncode}): {error_msg}",
            }

        # Find the output MusicXML file (.mxl or .xml)
        output_files = glob.glob(os.path.join(temp_dir, "**", "*.mxl"), recursive=True)
        if not output_files:
            output_files = glob.glob(
                os.path.join(temp_dir, "**", "*.xml"), recursive=True
            )

        if not output_files:
            return {
                "success": False,
                "error": "Audiveris completed but no MusicXML output was found.",
            }

        # Read the first output file
        output_path = output_files[0]

        # .mxl files are compressed — handle both
        if output_path.endswith(".mxl"):
            import zipfile

            with zipfile.ZipFile(output_path, "r") as zf:
                # Find the .xml file inside the .mxl archive
                xml_names = [n for n in zf.namelist() if n.endswith(".xml")]
                if not xml_names:
                    return {
                        "success": False,
                        "error": "MXL archive contains no XML file.",
                    }
                musicxml_content = zf.read(xml_names[0]).decode("utf-8")
        else:
            with open(output_path, "r", encoding="utf-8") as f:
                musicxml_content = f.read()

        return {
            "success": True,
            "musicxml_content": musicxml_content,
            "confidence": None,
            "page_count": None,
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Audiveris processing timed out after 5 minutes.",
        }
    except Exception as e:
        logger.exception("Audiveris processing error")
        return {"success": False, "error": str(e)}

    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except OSError as e:
                logger.warning(f"Failed to clean up temp dir {temp_dir}: {e}")
