"""
plate_reader.py
----------------
Real ANPR (Automatic Number Plate Recognition) pipeline for the academic demo.

Requires (pip install):
    opencv-python
    easyocr            # or pytesseract + tesseract-ocr system binary
    numpy

Usage:
    python plate_reader.py <path_to_image>

Prints the best-guess plate text to stdout as JSON: {"plate": "KA01AB1234", "confidence": 0.91}

Pipeline:
    1. Load image, resize for consistent processing.
    2. Convert to grayscale, reduce noise (bilateral filter).
    3. Edge detection (Canny) + contour search for rectangular plate-like regions
       (aspect ratio ~2:1 to 5:1, filtered by area).
    4. Crop the candidate plate region(s).
    5. Run OCR (EasyOCR) on the cropped region(s).
    6. Clean the OCR text (strip non-alphanumeric, uppercase) and return the
       highest-confidence match.

NOTE: This script is provided as the real, working implementation described
in the project brief. It is NOT executed inside the sandboxed chat environment
used to generate this project (no internet access there to install opencv/
easyocr), so the Node backend calls a deterministic stub (see ocr/ocrService.js)
when OCR_MODE=stub. Set OCR_MODE=python once you've pip-installed the
dependencies locally, and the Node backend will shell out to this script instead.
"""

import sys
import json
import re

def extract_plate(image_path: str):
    import cv2
    import numpy as np
    import easyocr

    img = cv2.imread(image_path)
    if img is None:
        return {"plate": None, "confidence": 0.0, "error": "Could not read image"}

    img = cv2.resize(img, (800, int(800 * img.shape[0] / img.shape[1])))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    edged = cv2.Canny(gray, 30, 200)

    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:15]

    plate_img = None
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        aspect_ratio = w / float(h) if h else 0
        if 2.0 <= aspect_ratio <= 6.0 and w > 80:
            plate_img = gray[y:y + h, x:x + w]
            break

    if plate_img is None:
        plate_img = gray  # fall back to whole image

    reader = easyocr.Reader(['en'], gpu=False)
    results = reader.readtext(plate_img)

    if not results:
        return {"plate": None, "confidence": 0.0}

    best = max(results, key=lambda r: r[2])
    raw_text = best[1]
    confidence = float(best[2])
    cleaned = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper()

    return {"plate": cleaned, "confidence": round(confidence, 3)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python plate_reader.py <image_path>"}))
        sys.exit(1)
    print(json.dumps(extract_plate(sys.argv[1])))
