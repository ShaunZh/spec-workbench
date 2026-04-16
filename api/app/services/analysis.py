"""Analysis JSON parsing utilities."""

import json
import re
from typing import Optional


def parse_analysis_json(raw: str) -> Optional[dict]:
    """
    Parse structured analysis JSON from LLM response.

    Tries in order:
    1. Pure JSON via json.loads
    2. Markdown code block (```json ... ```)
    3. First balanced JSON object ({ ... })

    Returns parsed dict or None if no valid JSON found.
    """
    # Try 1: pure JSON
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try 2: markdown code block
    match = re.search(r"```json\s*\n(.*?)\n```", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    # Try 3: first balanced JSON object
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start : end + 1])
        except (json.JSONDecodeError, ValueError):
            pass

    return None
