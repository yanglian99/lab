from __future__ import annotations

from dataclasses import dataclass

from .adapters import ChannelAdapter
from .gateway import CodexGateway
from .models import CodexRequest, ConversationMessage, InboundEvent, OutboundDelivery
from .store import InMemoryConversationStore

DEFAULT_INSTRUCTIONS = (
    "You are a concise messaging assistant. Keep replies short, clear, and safe for mobile chat. "
    "Ask at most one clarifying question if needed. Do not claim to have taken actions you did not actually take."
)


@dataclass(slots=True)
class MessagingOrchestrator:
    gateway: CodexGateway
    store: InMemoryConversationStore
    adapters: dict[str, ChannelAdapter]
    instructions: str = DEFAULT_INSTRUCTIONS

    def handle_inbound(self, event: InboundEvent) -> OutboundDelivery:
        if event.channel not in self.adapters:
            raise ValueError(f"Unsupported channel: {event.channel}")

        record = self.store.get_or_create(event)
        inbound = ConversationMessage(
            conversation_id=record.conversation_id,
            role="user",
            text=event.text,
            channel=event.channel,
            provider=event.provider,
            user_id=event.user_id,
            provider_message_id=event.message_id,
            status="received",
        )
        self.store.append(inbound)

        turns = self.store.recent_turns(record.conversation_id)
        response = self.gateway.generate(
            CodexRequest(
                conversation_id=record.conversation_id,
                channel=event.channel,
                instructions=self.instructions,
                turns=turns,
            )
        )

        adapter = self.adapters[event.channel]
        outbound_messages = adapter.format_messages(response.output_text)
        provider_ids = adapter.send(event.user_id, event.app_id, outbound_messages)

        for outbound_message, provider_id in zip(outbound_messages, provider_ids):
            self.store.append(
                ConversationMessage(
                    conversation_id=record.conversation_id,
                    role="assistant",
                    text=outbound_message.text,
                    channel=event.channel,
                    provider=event.provider,
                    user_id=event.user_id,
                    provider_message_id=provider_id,
                    openai_response_id=response.response_id,
                    status="sent",
                )
            )

        return OutboundDelivery(
            conversation_id=record.conversation_id,
            channel=event.channel,
            messages=outbound_messages,
            finish_reason=response.finish_reason,
            provider_message_ids=provider_ids,
        )
