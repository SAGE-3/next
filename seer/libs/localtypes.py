# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Models
from typing import List, NamedTuple, Optional, Dict
from pydantic import BaseModel, Json, ConfigDict
import io
import base64

# Pydantic models: Question, Answer, Context


class Context(NamedTuple):
    context: List[Dict[str,str]]
    previousQ: str  # previous prompt
    previousA: str  # previous answer
    pos: List[float]  # position in the board
    roomId: str  # room ID
    boardId: str  # board ID
    

class Question(BaseModel):
    ctx: Context  # context
    id: str  # question UUID v4
    q: str  # question
    user: str  # user name
    location: str  # location
    model: str  # AI model: llama, openai


class Answer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class CodeRequest(BaseModel):
    ctx: Context  # context
    id: str  # question UUID v4
    q: str  # question
    user: str  # user name
    location: str  # location
    model: str  # AI model: llama, openai
    method: str


class CodeAnswer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class ImageQuery(BaseModel):
    ctx: Context  # context
    asset: str  # question
    user: str  # user name
    model: str  # AI model: llama, openai
    q: str  # question


class ImageAnswer(BaseModel):
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class PDFQuery(BaseModel):
    ctx: Context  # context
    # asset: str  # question
    assetids: List[str] # pdfs in sage
    user: str  # user name
    q: str  # question


class PDFAnswer(BaseModel):
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed
    
class CSVQuery(BaseModel):
    ctx: Context  # context
    # asset: str  # question
    assetids: List[str] # pdfs in sage
    user: str  # user name
    q: str  # question


class CSVAnswer(BaseModel):
    img: str  # Store the buffer as a Base64-encoded string
    content: str
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed

    @staticmethod
    def buffer_to_base64(buffer: io.BytesIO) -> str:
        buffer.seek(0)  # Ensure the cursor is at the start
        return base64.b64encode(buffer.read()).decode('utf-8')

    @staticmethod
    def base64_to_buffer(data: str) -> io.BytesIO:
        return io.BytesIO(base64.b64decode(data))

    @classmethod
    def from_buffer(cls, buffer: io.BytesIO, **kwargs):
        return cls(img=cls.buffer_to_base64(buffer), **kwargs)

    def to_buffer(self) -> io.BytesIO:
        return self.base64_to_buffer(self.img)

class WebQuery(BaseModel):
    ctx: Context  # context
    url: str  # question
    user: str  # user name
    model: str  # AI model: llama, openai
    q: str  # question
    extras: str  # extra request data: 'links' | 'text' | 'images' | 'pdfs'


class WebAnswer(BaseModel):
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class WebScreenshot(BaseModel):
    ctx: Context  # context
    url: str  # question
    user: str  # user name


class WebScreenshotAnswer(BaseModel):
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed
