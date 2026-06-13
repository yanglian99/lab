from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

Channel = Literal["sms", "wechat"]
MessageRole = Literal["user", "assistant"]
MessageStatus = Literal["received", "processing", "sent", "failed"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class InboundEvent:
    channel: Channel
    provider: str
    user_id: str
    app_id: str
    text: str
    message_id: str = field(default_factory=lambda: f"msg_{uuid4().hex[:12]}")
    received_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class ConversationMessage:
    conversation_id: str
    role: MessageRole
    text: str
    channel: Channel
    provider: str
    user_id: str
    status: MessageStatus
    provider_message_id: str | None = None
    openai_response_id: str | None = None
    created_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class PromptTurn:
    role: MessageRole
    content: str


@dataclass(slots=True)
class CodexRequest:
    conversation_id: str
    channel: Channel
    instructions: str
    turns: list[PromptTurn]


@dataclass(slots=True)
class CodexResponse:
    output_text: str
    response_id: str | None = None
    finish_reason: str = "stop"


@dataclass(slots=True)
class OutboundMessage:
    text: str
    sequence: int


@dataclass(slots=True)
class OutboundDelivery:
    conversation_id: str
    channel: Channel
    messages: list[OutboundMessage]
    finish_reason: str
    provider_message_ids: list[str] = field(default_factory=list)
