import json
import re
import sys
from datetime import datetime


def parse_expiry(text):
    patterns = [
        (r'\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b', '%Y-%m-%d', (1, 2, 3)),
        (r'\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b', '%d-%m-%Y', (1, 2, 3)),
    ]
    candidates = []
    for pattern, date_format, groups in patterns:
        for match in re.finditer(pattern, text):
            values = [match.group(index) for index in groups]
            candidate = '-'.join(values)
            try:
                candidates.append(datetime.strptime(candidate, date_format).date().isoformat())
            except ValueError:
                continue
    return max(candidates) if candidates else None


def read_document(image_path):
    import easyocr

    reader = easyocr.Reader(['en'], gpu=False)
    lines = reader.readtext(image_path, detail=0, paragraph=True)
    text = '\n'.join(str(line) for line in lines)
    return {'extracted_text': text, 'expiry_date': parse_expiry(text)}


if __name__ == '__main__':
    try:
        print(json.dumps(read_document(sys.argv[1])))
    except Exception as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(1)