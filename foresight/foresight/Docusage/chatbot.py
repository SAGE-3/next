# LLM imports
from langchain_openai import ChatOpenAI

# Schema imports
from typing_extensions import TypedDict
from typing import Annotated
from langgraph.graph.message import add_messages

# LangGraph imports
from langgraph.graph import StateGraph
import os
import json


class State(TypedDict):
    """
    A typed dictionary to hold the conversation state.
    It contains a list of messages with user/assistant content.
    """
    messages: Annotated[str, add_messages]


def get_llm(api_key: str, model="gpt-3.5-turbo", temperature=0.7) -> ChatOpenAI:
    """
    Returns an instance of ChatOpenAI with desired configurations.

    :return: An instance of ChatOpenAI
    """
    return ChatOpenAI(
        model_name=model,
        temperature=temperature,
        openai_api_key=api_key
    )


def chat_with_memory(state: State) -> State:
    """
    Handles user input, updates the conversation history, and generates a response.

    :param state: The current state containing conversation history (messages)
    :return: Updated state with the assistant's response appended
    """
    # Retrieve the last user input from the messages
    user_input = state["messages"][-1].content

    if user_input:
        state["messages"][-1] = {"role": "user", "content": user_input}


        script_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(script_dir, "config.json")
        with open(config_path, "r") as f:
            config_data = json.load(f)

        api_key = config_data["llm"]["openai_api_key"]
        model = config_data["llm"]["openai_model"]
        temperature = config_data["llm"]["temperature"]
        
        llm = get_llm(api_key=api_key, model=model, temperature=temperature)
        response = llm.invoke(state["messages"])

        # Append assistant response
        state["messages"].append({"role": "assistant", "content": response.content})

    return state


def initiate_chatbot() -> StateGraph:
    """
    Creates and configures the StateGraph with entry and finish points.

    :return: A compiled StateGraph object ready to run.
    """
    graph_builder = StateGraph(State)
    graph_builder.add_node("chatbot", chat_with_memory)
    graph_builder.set_entry_point("chatbot")
    graph_builder.set_finish_point("chatbot")

    graph = graph_builder.compile()
    return graph