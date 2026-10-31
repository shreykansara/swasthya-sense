"""
OCR Fallback Extractor (PyMuPDF + OpenCV + Tesseract)
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

import math
import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import pymupdf  # PyMuPDF
import pytesseract

from apps.api.app.config import settings
from apps.api.app.extraction.models import BoundingBox
from apps.api.app.utils.logger import logger

# Configure Tesseract binary path
TESS_CANDIDATES = [
    settings.TESSERACT_CMD,
    r"C:\Users\Shrey\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    "/usr/bin/tesseract",
]

for cand in TESS_CANDIDATES:
    if cand and Path(cand).exists():
        pytesseract.pytesseract.tesseract_cmd = cand
        break


def preprocess_image_for_ocr(img_path: Path) -> np.ndarray:
    """
    Applies image enhancement pipeline:
    Grayscale -> Deskew -> Bilateral/Gaussian Denoise -> Adaptive Threshold.
    """
    img = cv2.imread(str(img_path))
    if img is None:
        raise ValueError(f"Could not load image at {img_path}")

    # 1. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Denoise
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)

    # 3. Deskew calculation via moments or minAreaRect on non-zero pixels
    coords = np.column_stack(np.where(denoised < 250))
    if len(coords) > 100:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Rotate if skew is perceptible but within typical bounds (<15 deg)
        if abs(angle) > 0.3 and abs(angle) < 15:
            (h, w) = gray.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            denoised = cv2.warpAffine(
                denoised, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )

    # 4. Contrast enhancement (Otsu threshold or adaptive)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return thresh


def render_pdf_page_to_image(pdf_path: Path, page_num: int = 0, dpi: int = 200) -> Path:
    """Renders a PDF page to high-res image for OCR."""
    doc = pymupdf.open(str(pdf_path))
    page = doc[page_num]
    pix = page.get_pixmap(dpi=dpi)
    temp_img_path = pdf_path.parent / f"_temp_page_{page_num}_{pdf_path.stem}.png"
    pix.save(str(temp_img_path))
    doc.close()
    return temp_img_path


def extract_text_via_ocr(file_path: Path) -> list[dict]:
    """
    Runs Tesseract OCR with image preprocessing.
    Extracts word data, line groups, bounding boxes, and confidence levels.
    Supports PDF (via PyMuPDF rendering) as well as JPG/PNG photos.
    """
    is_pdf = file_path.suffix.lower() == ".pdf"
    results = []

    if is_pdf:
        doc = pymupdf.open(str(file_path))
        num_pages = len(doc)
        doc.close()

        for p_idx in range(num_pages):
            temp_img = render_pdf_page_to_image(file_path, page_num=p_idx)
            try:
                page_results = _process_single_image(temp_img, page_num=p_idx + 1)
                results.extend(page_results)
            finally:
                if temp_img.exists():
                    temp_img.unlink()
    else:
        results = _process_single_image(file_path, page_num=1)

    return results


def _process_single_image(img_path: Path, page_num: int = 1) -> list[dict]:
    """Preprocesses an image and runs pytesseract.image_to_data."""
    preprocessed = preprocess_image_for_ocr(img_path)

    # Configure Tesseract OEM and PSM (PSM 6: Assume a single uniform block of text)
    custom_config = r"--oem 3 --psm 6"
    data = pytesseract.image_to_data(
        preprocessed,
        output_type=pytesseract.Output.DICT,
        config=custom_config,
    )

    n_boxes = len(data["text"])
    lines_by_num = {}

    for i in range(n_boxes):
        text = data["text"][i].strip()
        conf = float(data["conf"][i])

        if not text or conf < 0:
            continue

        line_id = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        if line_id not in lines_by_num:
            lines_by_num[line_id] = []

        lines_by_num[line_id].append({
            "text": text,
            "conf": conf / 100.0,  # normalize to 0.0 - 1.0
            "left": data["left"][i],
            "top": data["top"][i],
            "width": data["width"][i],
            "height": data["height"][i],
        })

    results = []
    for line_id, words in lines_by_num.items():
        line_text = " ".join([w["text"] for w in words])
        avg_conf = sum(w["conf"] for w in words) / max(len(words), 1)

        min_x = min(w["left"] for w in words)
        min_y = min(w["top"] for w in words)
        max_x = max(w["left"] + w["width"] for w in words)
        max_y = max(w["top"] + w["height"] for w in words)

        results.append({
            "page": page_num,
            "text": line_text,
            "words": words,
            "confidence": round(avg_conf, 3),
            "bbox": BoundingBox(
                x=float(min_x),
                y=float(min_y),
                w=float(max_x - min_x),
                h=float(max_y - min_y),
                page=page_num,
            ),
        })

    return results
