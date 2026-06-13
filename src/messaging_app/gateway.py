from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass, field
from uuid import uuid4

from .models import CodexRequest, CodexResponse


class CodexGateway:
    def generate(self, request: CodexRequest) -> CodexResponse:
        raise NotImplementedError


@dataclass(slots=True)
class FakeCodexGateway(CodexGateway):
    reply_prefix: str = "Codex"
    requests: list[CodexRequest] = field(default_factory=list)

    def generate(self, request: CodexRequest) -> CodexResponse:
        self.requests.append(request)
        latest_user_turn = next((turn.content for turn in reversed(request.turns) if turn.role == "user"), "")
        return CodexResponse(
            output_text=f"{self.reply_prefix}: {latest_user_turn}",
            response_id=f"fake_{uuid4().hex[:8]}",
        )


class ResponsesAPIGateway(CodexGateway):
    def __init__(self, api_key: str | None = None, model: str = "gpt-5.2") -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required")

    def generate(self, request: CodexRequest) -> CodexResponse:
        payload = {
            "model": self.model,
            "instructions": request.instructions,
            "input": [
                {
                    "role": turn.role,
                    "content": [{"type": "input_text", "text": turn.content}],
                }
                for turn in request.turns
            ],
        }
        body = json.dumps(payload).encode("utf-8")
        http_request = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(http_request, timeout=30) as response:
            decoded = json.loads(response.read().decode("utf-8"))

        output_text = decoded.get("output_text")
        if not output_text:
            output_parts: list[str] = []
            for item in decoded.get("output", []):
                for content in item.get("content", []):
                    text = content.get("text")
                    if text:
                        output_parts.append(text)
            output_text = "\n".join(output_parts)

        return CodexResponse(
            output_text=output_text or "",
            response_id=decoded.get("id"),
            finish_reason=decoded.get("status", "completed"),
        )
