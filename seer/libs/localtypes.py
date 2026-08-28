# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Models
from typing import List, Optional
from pydantic import BaseModel, Json
import io

# Pydantic models: Question, Answer, Context


class UserLLM(BaseModel):
    """A user's own OpenAI-compatible credentials, supplied per request.

    Present only when the request's `model` field names the user's own provider
    (`my-own-key`); absent for the server's configured providers. Used for that
    single request and never stored. `apiKey` is a bearer secret: it must be
    redacted before any request is logged.
    """

    apiKey: str  # the user's API key, valid for this request only
    baseUrl: Optional[str] = None  # OpenAI-compatible base URL; None = OpenAI
    modelId: str  # the model to call, e.g. gpt-4o

    def __repr__(self) -> str:
        # Defence in depth: any log line that interpolates a request object
        # prints this instead of the key. Does not affect model_dump(), which
        # is what the manager reads to build the client.
        return f"UserLLM(apiKey='***', baseUrl={self.baseUrl!r}, modelId={self.modelId!r})"

    __str__ = __repr__


class ImageGenerationRequest(BaseModel):
    """A plain image-generation request: the prompt is used as written."""

    prompt: str  # the prompt, exactly as the caller wrote it
    model: str  # provider name
    size: Optional[str] = None  # e.g. "1024x1024"; None uses the default
    userllm: Optional[UserLLM] = None  # reserved; imagegen is config-only today


class ImageGenerationResponse(BaseModel):
    imageUrl: str  # the generated image as a data URL


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
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
    appIds: List[str] = []  # source apps whose content to read server-side
    intent: str = ""  # optional prompt template: summary|proscons|keywords|opinion|facts


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
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
    method: str
    appIds: List[str] = []  # source CodeEditor apps to read server-side


class CodeAnswer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


class ImageQuery(BaseModel):
    ctx: Context  # context
    assets: List[str]  # one or more image assets
    user: str  # user name
    model: str  # AI model: llama, openai, azure
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
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
    selected: List[str] = []  # asset ids the answer selects (filter/pick tasks)


class PDFQuery(BaseModel):
    ctx: Context  # context
    assetids: List[str]  # pdfs in sage
    user: str  # user name
    model: str  # AI model: openai, azure
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
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
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
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
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
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
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
    imageBase64: str | None = None
    pdfContext: str | None = None


class IdeatorNodeResponse(BaseModel):
    r: str
    success: bool = True


class IdeatorAbstractRequest(BaseModel):
    text: str
    model: str
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
    temperature: float = 0.0


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
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider


class IdeatorUserDimensionResponse(BaseModel):
    type: str  # 'categorical' | 'ordinal'
    values: List[str]
    assignments: dict
    success: bool = True


class IdeatorSummarizeRequest(BaseModel):
    nodes: List[IdeatorSummarizeNode]
    prompt: str
    model: str
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider


class IdeatorSummarizeResponse(BaseModel):
    r: str
    success: bool = True


class IdeatorImageRequest(BaseModel):
    title: str
    summary: str
    keywords: List[str]
    model: str
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider
    brainstormingPrompt: str | None = None
    dimension: IdeatorDimension | None = None
    additionalContext: str | None = None


class IdeatorImageResponse(BaseModel):
    imageUrl: str
    success: bool = True


class IdeatorProseRequest(BaseModel):
    userPrompt: str
    model: str
    userllm: Optional[UserLLM] = None  # the user's own credentials, when they chose their own provider


class IdeatorProseResponse(BaseModel):
    r: str
    success: bool = True
