"""WebSocket Consumer for real-time email notifications."""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class EmailNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('email_notifications', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('email_notifications', self.channel_name)

    async def email_notification(self, event):
        await self.send(text_data=json.dumps(event['data']))
