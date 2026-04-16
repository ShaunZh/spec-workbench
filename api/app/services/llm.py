"""LLM service for DeepSeek API (OpenAI-compatible)."""

from typing import Generator, List, Tuple
from openai import OpenAI

from app.core.config import settings

ANALYSIS_SYSTEM_PROMPT = """\
你是一个专业的需求分析专家。请根据用户输入的需求描述，生成结构化分析结果。
必须以以下 JSON 格式返回（不要包含其他内容，不要使用 markdown 代码块标记）：

{
  "summary": "一段话总结需求核心内容",
  "todos": ["待办事项1", "待办事项2"],
  "risks": [{"title": "风险标题", "description": "风险描述"}],
  "acceptance_criteria": ["验收标准1", "验收标准2"],
  "open_questions": ["待确认问题1", "待确认问题2"]
}

分析时注意：
- 识别需求中的模糊或缺失部分
- 考虑技术可行性和业务风险
- 验收标准应具体可测量
- 如果用户输入不是需求描述（如简单问候），仍按格式返回合理内容
"""


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

    def stream_chat_with_mode(
        self, messages: List[dict], conversation_mode: str
    ) -> Tuple[Generator[str, None, None], str]:
        """
        Stream chat with optional analysis system prompt injection.

        Args:
            messages: List of message dicts (will be mutated if mode=="analysis")
            conversation_mode: "chat" or "analysis"

        Returns:
            Tuple of (stream generator, mode label)
        """
        if conversation_mode == "analysis":
            messages.insert(0, {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT})

        return self.stream_chat(messages), conversation_mode


# Singleton instance
llm_service: LLMService = None


def get_llm_service() -> LLMService:
    """Get or create LLM service instance."""
    global llm_service
    if llm_service is None:
        llm_service = LLMService()
    return llm_service
