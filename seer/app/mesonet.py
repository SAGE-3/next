# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# PDFAgent
import json, os
from logging import Logger
import asyncio
from io import StringIO
import io
import pandas as pd
import matplotlib.pyplot as plt
import base64
import httpx
from PIL import Image
import seaborn as sns
# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

import requests
import json

# AI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI, OpenAI
import sys
# Typing for RPC
from libs.localtypes import MesonetQuery, MesonetAnswer
# from libs.utils import getModelsInfo, getCSVFile, scaleImage
from libs.utils import getModelsInfo, scaleImage
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# Now import the csv_llm module
from libs.mesonet.csv_llm.csv_llm import LLM

# ChromaDB AI vector DB
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from langchain_openai.embeddings import OpenAIEmbeddings

# PDF
import pymupdf4llm
import pymupdf
from io import BytesIO

from langchain.vectorstores.base import VectorStoreRetriever
from typing import Dict, List

# LangGraph
from langgraph.graph import StateGraph
from langgraph.graph import END
from typing import TypedDict, Annotated, Sequence
import operator
import openai as openai_client

from datetime import datetime
import asyncio

# Define the State for LangGraph
class GraphState(TypedDict):
    """
    Represents the state of the graph.
    """
    request: MesonetQuery
    start_date: str
    end_date: str
    url: str
    data_statistics: str
    llm_re: LLM
    llm_base: LLM
    llm_transform: LLM
    llm_station: LLM
    llm: LLM
    user_prompt_modified: str
    user_prompt_reasoning: str
    station_chart_info: Dict
    stations: str
    attributes_extracted: List[str]
    stations_extracted: List[str]
    chart_type_extracted: List[str]
    attribute_reasoning: str
    station_reasoning: str
    station_data: str
    summary: str
    measurements: str
    date_extracted: str
    date_reasoning: str


def convert_to_iso(date_dict):
    """
    Convert start_date and end_date to ISO 8601 format.
    
    Args:
        date_dict (dict): Dictionary containing 'start_date' and 'end_date' as strings in YYYY-MM-DD format.

    Returns:
        dict: Dictionary with ISO 8601 formatted dates.
    """
    iso_dates = {}
    
    for key, date_str in date_dict.items():
        try:
            iso_dates[key] = datetime.strptime(date_str, "%Y-%m-%d").isoformat() + "Z"
        except ValueError:
            iso_dates[key] = None  # Handle invalid dates gracefully

    return iso_dates

class MesonetAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing MesonetAgent")
        self.logger = logger
        self.ps3 = ps3
        models = getModelsInfo(ps3)
        llama = models["llama"]
        openai = models["openai"]
        # Llama model
        self.server = llama["url"]
        self.model = llama["model"]
        self.llm_openai = 0
        self.httpx_client = httpx.Client(timeout=None)
        # Llama model
        if llama["url"] and llama["model"]:
            self.llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=1000,
            )
        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            self.llm_openai = ChatOpenAI(
                api_key=openai["apiKey"],
                # needs to be gpt-4o-mini or better, for image processing
                model=openai["model"],
                # max_tokens=1000,
                streaming=False,
            )
        # Templates
        sys_template_str = """Today is {date}. 
        You are a helpful and succinct assistant, providing informative answers to {username}. 
        You are a date expert selector.
        You are tasked to select a start date and end date according to the user's query. 
        Take a deep breath. Think it through. Imagine you are the user and imagine their intent. 
        You are only strictly to answer in the format {{"start_date": str, "end_date": str}}
        Provide your answer in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).
        Make sure to provide times between the start date and end date. 
        Do not include any other information or reasoning in your answer.
        Only choose dates between January 1, 2024 to today, whch is {date}.
        """
        human_template_str = "Answer: {question}"
        
        # For OpenAI / Message API compatible models
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", sys_template_str),
                MessagesPlaceholder("history"),
                ("user", human_template_str),
            ]
        )
        
        # OutputParser that parses LLMResult into the top likely string.
        # Create a new model by parsing and validating input data from keyword arguments.
        # Raises ValidationError if the input data cannot be parsed to form a valid model.
        output_parser = StrOutputParser()
        
        if self.llm_llama:
            print('HITS THE SYS PROMPT')
            self.session_llama = prompt | self.llm_llama | output_parser

        # Create the ChromaDB client
        chromaServer = "127.0.0.1"
        chromaPort = 8100
        if os.getenv("ENVIRONMENT") == "production":
            chromaServer = "chromadb"
            chromaPort = 8000

        self.chroma = chromadb.HttpClient(
            # Local ChromaDB server - docker instance
            host=chromaServer,
            # Port changed to 8100 to avoid conflicts with other services
            port=chromaPort,
            # Authorization
            settings=Settings(
                # http basic auth scheme
                chroma_client_auth_provider="chromadb.auth.basic_authn.BasicAuthClientProvider",
                # credentials for the basic auth scheme loaded from .env file
                chroma_client_auth_credentials=os.getenv(
                    "CHROMA_CLIENT_AUTH_CREDENTIALS"
                ),
            ),
        )

        # OpenAI for now, can explore more in the future
        self.embedding_model = OpenAIEmbeddings(api_key=openai["apiKey"])

        # Langchain Chroma 
        self.vector_store = Chroma(
          client=self.chroma,
          collection_name="csv_docs",
          embedding_function=self.embedding_model
        )

        # Using Langchain's Chromadb
        # Heartbeat to check the connection
        self.chroma.heartbeat()

    async def process(self, qq: MesonetQuery):
        self.logger.info("Got Mesonet> from " + qq.user + ": " + qq.q)
        token = "71c5efcd8cfe303f2795e51f01d19c6"
        
        # Initialize LangGraph
        workflow = StateGraph(GraphState)


        def initialize_llms(state: GraphState):
            state["llm_re"] = LLM(self.client, {"model": "gpt-4o", "temperature": 0})
            return state
        
        def get_all_stations(state: GraphState):
            res = requests.get("https://api.hcdp.ikewai.org/mesonet/db/stations", headers={"Authorization": f"Bearer {token}"})
            
            return {"stations": res.text}
            # res = pd.read_csv('data/stations_v2.csv', dtype={'station_id': str}).to_json()
            # res = pd.read_csv('data/stations_v1.csv').to_json()
            # return {"stations": res}
            
    
        def extract_stations(state: GraphState):
            user_prompt = state["request"].q
            import numpy as np
            tracked_station_id = {}
            
            # Ask this question a couple times and trigger a conversation_reset each time
            for i in range(1):
                stations_extracted, station_reasoning = state["llm_re"].prompt_select_stations(user_prompt, state["stations"]) #TODO add data_statistics to the prompt
                station_id_str = f"{np.sort(stations_extracted)}"
                if station_id_str not in tracked_station_id:
                    tracked_station_id[station_id_str] = 1
                else:
                    tracked_station_id[station_id_str]+=1
                print(f'ITERATION: {i+1}')
                print(station_id_str)
            print(f'TRACKED DICTIONARY: {tracked_station_id}')
            return {"stations_extracted": stations_extracted if stations_extracted else [], "station_reasoning": station_reasoning}
        
        def get_station_attributes(state: GraphState):
            # Get attributes for each station in stations_extracted
            all_attributes = set()
            
            for station in state["stations_extracted"]:
                # Query the API for a single data point to get all variables
                res = requests.get(
                    f"https://api.hcdp.ikewai.org/mesonet/db/measurements",
                    params={
                        "station_ids": station,
                        "limit": 100,
                        "row_mode": "json",
                        "join_metadata": "true"
                    },
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                # for each station grabbed I should download it and test it
                if res.status_code == 200:
                    data = res.json()
                    if data and len(data) > 0:
                        # Extract just the variable name from each measurement
                        variables = [item.get('variable', '') for item in data]
                        # Add unique variables to the set

                        all_attributes.update(variables)
            
            return {"attributes_extracted": list(all_attributes)}

        def extract_attributes(state: GraphState):
            user_prompt = state["request"].q
            attributes_extracted, attribute_reasoning = state["llm_re"].prompt_select_attributes(user_prompt, state["attributes_extracted"])
            return {"attributes_extracted": attributes_extracted if attributes_extracted else [], "attribute_reasoning": attribute_reasoning}

        def extract_chart_type(state: GraphState):
            user_prompt = state["request"].q
            chart_type_extracted, chart_type_reasoning = state["llm_re"].prompt_charts_via_chart_info(user_prompt, state["attributes_extracted"])
            print("Chart Type Chosen:", chart_type_extracted)
            return {"chart_type_extracted": chart_type_extracted if chart_type_extracted else [], "chart_type_reasoning": chart_type_reasoning}
        
        def fetch_with_retries(url, headers, max_retries=3):
            for attempt in range(max_retries):
                try:
                    res = requests.get(url, headers=headers)
                    if res.status_code == 200:
                        return res
                    else:
                        print(f"Non-200 status ({res.status_code}) on attempt {attempt+1}")
                except requests.RequestException as e:
                    print(f"Request error on attempt {attempt+1}: {e}")
            return None  # all retries failed

        def generate_data_analysis_code(state: GraphState):
            # get the extracted stations and their associated island names and lon and lattitudes
            
            # TOOD move to the top of the file
            import io
            import contextlib
            user_prompt = state["request"].q
            url = f"https://api.hcdp.ikewai.org/mesonet/db/measurements?station_ids={','.join(state['stations_extracted'])}&var_ids={','.join(state['attributes_extracted'])}&limit=100"
            print(url)
            # add in code to retry the request if it errors
            # res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            res = fetch_with_retries(url, headers={"Authorization": f"Bearer {token}"})
            if res:
                station_data = pd.DataFrame(res.json())
                station_data['timestamp'] = station_data['timestamp'].str.replace('Z','+00:00')
                station_data['timestamp'] = pd.to_datetime(station_data['timestamp'], utc=True)
                station_data['station_id'] = station_data['station_id'].astype("string")
                station_data['variable'] = station_data['variable'].astype("string")
                station_data['value'] = station_data['value'].astype(float)
                print(f'json data: {res.text}')
                model_response, model_reasoning = state["llm_re"].prompt_generate_data_analysis_code(user_prompt, state["attribute_reasoning"], state["station_reasoning"], station_data.columns.to_list(), res.text)
                print(model_response)

                # code_improvements, _ = state["llm_re"].prompt_review_code(user_prompt, model_response)
                # print(code_improvements)
                # code, _ = state["llm_re"].prompt_improve_code(user_prompt, code_improvements, model_response)
                # print(code)

                try:
                    # captures output
                    output_buffer = io.StringIO()
                    error_buffer = io.StringIO()
                    code_block = model_response.replace('python', '')
                    code = code_block[code_block.index("```")+3: code_block.rindex("```")]
                    with contextlib.redirect_stdout(output_buffer):  # Redirect stdout
                        exec(code)  # runs generated code

                    # retrieves string from captured output
                    exec_output = output_buffer.getvalue()

                    code_output_model_summary, _ = state["llm_re"].prompt_exec_output_response(user_prompt, exec_output)
                except Exception as e:
                    error_buffer.write(str(e))
                    code_output_model_summary = "CODE ERRORED OUT"
                    print(error_buffer.getvalue())
                print(code_output_model_summary)
            else:
                code_output_model_summary = 'REQUEST FAILED'
            
            print(code_output_model_summary)
            return {"measurements": res.text, "summary": code_output_model_summary}

        def get_answer_with_reasoning(state: GraphState):
            url = f"https://api.hcdp.ikewai.org/mesonet/db/measurements?station_ids={','.join(state['stations_extracted'])}&var_ids={','.join(state['attributes_extracted'])}&start_date={state['start_date']}&end_date={state['end_date']}&row_mode=json&join_metadata=true"
            
            res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            # Validate JSON response
            try:
                data = json.loads(res.text)
                df = pd.DataFrame(data)
            except json.JSONDecodeError:
                print("Invalid JSON response from API")
                return {"error": "Invalid JSON response from API"}

            # Check for empty data
            if df.empty:
                print("No data retrieved from API")
                return {"error": "No data retrieved from API"}

            # Ensure required columns exist
            required_columns = {"timestamp", "value", "variable", "station_name"}
            if not required_columns.issubset(df.columns):
                print("Missing required columns:", required_columns - set(df.columns))
                return {"error": f"Missing required columns: {required_columns - set(df.columns)}"}

            # Convert timestamp to datetime and handle errors
            df["timestamp"] = pd.to_datetime(df["timestamp"], format="%Y-%m-%dT%H:%M:%S.%fZ", errors="coerce")
            df = df.dropna(subset=["timestamp"])  # Drop rows where timestamp is NaT

            # Convert value to numeric and remove NaN
            df["value"] = pd.to_numeric(df["value"], errors="coerce")
            df = df.dropna(subset=["value"])  # Drop rows where value is NaN

            # Convert timestamps to hourly intervals
            df["timestamp"] = df["timestamp"].dt.floor("H")

            # Aggregate data: mean per timestamp-variable-station_name
            df_resampled = df.groupby(["timestamp", "variable", "station_name"]).agg({"value": "mean"}).reset_index()
            
            # Convert DataFrame to JSON format
            measurements_json = df_resampled.to_dict(orient="records")

            # Generate summary
            summary, _ = state["llm_re"].prompt_summarize_reasoning(
                state["request"].q, state["attribute_reasoning"], state["station_reasoning"], measurements_json
            )
            summary = summary + f" {state['start_date']} to {state['end_date']}"
            return {"measurements": measurements_json, "summary": summary, "url": url}




        # Add nodes to the graph
        workflow.add_node("initialize_llms", initialize_llms)
        workflow.add_node("get_all_stations", get_all_stations)
        workflow.add_node("extract_stations", extract_stations)
        workflow.add_node("get_station_attributes", get_station_attributes)
        workflow.add_node("extract_attributes", extract_attributes)
        workflow.add_node("extract_chart_type", extract_chart_type)
        # workflow.add_node("extract_date", extract_date)
        workflow.add_node("generate_data_analysis_code", generate_data_analysis_code)
        # workflow.add_node("load_data", load_data)
        # workflow.add_node("process_prompt", process_prompt)

        # Define edges
        workflow.add_edge("initialize_llms", "get_all_stations")
        workflow.add_edge("get_all_stations", "extract_stations")
        workflow.add_edge("extract_stations", "get_station_attributes")
        workflow.add_edge("get_station_attributes", "extract_attributes")
        workflow.add_edge("extract_attributes", "extract_chart_type")
        workflow.add_edge("extract_chart_type", "generate_data_analysis_code")
        # workflow.add_edge("extract_date", "get_answer_with_reasoning")
        workflow.add_edge("generate_data_analysis_code", END)
        # workflow.add_edge("load_data", "process_prompt")
        # workflow.add_edge("process_prompt", END)

        # Set the entry point
        workflow.set_entry_point("initialize_llms")

        # Compile the graph
        app = workflow.compile()
        
        response = await self.session_llama.ainvoke(  # Make sure self.session_llama is available in state
                    {
                        "history": [("human", ""), ("ai", "")],
                        "question": qq.q,
                        "username": qq.user,
                        "date": qq.currentTime,
                    }
                )
        response = json.loads(response)
        initial_state = GraphState(testing="This is a test", request=qq,  start_date=response['start_date'], end_date=response['end_date'])
        final_state = app.invoke(initial_state)

        attributes = final_state.get("attributes_extracted", [])
        actions = []
        for attribute in attributes:
            actions.append(json.dumps(
            {
                "type": "create_app",
                "app": "Hawaii Mesonet",
                "state": {
                    "sensorData": {},
                    "stationNames": final_state.get("stations_extracted", []),
                    "listOfStationNames": '016HI',
                    "location": [-157.816, 20.9],   
                    "zoom": 6,
                    "baseLayer": "OpenStreetMap",
                    "bearing": 0,
                    "pitch": 0,
                    "overlay": True,
                    "availableVariableNames": [],
                    "stationScale": 5,
                    "url": final_state.get("url", ""),  # URL for the data
                    "widget": {
                        "visualizationType": final_state.get("chart_type_extracted", ["line"])[0],  # Default to "line" chart
                        "yAxisNames": [attribute],  # Default to temperature
                        "xAxisNames": ["date_time"],
                        "color": "#5AB2D3",
                        "startDate": final_state.get("start_date", "202401191356"),  # Default to current date
                        "endDate": final_state.get("end_date", "202401191356"),  # Default to current date
                        "timePeriod": "24 hours",
                        "liveData": True,
                        "layout": {"x": 0, "y": 0, "w": 11, "h": 130},
                    }
                },
                "data": {
                    "title": "Answer",
                    "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                    "size": {"width": 2000, "height": 1000, "depth": 0},
                },
            }
        ))
        print("Attributes:", final_state.get("attributes_extracted", []))
        print("Stations:", final_state.get("stations_extracted", []))
        print("Chart Type:", final_state.get("chart_type_extracted", []))
        print("Start Date:", final_state.get("start_date", []))
        print("End Date:", final_state.get("end_date", []))
        print("Summary:", final_state.get("summary", "something went wrong"))

        mesonet_answer = MesonetAnswer(
            attributes=final_state.get("attributes_extracted", []),  # Get extracted attributes from final state
            stations=final_state.get("stations_extracted", []),  # Get extracted stations from final state
            chart_type=final_state.get("chart_type_extracted", []),  # Get extracted chart type from final state
            start_date=final_state.get("start_date", ""),  # Get extracted chart type from final state
            end_date=final_state.get("end_date", ""),  # Get extracted chart type from final state
            summary=final_state.get("summary" , "I'm sorry, something went wrong. To improve results, try to be more specific in your prompt by adding a location, time, and attributes that you might want to see."),
            success=True,
            actions=actions
        )
        


        return  mesonet_answer