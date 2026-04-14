"""LLM service for DeepSeek API (OpenAI-compatible)."""

from typing import Generator, List
from openai import OpenAI

from app.core.config import settings


class LLMService:
    """Service for interacting with DeepSeek LLM API."""

    def __init__(self):
        """Initialize OpenAI client pointing to DeepSeek."""
        if not settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is not configured")

        self.client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
        self.model = settings.deepseek_model

    def stream_chat(self, messages: List[dict]) -> Generator[str, None, None]:
        """
        Stream chat completion from DeepSeek API.

        Args:
            messages: List of message dicts with 'role' and 'content'

        Yields:
            str: Each content chunk from the streaming response
        """
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Singleton instance
llm_service: LLMService = None


def get_llm_service() -> LLMService:
    """Get or create LLM service instance."""
    global llm_service
    if llm_service is None:
        llm_service = LLMService()
    return llm_service
