# Messaging app ↔ Codex prototype

This repository now contains a small Python prototype that implements the channel-agnostic design for connecting SMS or WeChat-style inbound messages to Codex.

## What's included
- `MessagingOrchestrator` to accept inbound events, load conversation history, call Codex, and persist outbound replies.
- `InMemoryConversationStore` for normalized conversation state keyed by channel, provider, and user.
- `SMSChannelAdapter` and `WeChatChannelAdapter` to demonstrate channel-specific formatting and delivery behavior.
- `ResponsesAPIGateway` for calling OpenAI's Responses API with a server-side `OPENAI_API_KEY`.
- Unit tests covering SMS chunking, WeChat formatting, and multi-turn history.

## Run the tests
```bash
PYTHONPATH=src python -m unittest discover -s tests -v
```

## Example usage
```python
from messaging_app import (
    FakeCodexGateway,
    InMemoryConversationStore,
    InboundEvent,
    MessagingOrchestrator,
    SMSChannelAdapter,
    WeChatChannelAdapter,
)

orchestrator = MessagingOrchestrator(
    gateway=FakeCodexGateway(),
    store=InMemoryConversationStore(),
    adapters={
        "sms": SMSChannelAdapter(),
        "wechat": WeChatChannelAdapter(),
    },
)

result = orchestrator.handle_inbound(
    InboundEvent(
        channel="sms",
        provider="twilio",
        user_id="+15551234567",
        app_id="+15557654321",
        text="What's my order status?",
    )
)

print([message.text for message in result.messages])
```

## Notes
- `ResponsesAPIGateway` uses `POST https://api.openai.com/v1/responses` and sends the recent conversation turns as the request input.
- The prototype is intentionally minimal: it uses in-memory storage and synchronous delivery calls so the core integration flow stays easy to understand.
- In a production system, replace the store and adapters with durable implementations, add webhook verification, retries, rate limiting, and richer observability.
