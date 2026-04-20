"""
AiAsk.py — answer a follow-up question about a paper hierarchy using the
same Azure OpenAI deployment configured for AiSearch.py.

Reads a JSON payload { "question": str, "hierarchy": <hierarchy dict> } from
stdin and writes the answer text to stdout.
"""

import json
import os
import sys

from dotenv import load_dotenv
from openai import AzureOpenAI

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))


CONFIG = {
    "AZURE_ENDPOINT": os.getenv("AZURE_ENDPOINT", ""),
    "AZURE_KEY": os.getenv("AZURE_KEY", ""),
    "AZURE_API_VERSION": os.getenv("AZURE_API_VERSION", "2024-12-01-preview"),
    "AZURE_DEPLOYMENT": os.getenv("AZURE_DEPLOYMENT", "gpt-5-nano"),
    "MIN_TOKENS": 10000,
}


def main():
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        print(f"ERROR: failed to parse stdin JSON: {e}", file=sys.stderr)
        sys.exit(2)

    question = (payload.get("question") or "").strip()
    hierarchy = payload.get("hierarchy")
    if not question or hierarchy is None:
        print("ERROR: payload must include 'question' and 'hierarchy'", file=sys.stderr)
        sys.exit(2)

    client = AzureOpenAI(
        api_key=CONFIG["AZURE_KEY"],
        api_version=CONFIG["AZURE_API_VERSION"],
        azure_endpoint=CONFIG["AZURE_ENDPOINT"],
    )

    prompt = (
        "You are answering questions about a research paper hierarchy produced by the "
        "AiSearch pipeline. The hierarchy is a JSON tree of topics; leaf nodes contain "
        "a list of papers with title, authors, year, venue, citations, and tldr. "
        "Use only the provided hierarchy to answer. Be concise and cite paper titles "
        "when relevant.\n\n"
        f"<hierarchy>\n{json.dumps(hierarchy)}\n</hierarchy>\n\n"
        f"Question: {question}"
    )

    try:
        response = client.chat.completions.create(
            model=CONFIG["AZURE_DEPLOYMENT"],
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=CONFIG["MIN_TOKENS"],
        )
        msg = response.choices[0].message
        content = msg.content if hasattr(msg, "content") else ""
        if isinstance(content, str):
            sys.stdout.write(content.strip())
        sys.stdout.flush()
    except Exception as e:
        print(f"ERROR: LLM call failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
