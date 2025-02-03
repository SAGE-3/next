# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
from foresight.config import config as conf, prod_type
from typing import Callable, Dict, Any, Optional
import os
import websocket
import threading
import json
import uuid
import time
import sys
import logging
import traceback
from queue import Queue

logger = logging.getLogger(__name__)

class SageWebsocket:
    def __init__(self, on_message_fn: Optional[Callable] = None):
        """
        Initialize the SageWebsocket.
        
        Args:
            on_message_fn: Optional callback function for message handling
        """
        logger.debug("Initializing SageWebsocket")
        self.connected = False
        self.connection_error = None
        
        # Enable websocket debug logging
        websocket.enableTrace(True)
        
        ws_url = conf[prod_type]["ws_server"] + "/api"
        token = os.getenv("TOKEN")
        
        logger.debug(f"Connecting to WebSocket URL: {ws_url}")
        logger.debug(f"Authentication token present: {bool(token)}")
        
        self.ws = websocket.WebSocketApp(
            ws_url,
            header={"Authorization": f"Bearer {token}"},
            on_message=self._on_message_wrapper,
            on_error=self._on_error_wrapper,
            on_close=self._on_close_wrapper,
            on_open=self._on_open_wrapper
        )

        self.wst: Optional[threading.Thread] = None
        self.received_msg_log: Dict[str, tuple] = {}
        self.queue_list: Dict[str, Queue] = {}
        self.subscriptions: Dict[str, str] = {}  # Map subscription_id to route
        
        if on_message_fn is not None:
            self._custom_message_handler = on_message_fn
        else:
            self._custom_message_handler = None
            
        logger.debug("Starting WebSocket connection")
        self.run()

    def _on_open_wrapper(self, ws):
        """Wrapper for the on_open callback with additional logging"""
        try:
            logger.info("WebSocket connection opened successfully")
            self.on_open(ws)
        except Exception as e:
            logger.error(f"Error in on_open handler: {str(e)}")
            logger.error(traceback.format_exc())

    def _on_message_wrapper(self, ws, message):
        """Wrapper for the on_message callback with additional logging"""
        try:
            logger.debug(f"Received raw message: {message[:200]}...")  # Log first 200 chars
            if self._custom_message_handler:
                self._custom_message_handler(ws, message)
            else:
                self.on_message(ws, message)
        except Exception as e:
            logger.error(f"Error in message handler: {str(e)}")
            logger.error(f"Message content: {message}")
            logger.error(traceback.format_exc())

    def _on_error_wrapper(self, ws, error):
        """Wrapper for the on_error callback with additional logging"""
        try:
            logger.error("WebSocket error occurred")
            self.connection_error = error
            self.on_error(ws, error)
        except Exception as e:
            logger.error(f"Error in error handler: {str(e)}")
            logger.error(traceback.format_exc())

    def _on_close_wrapper(self, ws, close_status_code, close_msg):
        """Handler for WebSocket close events"""
        logger.info(f"WebSocket connection closed")
        logger.info(f"Close status code: {close_status_code}")
        logger.info(f"Close message: {close_msg}")
        self.connected = False
        
        # Log current state
        logger.debug(f"Active subscriptions: {list(self.subscriptions.keys())}")
        logger.debug(f"Queue list size: {len(self.queue_list)}")
        logger.debug(f"Message log size: {len(self.received_msg_log)}")

    def on_open(self, ws):
        """Handle WebSocket open event"""
        logger.info("WebSocket connected successfully")
        self.connected = True
        self.connection_error = None

    def on_message(self, ws, message):
        """
        Handle incoming WebSocket messages.
        
        Args:
            ws: WebSocket instance
            message: Received message
        """
        try:
            msg = json.loads(message)
            logger.debug(f"Processing message: {msg}")
            
            if 'id' not in msg:
                logger.warning("Received message without ID")
                logger.debug(f"Message content: {msg}")
                return
                
            sub_id = msg['id']
            
            # Check if this is a subscription response
            if sub_id in self.subscriptions:
                logger.debug(f"Processing message for subscription: {self.subscriptions[sub_id]}")
                
                if sub_id in self.queue_list:
                    self.queue_list[sub_id].put(msg)
                    
                    if 'event' in msg and 'type' in msg['event'] and 'doc' in msg['event']:
                        self.received_msg_log[sub_id] = (
                            msg['event']['type'],
                            msg['event']['doc'].get('_updatedAt')
                        )
                else:
                    logger.warning(f"No queue found for subscription ID: {sub_id}")
            else:
                logger.warning(f"Received message for unknown subscription: {sub_id}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode message: {str(e)}")
            logger.debug(f"Raw message content: {message}")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            logger.error(traceback.format_exc())

    def on_error(self, ws, error):
        """
        Handle WebSocket errors.
        
        Args:
            ws: WebSocket instance
            error: Error information
        """
        logger.error("WebSocket Error Details:")
        logger.error(f"Error type: {type(error)}")
        logger.error(f"Error message: {str(error)}")
        logger.error(f"WebSocket state: {'connected' if self.connected else 'disconnected'}")
        logger.error(f"WebSocket URL: {ws.url}")
        
        if hasattr(error, 'args'):
            logger.error(f"Error args: {error.args}")
            
        logger.error("Current state:")
        logger.error(f"Active subscriptions: {list(self.subscriptions.keys())}")
        logger.error(f"Queue list keys: {list(self.queue_list.keys())}")
        logger.error(f"Message log keys: {list(self.received_msg_log.keys())}")
        
        logger.error("Stack trace:")
        logger.error(traceback.format_exc())

    def check_connection(self, attempts: int = 10) -> bool:
        """
        Check if WebSocket is connected, waiting for up to specified attempts.
        
        Args:
            attempts: Number of connection check attempts
        
        Returns:
            bool: True if connected, False otherwise
        """
        if self.connected:
            return True
            
        logger.debug(f"Checking connection (max {attempts} attempts)")
        count = 0
        while not self.connected:
            logger.info("Waiting for WebSocket connection...")
            count += 1
            if count > attempts:
                logger.error(f"Connection timeout after {attempts} attempts")
                if self.connection_error:
                    logger.error(f"Last connection error: {self.connection_error}")
                return False
            time.sleep(0.05)
        return True

    def subscribe(self, routes):
        """
        Subscribe to specified WebSocket routes.
        
        Args:
            routes: List of routes to subscribe to
        """
        logger.debug("=== Starting Subscribe Operation ===")
        logger.debug(f"Routes to subscribe: {routes}")
        logger.debug(f"Current subscriptions: {self.subscriptions}")
        
        if not self.check_connection():
            logger.error("Cannot subscribe - WebSocket not connected")
            return
            
        new_subscriptions = {}
        for route in routes:
            try:
                subscription_id = str(uuid.uuid4())
                msg_sub = {
                    "route": route,
                    "id": subscription_id,
                    "method": "SUB"
                }
                
                logger.debug(f"Creating subscription: {msg_sub}")
                self.ws.send(json.dumps(msg_sub))
                
                # Initialize queue and track subscription
                self.queue_list[subscription_id] = Queue()
                self.subscriptions[subscription_id] = route
                new_subscriptions[subscription_id] = route
                
            except Exception as e:
                logger.error(f"Failed to subscribe to route {route}: {str(e)}")
                logger.error(traceback.format_exc())
                # Clean up any successful subscriptions
                for sub_id in new_subscriptions:
                    self.queue_list.pop(sub_id, None)
                    self.subscriptions.pop(sub_id, None)
                raise
        
        return list(new_subscriptions.keys())

    def run(self):
        """Start the WebSocket connection in a separate thread"""
        logger.debug("=== Starting WebSocket Thread ===")
        try:
            self.wst = threading.Thread(target=self._run_with_logging)
            self.wst.daemon = True
            self.wst.start()
            logger.debug("WebSocket thread started successfully")
        except Exception as e:
            logger.error(f"Failed to start WebSocket thread: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def _run_with_logging(self):
        """Wrapper for ws.run_forever with additional logging"""
        logger.debug("Entering WebSocket run_forever")
        try:
            self.ws.run_forever()
        except Exception as e:
            logger.error(f"Error in WebSocket run_forever: {str(e)}")
            logger.error(traceback.format_exc())
            raise
        finally:
            logger.debug("Exiting WebSocket run_forever")

    def clean_up(self):
        """Clean up WebSocket resources"""
        logger.debug("Starting WebSocket cleanup")
        try:
            self.ws.close()
            
            nb_tries = 3
            for attempt in range(nb_tries):
                logger.debug(f"Cleanup attempt {attempt + 1}/{nb_tries}")
                if self.wst and self.wst.is_alive():
                    time.sleep(0.2)
                else:
                    if self.wst:
                        self.wst.join()
                    logger.debug("WebSocket thread joined successfully")
                    break
            else:
                logger.error("Failed to cleanly terminate WebSocket thread")
                sys.exit(1)
                
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            logger.error(traceback.format_exc())
            sys.exit(1)
        
        logger.debug("WebSocket cleanup completed")