import operator
from typing import Annotated, List, TypedDict
from langchain_core.documents import Document

from libs.utils import getModelsInfo, getPDFFile

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langgraph.constants import Send
from langgraph.graph import END, START, StateGraph

from libs.localtypes import PDFQuery, PDFAnswer
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai.embeddings import OpenAIEmbeddings


class OverallState(TypedDict):
    contents: List[str]
    summaries: Annotated[list, operator.add]
    collapsed_summaries: List[Document]  # add key for collapsed summaries
    final_summary: str


async def generate_answer(qq: PDFQuery, llm: ChatOpenAI, pdf_md, apiKey):
    # async def generate_answer(qq: PDFQuery, llm: ChatNVIDIA, pdf_md, apiKey):

    # user_prompt = "Describe the main takeaways from this paper."

    # map_template = f"""
    # Write a concise summary of the following: {{context}}.

    # Keep in mind this question from the user: {qq.q}

    # If the summary does not relate to the question, ONLY return an empty string.
  
    # DO NOT HALLUCINATE.
    # """

    map_template = f"""
    Using {{context}}, attempt to answer this question: {qq.q}.

    If the context does not relate to the question, ONLY return an empty string.
  
    DO NOT HALLUCINATE.
    """

    reduce_template = f"""
      The following is a set of content from different parts of a document based on this question "{qq.q}":
      {{docs}}

      Consolidate the most relevant content into an answer that will satisfy the question.
    
      DO NOT HALLUCINATE.
    """

    map_prompt = ChatPromptTemplate([("human", map_template)])
    reduce_prompt = ChatPromptTemplate([("human", reduce_template)])

    map_chain = map_prompt | llm | StrOutputParser()
    reduce_chain = reduce_prompt | llm | StrOutputParser()

    # Graph components: define the components that will make up the graph

    # This will be the overall state of the main graph.
    # It will contain the input document contents, corresponding
    # summaries, and a final summary.
    # class OverallState(TypedDict):
    #     # Notice here we use the operator.add
    #     # This is because we want combine all the summaries we generate
    #     # from individual nodes back into one list - this is essentially
    #     # the "reduce" part
    #     contents: List[str]
    #     summaries: Annotated[list, operator.add]
    #     final_summary: str

    # This will be the state of the node that we will "map" all
    # documents to in order to generate summaries
    class SummaryState(TypedDict):
        content: str

    # Here we generate a summary, given a document
    async def generate_summary(state: SummaryState):
        response = await map_chain.ainvoke(state["content"])
        return {"summaries": [response]}

    # Here we define the logic to map out over the documents
    # We will use this an edge in the graph
    def map_summaries(state: OverallState):
        # We will return a list of `Send` objects
        # Each `Send` object consists of the name of a node in the graph
        # as well as the state to send to that node
        return [
            Send("generate_summary", {"content": content})
            for content in state["contents"]
        ]

    # Here we will generate the final summary
    async def generate_final_summary(state: OverallState):
        response = await reduce_chain.ainvoke(state["summaries"])
        return {"final_summary": response}

    # Construct the graph: here we put everything together to construct our graph
    graph = StateGraph(OverallState)
    graph.add_node("generate_summary", generate_summary)
    graph.add_node("generate_final_summary", generate_final_summary)
    graph.add_conditional_edges(START, map_summaries, ["generate_summary"])
    graph.add_edge("generate_summary", "generate_final_summary")
    graph.add_edge("generate_final_summary", END)
    app = graph.compile()
    from typing import Literal

    from langchain.chains.combine_documents.reduce import (
        acollapse_docs,
        split_list_of_docs,
    )

    def length_function(documents: List[Document]) -> int:
        """Get number of tokens for input contents."""
        return sum(llm.get_num_tokens(doc.page_content) for doc in documents)

    token_max = 10000

    # Add node to store summaries for collapsing
    def collect_summaries(state: OverallState):
        return {
            "collapsed_summaries": [Document(summary) for summary in state["summaries"]]
        }

    # Modify final summary to read off collapsed summaries
    async def generate_final_summary(state: OverallState):
        response = await reduce_chain.ainvoke(state["collapsed_summaries"])
        return {"final_summary": response}

    graph = StateGraph(OverallState)
    graph.add_node("generate_summary", generate_summary)  # same as before
    graph.add_node("collect_summaries", collect_summaries)
    graph.add_node("generate_final_summary", generate_final_summary)

    # Add node to collapse summaries
    async def collapse_summaries(state: OverallState):
        doc_lists = split_list_of_docs(
            state["collapsed_summaries"], length_function, token_max
        )
        results = []
        for doc_list in doc_lists:
            results.append(await acollapse_docs(doc_list, reduce_chain.ainvoke))

        return {"collapsed_summaries": results}

    graph.add_node("collapse_summaries", collapse_summaries)

    def should_collapse(
        state: OverallState,
    ) -> Literal["collapse_summaries", "generate_final_summary"]:
        num_tokens = length_function(state["collapsed_summaries"])
        if num_tokens > token_max:
            return "collapse_summaries"
        else:
            return "generate_final_summary"

    graph.add_conditional_edges(START, map_summaries, ["generate_summary"])
    graph.add_edge("generate_summary", "collect_summaries")
    graph.add_conditional_edges("collect_summaries", should_collapse)
    graph.add_conditional_edges("collapse_summaries", should_collapse)
    graph.add_edge("generate_final_summary", END)
    app = graph.compile()

    text_splitter = SemanticChunker(OpenAIEmbeddings(api_key=apiKey))

    split_docs = text_splitter.split_documents([Document(pdf_md)])
    print(f"Generated {len(split_docs)} documents.")
    print(split_docs[0].page_content)

    #   async for step in app.astream(
    #     {"contents": [doc.page_content for doc in split_docs]},
    #     {"recursion_limit": 10},
    # ):
    #     print(list(step.keys()))

    answer = await app.ainvoke({"contents": [doc.page_content for doc in split_docs]})

    return answer["final_summary"]
