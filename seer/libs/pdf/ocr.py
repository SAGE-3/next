# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

#
# PDF -> Markdown via the olmOCR toolkit
#
# Runs the olmocr pipeline against a remote vLLM server (the olmOCR model),
# mirroring the documented CLI:
#   python -m olmocr.pipeline <workspace> --server <url> --model <model> \
#       --markdown --pdfs <file.pdf>
# olmocr renders the pages, builds the model's prompt, calls the server, and
# writes Markdown into <workspace>/markdown/. We run it in a throwaway
# workspace and return the generated Markdown.

import asyncio
import glob
import os
import shutil
import sys
import tempfile
from logging import Logger
from typing import Optional


async def olmocr_to_markdown(
    content: bytes,
    url: str,
    model: str,
    timeout: int = 600,
    logger: Optional[Logger] = None,
) -> str:
    """Convert a PDF (raw bytes) to Markdown using olmOCR pointed at a remote
    vLLM server. Returns the Markdown text, or raises on failure/timeout so the
    caller can fall back to another converter."""
    workspace = tempfile.mkdtemp(prefix="olmocr_")
    pdf_path = os.path.join(workspace, "input.pdf")
    try:
        with open(pdf_path, "wb") as f:
            f.write(content)

        cmd = [
            sys.executable,
            "-m",
            "olmocr.pipeline",
            workspace,
            "--server",
            url,
            "--model",
            model,
            "--markdown",
            "--pdfs",
            pdf_path,
        ]
        if logger:
            logger.info("olmOCR> " + " ".join(cmd))

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError(f"olmOCR timed out after {timeout}s")

        if proc.returncode != 0:
            tail = (out or b"").decode("utf-8", "ignore")[-2000:]
            raise RuntimeError(f"olmOCR exited {proc.returncode}: {tail}")

        # --markdown writes to <workspace>/markdown/; glob defensively in case
        # the layout nests by input path.
        md_files = sorted(
            glob.glob(os.path.join(workspace, "markdown", "**", "*.md"), recursive=True)
        )
        if not md_files:
            md_files = sorted(
                glob.glob(os.path.join(workspace, "**", "*.md"), recursive=True)
            )
        if not md_files:
            raise RuntimeError("olmOCR produced no markdown output")

        parts = []
        for m in md_files:
            with open(m, "r", encoding="utf-8") as f:
                parts.append(f.read())
        return "\n\n".join(parts)
    finally:
        shutil.rmtree(workspace, ignore_errors=True)
