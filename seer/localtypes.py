# Models
from pydantic import BaseModel, Json
from typing import List, Any, NamedTuple

# Pydantic models: Question, Answer, Context


class Context(NamedTuple):
    prompt: str  # previous prompt
    pos: List[float]  # position in the board
    roomId: str  # room ID
    boardId: str  # board ID


class Question(BaseModel):
    ctx: Context  # context
    id: str  # question UUID v4
    q: str  # question
    user: str  # user name
    location: str  # location
    model: str  # AI model: chat, openai


class Answer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed
