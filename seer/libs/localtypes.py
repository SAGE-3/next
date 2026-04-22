# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Models
from typing import List
from pydantic import BaseModel, Json
import io

# Pydantic models: Question, Answer, Context


class Context(BaseModel):
    previousQ: List[str]  # previous prompt
    previousA: List[str]  # previous answer
    pos: List[float]  # position in the board
    roomId: str  # room ID
    boardId: str  # board ID


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


# ─── Ideator types ────────────────────────────────────────────────────────────

class IdeatorNode(BaseModel):
    ID: str
    Title: str
    Summary: str


class IdeatorSummarizeNode(BaseModel):
    Title: str
    Summary: str
    Keywords: List[str]


class IdeatorDimension(BaseModel):
    categorical: dict
    ordinal: dict


class IdeatorDimensionsRequest(BaseModel):
    prompt: str
    numDims: int
    model: str
    imageBase64: str | None = None
    pdfContext: str | None = None


class IdeatorDimensionsResponse(BaseModel):
    categorical: dict
    ordinal: dict
    success: bool = True


class IdeatorNodeRequest(BaseModel):
    prompt: str
    requirements: str
    model: str
    imageBase64: str | None = None
    pdfContext: str | None = None


class IdeatorNodeResponse(BaseModel):
    r: str
    success: bool = True


class IdeatorAbstractRequest(BaseModel):
    text: str
    model: str


class IdeatorAbstractResponse(BaseModel):
    Title: str
    Summary: str
    Keywords: List[str]
    Steps: List[str]
    success: bool = True


class IdeatorUserDimensionRequest(BaseModel):
    dimName: str
    prompt: str
    nodes: List[IdeatorNode]
    model: str


class IdeatorUserDimensionResponse(BaseModel):
    type: str  # 'categorical' | 'ordinal'
    values: List[str]
    assignments: dict
    success: bool = True


class IdeatorSummarizeRequest(BaseModel):
    nodes: List[IdeatorSummarizeNode]
    prompt: str
    model: str


class IdeatorSummarizeResponse(BaseModel):
    r: str
    success: bool = True


class IdeatorImageRequest(BaseModel):
    title: str
    summary: str
    keywords: List[str]
    model: str
    brainstormingPrompt: str | None = None
    dimension: IdeatorDimension | None = None


class IdeatorImageResponse(BaseModel):
    imageUrl: str
    success: bool = True


class IdeatorProseRequest(BaseModel):
    userPrompt: str
    model: str


class IdeatorProseResponse(BaseModel):
    r: str
    success: bool = True
