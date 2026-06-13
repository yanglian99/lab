from __future__ import annotations

from dataclasses import dataclass, field
from itertools import count

from .models import Channel, OutboundMessage


class ChannelAdapter:
    channel: Channel

    def format_messages(self, text: str) -> list[OutboundMessage]:
        raise NotImplementedError

    def send(self, user_id: str, app_id: str, messages: list[OutboundMessage]) -> list[str]:
        raise NotImplementedError


class SMSChannelAdapter(ChannelAdapter):
    channel: Channel = "sms"

    def __init__(self, max_chars: int = 140) -> None:
        self.max_chars = max_chars

    def format_messages(self, text: str) -> list[OutboundMessage]:
        normalized = " ".join(text.split())
        if len(normalized) <= self.max_chars:
            return [OutboundMessage(text=normalized, sequence=1)]

        chunks: list[str] = []
        words = normalized.split(" ")
        current = []
        current_length = 0
        for word in words:
            next_length = current_length + (1 if current else 0) + len(word)
            if current and next_length > self.max_chars - 6:
                chunks.append(" ".join(current))
                current = [word]
                current_length = len(word)
            else:
                current.append(word)
                current_length = next_length
        if current:
            chunks.append(" ".join(current))

        total = len(chunks)
        return [OutboundMessage(text=f"({index}/{total}) {chunk}", sequence=index) for index, chunk in enumerate(chunks, start=1)]

    def send(self, user_id: str, app_id: str, messages: list[OutboundMessage]) -> list[str]:
        return [f"sms:{user_id}:{message.sequence}" for message in messages]


class WeChatChannelAdapter(ChannelAdapter):
    channel: Channel = "wechat"

    def format_messages(self, text: str) -> list[OutboundMessage]:
        return [OutboundMessage(text=text.strip(), sequence=1)]

    def send(self, user_id: str, app_id: str, messages: list[OutboundMessage]) -> list[str]:
        return [f"wechat:{user_id}:{message.sequence}" for message in messages]


@dataclass(slots=True)
class InMemoryDeliveryAdapter:
    sent: list[tuple[str, str, list[OutboundMessage]]] = field(default_factory=list)
    _counter: count = field(default_factory=lambda: count(1))

    def deliver(self, channel: str, user_id: str, messages: list[OutboundMessage]) -> list[str]:
        self.sent.append((channel, user_id, messages))
        return [f"{channel}:delivered:{next(self._counter)}" for _ in messages]
