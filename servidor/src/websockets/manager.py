"""
WebSocket connection manager - Singleton pattern
Manages WebSocket connections and message broadcasting
"""
from typing import Dict, Set
from fastapi import WebSocket
import json
import asyncio


class ConnectionManager:
    """
    Manages WebSocket connections and channels.
    Singleton pattern for centralized connection management.
    """
    
    def __init__(self):
        # Dictionary of channels, each containing a set of active connections
        self.channels: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, channel: str):
        """
        Accept a new WebSocket connection and add it to a channel.
        
        Args:
            websocket: WebSocket connection to add
            channel: Channel name to join
        """
        await websocket.accept()
        
        async with self._lock:
            if channel not in self.channels:
                self.channels[channel] = set()
            self.channels[channel].add(websocket)
        
        print(f"Client connected to channel '{channel}'. Total in channel: {len(self.channels[channel])}")
    
    async def disconnect(self, websocket: WebSocket, channel: str):
        """
        Remove a WebSocket connection from a channel.
        
        Args:
            websocket: WebSocket connection to remove
            channel: Channel name to leave
        """
        async with self._lock:
            if channel in self.channels:
                self.channels[channel].discard(websocket)
                if not self.channels[channel]:
                    del self.channels[channel]
        
        print(f"Client disconnected from channel '{channel}'")
    
    async def broadcast_to_channel(self, channel: str, message: dict):
        """
        Broadcast a message to all connections in a specific channel.
        
        Args:
            channel: Channel name to broadcast to
            message: Message dictionary to send
        """
        if channel not in self.channels:
            return
        
        # Create a copy to avoid modification during iteration
        connections = self.channels[channel].copy()
        
        # Prepare message
        message_str = json.dumps(message)
        
        # Send to all connections in the channel
        disconnected = []
        for connection in connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            await self.disconnect(connection, channel)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send a message to a specific WebSocket connection.
        
        Args:
            message: Message dictionary to send
            websocket: Target WebSocket connection
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending personal message: {e}")
    
    def get_channel_count(self, channel: str) -> int:
        """
        Get the number of connections in a channel.
        
        Args:
            channel: Channel name
            
        Returns:
            Number of active connections in the channel
        """
        return len(self.channels.get(channel, set()))
    
    def get_all_channels(self) -> list:
        """Get list of all active channels"""
        return list(self.channels.keys())


# Singleton instance
manager = ConnectionManager()
