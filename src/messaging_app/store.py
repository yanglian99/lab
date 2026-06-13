from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4

from .models import ConversationMessage, InboundEvent, PromptTurn


@dataclass(slots=True)
class ConversationRecord:
    conversation_id: str
    channel: str
    provider: str
    user_id: str
    messages: list[ConversationMessage] = field(default_factory=list)


class InMemoryConversationStore:
    def __init__(self) -> None:
        self._by_key: dict[tuple[str, str, str], ConversationRecord] = {}

    def get_or_create(self, event: InboundEvent) -> ConversationRecord:
        key = (event.channel, event.provider, event.user_id)
        if key not in self._by_key:
            self._by_key[key] = ConversationRecord(
                conversation_id=f"conv_{uuid4().hex[:12]}",
                channel=event.channel,
                provider=event.provider,
                user_id=event.user_id,
            )
        return self._by_key[key]

    def append(self, event: ConversationMessage) -> None:
        key = (event.channel, event.provider, event.user_id)
        record = self._by_key[key]
        record.messages.append(event)

    def recent_turns(self, conversation_id: str, limit: int = 8) -> list[PromptTurn]:
        for record in self._by_key.values():
            if record.conversation_id == conversation_id:
                return [PromptTurn(role=msg.role, content=msg.text) for msg in record.messages[-limit:]]
        raise KeyError(f"Unknown conversation: {conversation_id}")

    def messages_for(self, conversation_id: str) -> list[ConversationMessage]:
        for record in self._by_key.values():
            if record.conversation_id == conversation_id:
                return list(record.messages)
        raise KeyError(f"Unknown conversation: {conversation_id}")
