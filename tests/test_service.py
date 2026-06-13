import unittest

from messaging_app import (
    FakeCodexGateway,
    InboundEvent,
    InMemoryConversationStore,
    MessagingOrchestrator,
    SMSChannelAdapter,
    WeChatChannelAdapter,
)


class MessagingOrchestratorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = InMemoryConversationStore()
        self.gateway = FakeCodexGateway()
        self.orchestrator = MessagingOrchestrator(
            gateway=self.gateway,
            store=self.store,
            adapters={
                "sms": SMSChannelAdapter(max_chars=35),
                "wechat": WeChatChannelAdapter(),
            },
        )

    def test_sms_request_is_chunked_and_stored(self) -> None:
        self.gateway.reply_prefix = "Codex says this is a very long reply that should be broken into chunks"
        event = InboundEvent(
            channel="sms",
            provider="twilio",
            user_id="+15550001111",
            app_id="+15559990000",
            text="Need a detailed update",
        )

        delivery = self.orchestrator.handle_inbound(event)

        self.assertEqual("sms", delivery.channel)
        self.assertGreater(len(delivery.messages), 1)
        self.assertTrue(all(message.text.startswith("(") for message in delivery.messages))

        stored_messages = self.store.messages_for(delivery.conversation_id)
        self.assertEqual(1 + len(delivery.messages), len(stored_messages))
        self.assertEqual("user", stored_messages[0].role)
        self.assertTrue(all(message.role == "assistant" for message in stored_messages[1:]))

    def test_wechat_reply_stays_single_message(self) -> None:
        event = InboundEvent(
            channel="wechat",
            provider="wechat-official",
            user_id="openid-123",
            app_id="app-456",
            text="Hello from WeChat",
        )

        delivery = self.orchestrator.handle_inbound(event)

        self.assertEqual(1, len(delivery.messages))
        self.assertEqual("wechat", delivery.provider_message_ids[0].split(":")[0])

    def test_history_is_passed_to_gateway_on_follow_up_turn(self) -> None:
        first = InboundEvent(
            channel="sms",
            provider="twilio",
            user_id="+15550002222",
            app_id="+15559990000",
            text="First message",
        )
        second = InboundEvent(
            channel="sms",
            provider="twilio",
            user_id="+15550002222",
            app_id="+15559990000",
            text="Second message",
        )

        self.orchestrator.handle_inbound(first)
        self.orchestrator.handle_inbound(second)

        latest_request = self.gateway.requests[-1]
        contents = [turn.content for turn in latest_request.turns]
        self.assertIn("First message", contents)
        self.assertIn("Second message", contents)
        self.assertGreaterEqual(len(contents), 3)


if __name__ == "__main__":
    unittest.main()
