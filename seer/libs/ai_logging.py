# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Utils
from libs.utils import DotDict

# logging AI prompts
from fluent import sender

# Langchain API
from langchain.callbacks.base import AsyncCallbackHandler
from typing import Any, Dict, List, Union
import uuid

ai_logger = None


def getFluentInfo(ps3):
    """
    Retrieves Fluent models information from SAGE3 server.

    Args:
      ps3: SAGE3 API handle.

    Returns:
      dict: A dictionary containing the "fluent" model information.
    """
    sage3_config = ps3.s3_comm.web_config
    fluent = sage3_config["fluentd"]
    if fluent is None:
        raise ValueError("Fluentd configuration not found in SAGE3 server.")
    return DotDict(fluent)


def initFluent(ps3):
    """
    Initializes the Fluent logger.

    Args:
      ps3: SAGE3 API handle.
    """
    global ai_logger
    flinfo = getFluentInfo(ps3)
    ai_logger = sender.FluentSender("seer", host=flinfo.server, port=flinfo.port)


class LoggingChainHandler(AsyncCallbackHandler):
    def __init__(self, name: str):
        super().__init__()
        # Save the human prompt
        self.human = ""
        self.ai = ""
        self.name = name

    def setAI(self, ai):
        """
        Set the AI name.

        Args:
          ai (str): The AI name to set.
        """
        self.ai = ai

    async def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        *,
        run_id: uuid.UUID,
        parent_run_id: Union[uuid.UUID, None] = None,
        tags: Union[List[str], None] = None,
        metadata: Union[Dict[str, Any], None] = None,
        **kwargs: Any,
    ) -> Any:
        if type(inputs) is dict:
            self.human = inputs["question"].strip()
        else:
            if inputs.usage_metadata:
                in_tokens = inputs.usage_metadata.get("input_tokens")
                out_tokens = inputs.usage_metadata.get("output_tokens")
                total_tokens = inputs.usage_metadata.get("total_tokens")
                model = inputs.response_metadata.get("model_name")
                # print(
                #     f"[{self.name}] Prompt: {self.human} - Model: {model} - Input tokens: {in_tokens} - Output tokens: {out_tokens} - Total tokens: {total_tokens}"
                # )
                ai_logger.emit(
                    self.ai + "." + self.name,
                    {
                        "prompt": self.human,
                        "model": model,
                        "input_tokens": in_tokens,
                        "output_tokens": out_tokens,
                        "total_tokens": total_tokens,
                    },
                )


class LoggingLLMHandler(AsyncCallbackHandler):
    def __init__(self, name: str):
        super().__init__()
        # Save the human prompt
        self.human = ""
        self.ai = ""
        self.name = name

    def setAI(self, ai):
        """
        Set the AI name.

        Args:
          ai (str): The AI name to set.
        """
        self.ai = ai

    def setPrompt(self, prompt):
        """
        Set the human prompt.

        Args:
          prompt (str): The human prompt to set.
        """
        self.human = prompt.strip()

    async def on_llm_end(self, response, run_id, parent_run_id=None, **kwargs):
        try:
            usage = response.llm_output.get("token_usage", {})
            in_tokens = usage.get("prompt_tokens")
            out_tokens = usage.get("completion_tokens")
            total_tokens = usage.get("total_tokens")
            model = response.llm_output.get("model_name", {})
            # print(
            #     f"[{self.name}] Prompt: {self.human} - Model: {model} - Input tokens: {in_tokens} - Output tokens: {out_tokens} - Total tokens: {total_tokens}"
            # )
            ai_logger.emit(
                self.ai + "." + self.name,
                {
                    "prompt": self.human,
                    "model": model,
                    "input_tokens": in_tokens,
                    "output_tokens": out_tokens,
                    "total_tokens": total_tokens,
                },
            )
        except Exception as e:
            print("No token usage found:", e)
