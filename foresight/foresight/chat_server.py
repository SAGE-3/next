from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import config as conf, prod_type
from Sage3Sugar.pysage3 import PySage3
from uuid import UUID

from Docusage.chatbot import initiate_chatbot

import asyncio
from random import randint
from pathlib import Path
import json

app = FastAPI()
chat = initiate_chatbot()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. Change to specific domains in production.
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods.
    allow_headers=["*"],  # Allows all headers.
)

class Message(BaseModel):
    roomId: str
    boardId: str
    appId: str
    message: object

DB_PATH = Path("database.json")

def load_database():
    """Load the JSON database."""
    if DB_PATH.exists():
        with open(DB_PATH, "r") as file:
            return json.load(file)
    return {"files": []}

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI server for Sage3!"}

@app.get("/get-database")
async def get_database():
    """Returns the current database contents as JSON."""
    print(load_database())
    return load_database()

@app.post("/send-message")
async def on_message(msg: Message):
    
    if msg.message["type"] == "query":
      response_text = f"""
  <h1 style="text-align: center">Message Received</h1>
  <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
    <thead>
      <tr style="background-color: #e0d3e8;">
        <th style="padding: 8px; border: 1px solid #fff;">Attribute</th>
        <th style="padding: 8px; border: 1px solid #fff;">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border: 1px solid #fff;">Payload</td>
        <td style="padding: 8px; border: 1px solid #fff;"><b>{msg.message["payload"]}</b></td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #fff;">Type</td>
        <td style="padding: 8px; border: 1px solid #fff;"><i>{msg.message["type"]}</i></td>
      </tr>
      <tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #fff;">Response to</td>
        <td style="padding: 8px; border: 1px solid #fff;"><i>{msg.message["id"]}</i></td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #fff;">Owner of source</td>
        <td style="padding: 8px; border: 1px solid #fff;"><i>{msg.message["userName"]}</i></td>
      </tr>
        <td style="padding: 8px; border: 1px solid #fff;">Room ID</td>
        <td style="padding: 8px; border: 1px solid #fff;">{msg.roomId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #fff;">Board ID</td>
        <td style="padding: 8px; border: 1px solid #fff;">{msg.boardId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #fff;">App ID</td>
        <td style="padding: 8px; border: 1px solid #fff;">{msg.appId}</td>
      </tr>
    </tbody>
  </table>
  """
    elif msg.message["type"] == "upload":
      response_text = f"""
<p>
  <b>{msg.message["userName"]} uploaded a file to the chat.</b>
</p>
      """
        
    response_object = {
        "status": "success",
        "type": "response",
        "source": msg.message["id"],
        "owner_id": msg.message["userId"],
        "owner_name": msg.message["userName"],
        "response": response_text.strip(),
    }
    await asyncio.sleep(randint(1, 3))
    return response_object
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=5050)