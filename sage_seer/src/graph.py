#
# from langgraph.graph import StateGraph, END
# from langgraph.checkpoint.sqlite import SqliteSaver
# from utils.utils import Assistant, State, create_tool_node_with_fallback
# from typing import Literal
# import uuid
# from langchain_openai import ChatOpenAI
#
# from src.prompts.prompt_loader import PromptLoader
# wall_agent_prompt = PromptLoader.create_prompt("src/prompts/", "zero_shot", "wall_agent")
#
# prod_type= 'local'
# conf = {'local': {'seer_server': 'http://127.0.0.1:5002',
#   'jupyter_server': 'http://localhost:8888',
#   'redis_server': 'localhost',
#   'web_server': 'http://localhost:3333',
#   'ws_server': 'ws://localhost:3333'}}
#
# # app_id = '4a29b8bf-9e72-4366-8946-d808e2e3d465'
# ps3 = PySage3(conf, prod_type)
# from foresight.Sage3Sugar.pysage3 import PySage3
# from src.tools.wall_tools import CreateAppTool, DeleteAppTool, SummarizeAppsTool, CompleteOrEscalate
# ps3 = None
#
# llm_4o = ChatOpenAI(temperature=0.1, model="gpt-4o")
#
# wall_agent_safe_tools = [CreateAppTool(ps3), SummarizeAppsTool(ps3)]
# wall_agent_sensitive_tools = [DeleteAppTool(ps3)]
# wall_agent_tools = wall_agent_safe_tools + wall_agent_sensitive_tools
# wall_agent_runnable = wall_agent_prompt | llm_4o.bind_tools(
#     wall_agent_tools + [CompleteOrEscalate]
# )
#
# config = {
#     "configurable": {
#         # Checkpoints are accessed by thread_id
#         "thread_id": str(uuid.uuid4()),
#     }
# }
#
# from src.prompts.prompt_loader import PromptLoader
# wall_agent_prompt = PromptLoader.create_prompt("src/prompts/", "zero_shot", "wall_agent")
#
#
#
# def wall_agent_routes(
#         state: State,
# ) -> Literal[
#     "wall_agent_safe_tools",
#     "wall_agent_sensitive_tools",
#         # "complete_or_escalate",
#     "__end__",
# ]:
#     last_msg = state["messages"][-1]
#     if not last_msg.tool_calls:
#         return "__end__"
#
#     tool_calls = state["messages"][-1].tool_calls
#     # did_cancel = any(tc["name"] == CompleteOrEscalate.__name__ for tc in tool_calls)
#     # if did_cancel:
#     #     return "complete_or_escalate"
#
#     safe_toolnames = [t.name for t in wall_agent_safe_tools]
#     if all(tc["name"] in safe_toolnames for tc in tool_calls):
#         return "wall_agent_safe_tools"
#     return "wall_agent_sensitive_tools"
#
#
# wall_agent_safe_tools = [CreateAppTool(ps3), SummarizeAppsTool(ps3)]
# wall_agent_sensitive_tools = [DeleteAppTool(ps3)]
# wall_agent_tools = wall_agent_safe_tools + wall_agent_sensitive_tools
# wall_agent_runnable = wall_agent_prompt | llm_4o.bind_tools(
#     wall_agent_tools + [CompleteOrEscalate]
# )
#
#
# graph_builder = StateGraph(State)
#
# graph_builder.add_node("wall_agent", Assistant(wall_agent_runnable))
# graph_builder.add_node("wall_agent_safe_tools", create_tool_node_with_fallback(wall_agent_safe_tools))
# graph_builder.add_node("wall_agent_sensitive_tools", create_tool_node_with_fallback(wall_agent_sensitive_tools))
#
# graph_builder.add_conditional_edges("wall_agent", wall_agent_routes)
# graph_builder.add_edge("wall_agent_safe_tools", "wall_agent")
# graph_builder.add_edge("wall_agent_sensitive_tools", "wall_agent")
#
# graph_builder.set_entry_point("wall_agent")
#
# memory = SqliteSaver.from_conn_string(":memory:")
# graph = graph_builder.compile(checkpointer=memory)

from langchain_core.messages import ToolMessage

from src.tools.wall_tools import CreateAppTool, DeleteAppTool, SummarizeAppsTool,  OpenAssetTool, Complete, Escalate
from foresight.Sage3Sugar.pysage3 import PySage3
from src.prompts.prompt_loader import PromptLoader
from langgraph.graph import StateGraph
from langgraph.checkpoint.sqlite import SqliteSaver
from src.utils.utils import Assistant, State, create_tool_node_with_fallback
from langchain_core.runnables import RunnableLambda

import uuid


### TODO: Check with luc if we have this is config?
def get_config(prod_type='local'):
    conf = {
        'local': {
            'seer_server': 'http://127.0.0.1:5002',
            'jupyter_server': 'http://localhost:8888',
            'redis_server': 'localhost',
            'web_server': 'http://localhost:3333',
            'ws_server': 'ws://localhost:3333'
        }
    }
    return conf[prod_type]

def get_app_config():
    return {
        "configurable": {
            "thread_id": str(uuid.uuid4())
        }
    }


# tools.py
def initialize_tools(ps3):
    wall_agent_safe_tools = [CreateAppTool(ps3), SummarizeAppsTool(ps3), OpenAssetTool(ps3)]
    wall_agent_sensitive_tools = [DeleteAppTool(ps3)]
    wall_agent_tools = wall_agent_safe_tools + wall_agent_sensitive_tools + [Complete, Escalate]
    return wall_agent_safe_tools, wall_agent_sensitive_tools, wall_agent_tools


def load_wall_agent_prompt():
    return PromptLoader.create_prompt("src/prompts/", "zero_shot", "wall_agent")


def wall_agent_routes(state: State, wall_agent_safe_tools, wall_agent_sensitive_tools):
    last_msg = state["messages"][-1]

    if not last_msg.tool_calls:
        print("No tool calls found in the last message. Ending the conversation.")
        return "__end__",

    if "Complete" in [x['name'] for x in last_msg.tool_calls]:
        print("Call to Complete. Ending the conversation.")
        return 'complete'

    tool_calls = state["messages"][-1].tool_calls
    safe_tool_names = [t.name for t in wall_agent_safe_tools]
    if all(tc["name"] in safe_tool_names for tc in tool_calls):
        return "wall_agent_safe_tools"
    return "wall_agent_sensitive_tools"

def completed(state: State):
    last_message = state["messages"][-1]
    messages = [
        ToolMessage(
            content=last_message.tool_calls[0]["args"]["reason"],
            tool_call_id=last_message.tool_calls[0]["id"],
        )
    ]
    return {"messages": messages}

def build_graph(wall_agent_runnable, wall_agent_safe_tools, wall_agent_sensitive_tools):
    graph_builder = StateGraph(State)

    graph_builder.add_node("wall_agent", Assistant(wall_agent_runnable))
    graph_builder.add_node("complete", RunnableLambda(completed))
    graph_builder.add_node("wall_agent_safe_tools", create_tool_node_with_fallback(wall_agent_safe_tools))
    graph_builder.add_node("wall_agent_sensitive_tools", create_tool_node_with_fallback(wall_agent_sensitive_tools))

    graph_builder.add_conditional_edges("wall_agent",
                                        lambda state: wall_agent_routes(state, wall_agent_safe_tools, wall_agent_sensitive_tools))
    graph_builder.add_edge("wall_agent_safe_tools", "wall_agent")
    graph_builder.add_edge("wall_agent_sensitive_tools", "wall_agent")
    graph_builder.add_edge("complete", "__end__")
    graph_builder.set_entry_point("wall_agent")

    memory = SqliteSaver.from_conn_string(":memory:")
    return graph_builder.compile(checkpointer=memory)