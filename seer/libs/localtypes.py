# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Models
from typing import Any, List
from pydantic import BaseModel, Json
import io

# Pydantic models: Question, Answer, Context


class Context(BaseModel):
    previousQ: List[str]  # previous prompt
    previousA: List[str]  # previous answer
    pos: List[float]  # position in the board
    roomId: str  # room ID
    boardId: str  # board ID
    currentBoardApps: List[dict[str, Any]] | None = None  # current board app snapshot from the client
    selectedAppId: str | None = None  # selected app id for single-app context
    focusedAppId: str | None = None  # focused app id when available
    selectedAppIds: List[str] | None = None  # selected/lasso app ids


class Question(BaseModel):
    ctx: Context  # context
    id: str  # question UUID v4
    q: str  # question
    user: str  # user name
    location: str  # location
    model: str  # AI model: llama, openai, azure


class Answer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class SeerToolCall(BaseModel):
    name: str
    args: dict
    summary: str


class SeerAnswer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[dict]
    toolCalls: List[SeerToolCall]


class CodeRequest(BaseModel):
    ctx: Context  # context
    id: str  # question UUID v4
    q: str  # question
    user: str  # user name
    location: str  # location
    model: str  # AI model: llama, openai, azure
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
    model: str  # AI model: llama, openai, azure
    q: str  # question


class MesonetQuery(BaseModel):
    ctx: Context  # context
    user: str  # user name
    q: str  # question
    url: str
    currentTime: str


class MesonetAnswer(BaseModel):
    attributes: List[str]
    stations: List[str]
    chart_type: List[str]
    end_date: str
    start_date: str
    summary: str
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class ImageAnswer(BaseModel):
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class PDFQuery(BaseModel):
    ctx: Context  # context
    assetids: List[str]  # pdfs in sage
    user: str  # user name
    model: str  # AI model: openai, azure
    q: str  # question


class PDFAnswer(BaseModel):
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class WebQuery(BaseModel):
    ctx: Context  # context
    url: str  # question
    user: str  # user name
    model: str  # AI model: llama, openai, azure
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
