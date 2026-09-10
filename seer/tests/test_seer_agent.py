"""Merge regression checks using synthetic boards and mocked external services.

Run from seer/: python -m unittest discover -s tests -v
No server, Redis, provider credentials, or paid model calls are needed.
"""

import logging
import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from langchain_core.messages import AIMessage, ToolMessage
from fastapi.testclient import TestClient

# PySage3's imports load deployment configuration. These tests supply the client
# explicitly, so keep that unrelated initialization out of the test process.
client_module = types.ModuleType("pysage3.client")
client_module.PySage3 = Mock
original_client_module = sys.modules.get("pysage3.client")
sys.modules["pysage3.client"] = client_module
try:
    from app.seer.agent import SeerAgent
    from app.seer.tools import build_seer_tools
finally:
    if original_client_module is None:
        sys.modules.pop("pysage3.client", None)
    else:
        sys.modules["pysage3.client"] = original_client_module

from libs.localtypes import Context, Question, UserLLM


class SeerMergeTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ps3 = Mock()
        self.ps3.s3_comm.web_config = {
            "models": {
                "providers": {
                    "lab": {
                        "apiKey": "synthetic-test-key",
                        "models": {"assistant": {"model_id": "test-model", "capabilities": ["chat"]}},
                    }
                }
            }
        }
        self.ps3.s3_comm.get_apps.return_value = []
        self.question = Question(
            id="request-1", q="Create a note", user="Test user", location="",
            model="lab",
            ctx=Context(previousQ=[], previousA=[], pos=[100, 200, 0], roomId="room-1", boardId="board-1"),
        )
        self.agent = SeerAgent(logging.getLogger("seer-test"), self.ps3)

    async def test_empty_model_registry_does_not_break_startup(self):
        self.ps3.s3_comm.web_config = {"models": {}}
        agent = SeerAgent(logging.getLogger("seer-test"), self.ps3)
        response = await agent.process(self.question)
        self.assertFalse(response.success)
        self.assertEqual(response.actions, [])

    def test_fastapi_lifespan_initializes_seer_and_serves_route(self):
        """Exercise actual startup wiring while replacing external services."""
        modules = {}
        for module_name, class_name in {
            "app.chat": "ChatAgent", "app.code": "CodeAgent", "app.image": "ImageAgent",
            "app.pdf": "PDFAgent", "app.web": "WebAgent", "app.ideator": "IdeatorAgent",
            "app.imagegen": "ImageGenAgent",
        }.items():
            module = types.ModuleType(module_name)
            service = Mock()
            service.init = AsyncMock()
            setattr(module, class_name, Mock(return_value=service))
            modules[module_name] = module
        client = types.ModuleType("pysage3.client")
        client.PySage3 = Mock(return_value=self.ps3)
        config = types.ModuleType("pysage3.config")
        config.config, config.prod_type = {}, "test"
        ai_logging = types.ModuleType("libs.ai_logging")
        ai_logging.initFluent = Mock()
        modules.update({"pysage3.client": client, "pysage3.config": config, "libs.ai_logging": ai_logging})
        self.ps3.s3_comm.web_config = {"models": {"providers": {}}}
        spec = importlib.util.spec_from_file_location("seer_test_main", Path(__file__).parents[1] / "main.py")
        main = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules), patch("dotenv.load_dotenv"), patch("builtins.print"):
            spec.loader.exec_module(main)
            with TestClient(main.app) as http:
                self.assertIsInstance(main.seerAG, SeerAgent)
                self.assertEqual(http.get("/status").status_code, 200)
                response = http.post("/seer", json=self.question.model_dump())
                self.assertEqual(response.status_code, 200)
                self.assertFalse(response.json()["success"])

    async def test_registry_provider_runs_real_planning_tool_without_mutating_board(self):
        llm = Mock()
        llm.bind_tools.return_value = llm
        llm.ainvoke = AsyncMock(side_effect=[
            AIMessage(content="", tool_calls=[{
                "name": "plan_create_stickies", "args": {"texts": ["Synthetic note"]}, "id": "tool-1",
            }]),
            AIMessage(content="The note is ready for review."),
        ])
        with patch("libs.llm_manager.ChatOpenAI", return_value=llm) as constructor:
            response = await self.agent.process(self.question)

        self.assertTrue(response.success)
        self.assertEqual(response.actions[0]["state"]["text"], "Synthetic note")
        self.assertEqual(response.actions[0]["type"], "create_app")
        self.assertEqual(response.toolCalls[0].name, "plan_create_stickies")
        self.assertEqual(constructor.call_args.kwargs["model"], "test-model")
        messages = llm.ainvoke.call_args.args[0]
        self.assertTrue(any(isinstance(message, ToolMessage) for message in messages))
        self.ps3.s3_comm.create_app.assert_not_called()
        self.ps3.s3_comm.update_app.assert_not_called()

    def test_personal_provider_uses_separate_clients_per_request(self):
        self.question.model = "my-own-key"
        with patch("libs.llm_manager.ChatOpenAI") as constructor:
            for key in ("synthetic-key-a", "synthetic-key-b"):
                self.question.userllm = UserLLM(apiKey=key, modelId="personal-test-model")
                self.agent._get_model(self.question)
        self.assertEqual(constructor.call_count, 2)
        self.assertEqual([call.kwargs["api_key"] for call in constructor.call_args_list],
                         ["synthetic-key-a", "synthetic-key-b"])
        self.assertEqual(self.agent.manager._chat_cache, {})

    def configure_asset(self, app_type, mimetype):
        self.question.ctx.selectedAppIds = ["app-1"]
        self.question.userllm = UserLLM(apiKey="synthetic-test-key", modelId="personal-test-model")
        self.ps3.s3_comm.get_apps.return_value = [{
            "_id": "app-1", "data": {
                "roomId": "room-1", "boardId": "board-1", "type": app_type, "title": "Synthetic asset",
                "position": {"x": 0, "y": 0, "z": 0},
                "size": {"width": 400, "height": 300, "depth": 0},
                "state": {"assetid": "asset-1"},
            },
        }]
        self.ps3.s3_comm.get_asset.return_value = {
            "_id": "asset-1", "data": {"filename": "synthetic-file", "mimetype": mimetype},
        }
        return {tool.name: tool for tool in build_seer_tools(self.agent, self.question)}["analyze_scope_asset"]

    async def test_image_tool_matches_current_image_api(self):
        self.agent.image_agent = Mock(process=AsyncMock(return_value=types.SimpleNamespace(r="Image answer")))
        tool = self.configure_asset("ImageViewer", "image/png")
        result = await tool.ainvoke({"question": "Describe this image"})
        request = self.agent.image_agent.process.call_args.args[0]
        self.assertEqual(request.assets, ["asset-1"])
        self.assertEqual(request.userllm, self.question.userllm)
        self.assertEqual(result["answer"], "Image answer")

    async def test_pdf_tool_preserves_direct_summary_fallback(self):
        self.agent.pdf_agent = Mock(
            process=AsyncMock(side_effect=RuntimeError("Synthetic retrieval outage")),
            summarize_pdf_direct=AsyncMock(return_value="Fallback answer"),
        )
        tool = self.configure_asset("PDFViewer", "application/pdf")
        result = await tool.ainvoke({"question": "Summarize this PDF"})
        request, asset_id = self.agent.pdf_agent.summarize_pdf_direct.call_args.args
        self.assertEqual(request.assetids, ["asset-1"])
        self.assertEqual(request.userllm, self.question.userllm)
        self.assertEqual(asset_id, "asset-1")
        self.assertEqual(result["answer"], "Fallback answer")


if __name__ == "__main__":
    unittest.main()
