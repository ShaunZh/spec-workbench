"""Tests for LLM service mode-aware behavior."""

import pytest
from unittest.mock import patch, MagicMock

import app.services.llm as llm_module
from app.core.config import settings


@pytest.fixture(autouse=True)
def reset_llm_singleton():
    """Reset the LLM singleton before each test."""
    llm_module.llm_service = None
    yield
    llm_module.llm_service = None


@pytest.fixture
def mock_llm_service(monkeypatch):
    """Provide a working LLM service with mocked OpenAI client."""
    # Fake the API key so __init__ doesn't raise
    monkeypatch.setattr(settings, "deepseek_api_key", "fake-test-key")

    with patch("app.services.llm.OpenAI") as mock_openai:
        mock_openai.return_value = MagicMock()
        llm_module.llm_service = None  # reset so it gets recreated
        yield llm_module.get_llm_service()
        llm_module.llm_service = None


def test_analysis_system_prompt_is_valid():
    """Verify the analysis system prompt contains required JSON schema fields."""
    from app.services.llm import ANALYSIS_SYSTEM_PROMPT

    assert "summary" in ANALYSIS_SYSTEM_PROMPT
    assert "todos" in ANALYSIS_SYSTEM_PROMPT
    assert "risks" in ANALYSIS_SYSTEM_PROMPT
    assert "acceptance_criteria" in ANALYSIS_SYSTEM_PROMPT
    assert "open_questions" in ANALYSIS_SYSTEM_PROMPT
    assert "json" in ANALYSIS_SYSTEM_PROMPT.lower()


def test_analysis_mode_injects_system_prompt(mock_llm_service):
    """Verify that analysis mode prepends a system message."""
    messages = [{"role": "user", "content": "I need a login feature"}]
    gen, mode = mock_llm_service.stream_chat_with_mode(messages, "analysis")

    assert messages[0]["role"] == "system"
    assert "\u9700\u6c42\u5206\u6790\u4e13\u5bb6" in messages[0]["content"]
    assert messages[1]["role"] == "user"
    assert mode == "analysis"


def test_chat_mode_does_not_modify_messages(mock_llm_service):
    """Verify that chat mode does NOT inject system prompt."""
    messages = [{"role": "user", "content": "Hello"}]
    original_messages = list(messages)
    gen, mode = mock_llm_service.stream_chat_with_mode(messages, "chat")

    assert messages == original_messages
    assert mode == "chat"
