import base64
import time
import json
from logging import Logger

# Web API
from fastapi import HTTPException, utils

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI Models
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI
import markdown
import pandas as pd

# Typing for RPC
from libs.localtypes import Context, Question, Answer, SummaryQuery, SummaryResponse
from libs.utils import getImageFile, getModelsInfo, getPDFFile, scaleImage

import fitz  # PyMuPDF


class SummaryAgent:
    def __init__(self, logger: Logger, ps3: PySage3):
        logger.info("Initializing Export function")
        self.logger = logger
        self.ps3 = ps3

        self.logger.info("SAGE3 server configuration:")
        models = getModelsInfo(ps3)
        openai = models["openai"]
        llama = models["llama"]
        self.logger.info(
            ("openai key: " + openai["apiKey"] + " - model: " + openai["model"]),
        )
        self.logger.info(
            "chat server: url: " + llama["url"] + " - model: " + llama["model"],
        )

        llm_llama = None
        llm_openai = None

        # Llama model
        if llama["url"] and llama["model"]:
            llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=2500,
            )

        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            llm_openai = ChatOpenAI(api_key=openai["apiKey"], model=openai["model"])

        # Templates
        sys_template_str = "Today is {date}. You are a helpful and succinct assistant, providing summaries about stickie notes to {username} (whose location is {location})."
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
        output_parser = StrOutputParser()

        self.session_llama = None
        self.session_openai = None

        # Session : prompt building and then LLM
        if llm_openai:
            self.session_openai = prompt | llm_openai | output_parser
        if llm_llama:
            self.session_llama = prompt | llm_llama | output_parser

        if not self.session_llama and not self.session_openai:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

    async def process(self, qq: SummaryQuery):
        self.logger.info(
            "Got Chat> from " + qq.user + " from:" + qq.location + " using: " + qq.model
        )

        #################################################################################

        # Main logic for retrieving different files (Stickie, Notepad, PDF, Images)

        # Get general information about the board
        # Get the current date and time
        today = time.asctime()

        whole_text = ""

        # Collect all the stickies of the board
        if "Stickie Notes" in qq.apps:
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = self.ps3.get_apps(room_id, board_id)
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "Stickie":
                    text = app.get("data", {}).get("state", {}).get("text")
                    whole_text += text + "\n"
                    self.logger.info("Stickie> " + text)

        # If user wants code editors
        if "Code Editor" in qq.apps:
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = self.ps3.get_apps(room_id, board_id)
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "CodeEditor":
                    text = app.get("data", {}).get("state", {}).get("content")
                    whole_text += text + "\n"
                    self.logger.info("CodeEditor> " + text)

        # If user wants Notepads
        if "Notepad" in qq.apps:
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = self.ps3.get_apps(room_id, board_id)
            whole_text = ""  # Initialize variable to accumulate text from all Notepad apps
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "Notepad":
                    # Retrieve the content (ops) list
                    content = app.get("data", {}).get("state", {}).get("content", {}).get("ops", [])

                    # Log the content for debugging
                    self.logger.info("NotePad> Content retrieved from app")

                    # Iterate through the ops array to get the actual text ('insert')
                    for op in content:
                        # Extract 'insert' field and append to the whole_text string
                        text = op.get('insert', '')
                        self.logger.info(f"NotePad> {text}")
                        whole_text += text  # Add the text to whole_text for future processing

            # Log the complete accumulated text for further processing
            self.logger.info(f"Complete Notepad content: {whole_text}")


        image_base64 = ""

        if "Images" in qq.apps:
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = self.ps3.get_apps(room_id, board_id)
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "ImageViewer":
                    text = " "
                    text = app.get("data", {}).get("state", {}).get("assetid", [])
                    self.logger.info("Image asset ID > " + text)
                    imageContent = getImageFile(self.ps3, text)
                    image_bytes = scaleImage(imageContent, 1450)
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")


        # # If user wants PDF files
        if "PDFViewer" in qq.apps:
            print("inside")
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = self.ps3.get_apps(room_id, board_id)
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "PDFViewer":                        
                    asset_id = app.get("data", {}).get("state", {}).get("assetid")
                    pdf_bytes = getPDFFile(self.ps3, asset_id)  # Get PDF bytes

                    # Use PyMuPDF to read the PDF content
                    pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
                    pdf_text = ""

                    for page_num in range(pdf_document.page_count):
                        page = pdf_document.load_page(page_num)  # Get each page
                        pdf_text += page.get_text("text")  # Extract text from the page

                    whole_text += pdf_text  # Add the PDF text to the accumulated text


        if "CSVViewer" in qq.apps:
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = self.ps3.get_apps(room_id, board_id)
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "CSVViewer":
                    asset_id = app.get("data", {}).get("state", {}).get("assetid")
                    url = self.ps3.get_public_url(asset_id)
                    df = pd.read_csv(url)
                    self.logger.info("CSV Dataframe: " + df.to_string())
                    whole_text += df.to_string() + "\n"


            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                self.logger.info(app_type)
                self.logger.info(app.get("data", {}))  # This will log the "data" object before accessing "state"


        # Initialize the input for the session call
        input_data = {
            "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
            "username": qq.user,
            "location": qq.location,
            "date": today,
        }

        if "Images" in qq.apps:
            self.logger.info("Prompting AI MODEL @@@")
            input_data["question"] = [
                {
                    "role": "assistant",
                    "content": "You are a helpful assistant, providing detailed answers to the user, using the Markdown format.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What is in the image"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                            "detail": "high",
                        },
                    ],
                },
            ]
            response = await self.session_llama.ainvoke(input_data)

        elif qq.apps:
            input_data["question"] = "Please provide a summary of the data in markdown format in markdown format. The data comes from" +json.dumps(qq.apps) +"Here are the contents: " + whole_text
            response = await self.session_llama.ainvoke(input_data)

        self.logger.info("Entire text is " + whole_text)
        self.logger.info("Response text is " + response)

        # Propose the answer to the user
        action1 = json.dumps(
            {
                "type": "create_app",
                "app": "Stickie",
                "state": {"text": response, "fontSize": 24, "color": "purple"},
                "data": {
                    "title": "Answer",
                    "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                    "size": {"width": 400, "height": 720, "depth": 0},
                },
            }
        )

        html_response = markdown.markdown(response)  # Convert markdown to HTML

        # Create Stickie Note with contents
        res = self.ps3.create_app(
            room_id,
            board_id,
            'Stickie',
            {'text': response},
            {'size': {'width': 700, 'height': 700, 'depth': 0}, 'position': {'x': 1499626, 'y': 1499442, 'z': 0}}
        )

        # Build the answer object
        val = SummaryResponse(
            id=qq.id,
            report=response,
            actions=[action1],
        )
        return val
