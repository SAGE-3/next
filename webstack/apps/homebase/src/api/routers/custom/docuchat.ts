/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

export function DocuCHATRouter(): express.Router {
  const router = express.Router();

  /**
   * Find a script in the DocuCHAT/ai directory by filename.
   */
  function findScriptPath(filename = 'AiSearch.py'): string | null {
    const possiblePaths = [
      path.join(__dirname, `../../../../../../libs/applications/src/lib/apps/DocuCHAT/ai/${filename}`),
      path.join(process.cwd(), `libs/applications/src/lib/apps/DocuCHAT/ai/${filename}`),
      path.join(process.cwd(), `webstack/libs/applications/src/lib/apps/DocuCHAT/ai/${filename}`),
      path.resolve(`./libs/applications/src/lib/apps/DocuCHAT/ai/${filename}`),
      path.resolve(`./webstack/libs/applications/src/lib/apps/DocuCHAT/ai/${filename}`),
    ];
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }
    return null;
  }

  /**
   * POST /ai-search
   *
   * Spawns the AiSearch.py pipeline for the given query, streaming progress
   * to the client as newline-delimited JSON (NDJSON). Each line is a JSON
   * object with a "type" field:
   *
   *   { "type": "progress", "message": "..." }   – pipeline progress line
   *   { "type": "result",   "success": true, "data": { ... } }  – final hierarchy
   *   { "type": "error",    "message": "..." }   – error
   *   { "type": "done" }                         – stream finished
   */
  router.post('/ai-search', (req, res) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required',
      });
    }

    const scriptPath = findScriptPath();
    if (!scriptPath) {
      console.error('AiSearch.py not found. cwd:', process.cwd(), '__dirname:', __dirname);
      return res.status(404).json({
        success: false,
        message: 'AiSearch.py script not found',
      });
    }

    const scriptDir = path.dirname(scriptPath);
    const outputDir = path.join(scriptDir, `results_tmp_${Date.now()}`);

    // ---- Set up streaming response ----
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    // Helper: send one NDJSON line
    const send = (obj: Record<string, unknown>) => {
      res.write(JSON.stringify(obj) + '\n');
    };

    send({ type: 'progress', message: `Starting AiSearch pipeline for: "${query}"` });

    // ---- Spawn Python process ----
    const proc = spawn('python3', ['-u', scriptPath, query, outputDir], {
      cwd: scriptDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stderrBuf = '';

    // Stream stdout lines as progress
    let stdoutBuf = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop()!; // keep incomplete last line in buffer
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          send({ type: 'progress', message: trimmed });
        }
      }
    });

    // Capture stderr (pip install noise, warnings, etc.)
    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    // Handle process exit
    proc.on('close', (code) => {
      // Flush any remaining stdout
      if (stdoutBuf.trim()) {
        send({ type: 'progress', message: stdoutBuf.trim() });
      }

      if (code !== 0) {
        console.error('AiSearch.py exited with code', code, 'stderr:', stderrBuf);
        send({ type: 'error', message: `Pipeline exited with code ${code}` });
        send({ type: 'done' });
        res.end();
        return;
      }

      // Read hierarchy.json from the output directory
      const hierarchyPath = path.join(outputDir, 'hierarchy.json');
      if (fs.existsSync(hierarchyPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
          send({ type: 'result', success: true, data });
        } catch (e) {
          send({ type: 'error', message: 'Failed to parse hierarchy.json' });
        }
        // Clean up output directory
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch { /* ignore cleanup errors */ }
      } else {
        send({ type: 'error', message: 'Pipeline did not produce hierarchy.json' });
      }

      send({ type: 'done' });
      res.end();
    });

    proc.on('error', (err) => {
      console.error('Failed to spawn AiSearch.py:', err);
      send({ type: 'error', message: `Failed to start pipeline: ${err.message}` });
      send({ type: 'done' });
      res.end();
    });

    // Kill the process if the client disconnects
    req.on('close', () => {
      if (!proc.killed) {
        proc.kill();
        // Clean up output directory
        try {
          if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
          }
        } catch { /* ignore */ }
      }
    });
  });

  /**
   * POST /ai-ask
   *
   * Answers a follow-up question about a previously-generated hierarchy by
   * spawning AiAsk.py, which uses the same Azure OpenAI deployment as the
   * main AiSearch pipeline.
   *
   * Body: { question: string, hierarchy: object }
   * Response: { success: true, answer: string } | { success: false, message: string }
   */
  router.post('/ai-ask', (req, res) => {
    const { question, hierarchy } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, message: 'question is required' });
    }
    if (!hierarchy || typeof hierarchy !== 'object') {
      return res.status(400).json({ success: false, message: 'hierarchy is required' });
    }

    const scriptPath = findScriptPath('AiAsk.py');
    if (!scriptPath) {
      return res.status(404).json({ success: false, message: 'AiAsk.py script not found' });
    }
    const scriptDir = path.dirname(scriptPath);

    const proc = spawn('python3', ['-u', scriptPath], {
      cwd: scriptDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c: Buffer) => { stdout += c.toString(); });
    proc.stderr.on('data', (c: Buffer) => { stderr += c.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('AiAsk.py exited with code', code, 'stderr:', stderr);
        return res.status(500).json({
          success: false,
          message: stderr.trim() || `AiAsk.py exited with code ${code}`,
        });
      }
      return res.json({ success: true, answer: stdout.trim() });
    });

    proc.on('error', (err) => {
      console.error('Failed to spawn AiAsk.py:', err);
      return res.status(500).json({ success: false, message: `Failed to start AiAsk: ${err.message}` });
    });

    req.on('close', () => {
      if (!proc.killed) proc.kill();
    });

    proc.stdin.write(JSON.stringify({ question, hierarchy }));
    proc.stdin.end();
  });

  return router;
}
