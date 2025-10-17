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
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function DocuCHATRouter(): express.Router {
  const router = express.Router();

  router.post('/ai-search', async ({ body, user }, res) => {
    try {
      // @ts-ignore
      const userId = user.id;
      const { query } = body;

      if (!query) {
        return res.status(400).send({ 
          success: false, 
          message: 'Query parameter is required' 
        });
      }

      // Path to the ai-test.py script - try multiple possible locations
      const possiblePaths = [
        path.join(__dirname, '../../../../../../libs/applications/src/lib/apps/DocuCHAT/ai/ai-test.py'),
        path.join(process.cwd(), 'libs/applications/src/lib/apps/DocuCHAT/ai/ai-test.py'),
        path.join(process.cwd(), 'webstack/libs/applications/src/lib/apps/DocuCHAT/ai/ai-test.py'),
        path.resolve('./libs/applications/src/lib/apps/DocuCHAT/ai/ai-test.py'),
        path.resolve('./webstack/libs/applications/src/lib/apps/DocuCHAT/ai/ai-test.py'),
      ];
      
      let scriptPath = '';
      for (const testPath of possiblePaths) {
        console.log('Testing path:', testPath);
        if (fs.existsSync(testPath)) {
          scriptPath = testPath;
          console.log('Found script at:', scriptPath);
          break;
        }
      }
      
      // Check if the script exists
      if (!scriptPath || !fs.existsSync(scriptPath)) {
        console.log('Script not found. Current working directory:', process.cwd());
        console.log('__dirname:', __dirname);
        return res.status(404).send({ 
          success: false, 
          message: `AI script not found. Tried paths: ${possiblePaths.join(', ')}` 
        });
      }

      // Create a temporary Python script with the user's query
      const scriptDir = path.dirname(scriptPath);
      const tempScriptPath = path.join(scriptDir, 'temp_ai_test.py');
      
      // Read the original script
      const originalScript = fs.readFileSync(scriptPath, 'utf8');
      
      // Replace the prompt with the user's query
      const modifiedScript = originalScript.replace(
        /Please search the web for 50 research papers across all scientific topics that were published after the year 2000\./,
        query
      );
      
      // Write the modified script
      fs.writeFileSync(tempScriptPath, modifiedScript);

      // Execute the Python script
      const { stdout, stderr } = await execAsync(`cd "${scriptDir}" && python3 temp_ai_test.py`);
      
      // Clean up the temporary script
      fs.unlinkSync(tempScriptPath);

      if (stderr) {
        console.error('Python script stderr:', stderr);
      }

      // Try to read the output.json file
      const outputPath = path.join(scriptDir, 'output.json');
      let result = null;
      
      if (fs.existsSync(outputPath)) {
        const outputData = fs.readFileSync(outputPath, 'utf8');
        result = JSON.parse(outputData);
        
        // Clean up the output file
        fs.unlinkSync(outputPath);
      }

      res.status(200).send({ 
        success: true, 
        message: 'AI search completed successfully',
        data: result,
        stdout: stdout
      });

    } catch (error) {
      console.error('DocuCHAT AI Error:', error);
      res.status(500).send({ 
        success: false, 
        message: 'Failed to execute AI search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
