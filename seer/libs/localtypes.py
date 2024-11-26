# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Models
from typing import List, NamedTuple, Optional
from pydantic import BaseModel, Json

# Pydantic models: Question, Answer, Context


class Context(NamedTuple):
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
