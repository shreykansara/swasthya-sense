"""
PDF Text-Layer Extractor
Uses pdfplumber to extract words and bounding boxes from digitally rendered PDFs.
"""

from pathlib import Path
import pdfplumber
from apps.api.app.extraction.models import BoundingBox
from apps.api.app.utils.logger import logger


def has_sufficient_text_layer(pdf_path: Path, min_char_threshold: int = 150) -> bool:
    """Checks whether the PDF contains a readable digital text layer."""
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            if not pdf.pages:
                return False
            first_page_text = pdf.pages[0].extract_text() or ""
            return len(first_page_text.strip()) >= min_char_threshold
    except Exception as e:
        logger.warning(f"Failed to inspect PDF text layer: {e}")
        return False


def extract_text_and_words_from_pdf(pdf_path: Path) -> list[dict]:
    """
    Extracts text lines and positioned words from PDF pages using pdfplumber.
    Returns structured page lines with bounding box metadata.
    """
    results = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            words = page.extract_words(
                x_tolerance=3,
                y_tolerance=3,
                keep_blank_chars=False,
                use_text_flow=True,
            )

            # Group words by approximate vertical coordinate (line)
            lines_dict = {}
            for w in words:
                top = round(w["top"], -1)  # group into 10pt horizontal bands
                if top not in lines_dict:
                    lines_dict[top] = []
                lines_dict[top].append(w)

            # Reconstruct lines sorted top-to-bottom and left-to-right
            for top_coord in sorted(lines_dict.keys()):
                line_words = sorted(lines_dict[top_coord], key=lambda x: x["x0"])
                line_text = " ".join([w["text"] for w in line_words])
                min_x = min(w["x0"] for w in line_words)
                min_y = min(w["top"] for w in line_words)
                max_x = max(w["x1"] for w in line_words)
                max_y = max(w["bottom"] for w in line_words)

                results.append({
                    "page": page_idx + 1,
                    "text": line_text,
                    "words": line_words,
                    "bbox": BoundingBox(
                        x=round(float(min_x), 1),
                        y=round(float(min_y), 1),
                        w=round(float(max_x - min_x), 1),
                        h=round(float(max_y - min_y), 1),
                        page=page_idx + 1,
                    ),
                    "confidence": 1.0,
                })

    return results
