"""Tests for analysis JSON parser."""

from app.services.analysis import parse_analysis_json


def test_parse_pure_json():
    raw = '{"summary": "test", "todos": ["a"], "risks": [], "acceptance_criteria": ["x"], "open_questions": []}'
    result = parse_analysis_json(raw)
    assert result["summary"] == "test"
    assert result["todos"] == ["a"]


def test_parse_markdown_code_block():
    raw = '''Some text before
```json
{"summary": "test", "todos": ["a"], "risks": [], "acceptance_criteria": ["x"], "open_questions": []}
```
Some text after'''
    result = parse_analysis_json(raw)
    assert result["summary"] == "test"


def test_parse_json_with_prefix():
    raw = '''Here is the analysis:
{"summary": "test", "todos": ["a"], "risks": [], "acceptance_criteria": ["x"], "open_questions": []}'''
    result = parse_analysis_json(raw)
    assert result["summary"] == "test"


def test_parse_returns_none_on_failure():
    raw = "This is just plain text with no JSON"
    result = parse_analysis_json(raw)
    assert result is None


def test_parse_handles_nested_json():
    raw = '{"summary": "ok", "todos": [], "risks": [{"title": "risk1", "description": "desc1"}], "acceptance_criteria": [], "open_questions": []}'
    result = parse_analysis_json(raw)
    assert result["risks"] == [{"title": "risk1", "description": "desc1"}]
