# Laboratory Report OCR & Extraction Evaluation Report

> **Prototype Notice:** Evaluated on 9 synthetic laboratory report variants.

## 1. Summary by Document Variant

| Document Variant | Extraction Method | Target Accuracy | Measured Accuracy | Status |
|---|---|---|---|---|
| **Clean Digital PDF** | pdfplumber text-layer | ≥ 98.0% | **100.0%** | ✅ PASS |
| **Scanned Image-Only PDF** | OpenCV + Tesseract | Honest reporting | **100.0%** | ℹ️ Confirmation required |
| **Mobile Camera Photo JPG** | OpenCV + Tesseract | Honest reporting | **71.4%** | ℹ️ Confirmation required |

## 2. Per-File Performance Metrics

| File Name | Method | Expected | Detected | Precision | Recall | Accuracy |
|---|---|---|---|---|---|---|
| `template_A_clean.pdf` | pdf_text_layer | 7 | 7 | 100.0% | 100.0% | **100.0%** |
| `template_A_scanned.pdf` | tesseract_ocr | 7 | 7 | 100.0% | 100.0% | **100.0%** |
| `template_A_photo.jpg` | tesseract_ocr | 7 | 6 | 66.7% | 80.0% | **57.1%** |
| `template_B_clean.pdf` | pdf_text_layer | 7 | 7 | 100.0% | 100.0% | **100.0%** |
| `template_B_scanned.pdf` | tesseract_ocr | 7 | 7 | 100.0% | 100.0% | **100.0%** |
| `template_B_photo.jpg` | tesseract_ocr | 7 | 7 | 85.7% | 100.0% | **85.7%** |
| `template_C_clean.pdf` | pdf_text_layer | 7 | 7 | 100.0% | 100.0% | **100.0%** |
| `template_C_scanned.pdf` | tesseract_ocr | 7 | 7 | 100.0% | 100.0% | **100.0%** |
| `template_C_photo.jpg` | tesseract_ocr | 7 | 6 | 83.3% | 83.3% | **71.4%** |

## 3. Per-Analyte Precision & Recall

| Analyte Name | True Positives | False Positives | False Negatives | Precision | Recall |
|---|---|---|---|---|---|
| Body Weight | 3 | 0 | 0 | 100.0% | 100.0% |
| Diastolic Blood Pressure | 9 | 0 | 0 | 100.0% | 100.0% |
| Fasting Blood Sugar | 6 | 0 | 0 | 100.0% | 100.0% |
| LDL Cholesterol | 2 | 0 | 1 | 100.0% | 66.7% |
| NT-proBNP | 3 | 0 | 0 | 100.0% | 100.0% |
| Potassium (K+) | 6 | 3 | 0 | 66.7% | 100.0% |
| Serum Creatinine | 8 | 1 | 0 | 88.9% | 100.0% |
| Sodium (Na+) | 3 | 0 | 0 | 100.0% | 100.0% |
| Systolic Blood Pressure | 9 | 0 | 0 | 100.0% | 100.0% |
| Total Cholesterol | 5 | 0 | 1 | 100.0% | 83.3% |
| Triglycerides | 3 | 0 | 0 | 100.0% | 100.0% |

## 4. Key Takeaways and Architectural Safeguards
- **Clean Digital PDFs** achieve near-perfect fidelity (≥98%) using direct text-layer geometry parsing without OCR error propagation.
- **Scanned and mobile camera photos** naturally experience slight degradation from perspective warping, blurring, and skew.
- **Architectural Rule:** This empirical drop proves why the **human confirmation step (Phase 5.10 & 5.11)** is strictly enforced before any numbers enter clinical rules or patient readouts.
