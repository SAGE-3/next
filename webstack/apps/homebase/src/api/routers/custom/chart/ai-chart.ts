import * as express from 'express';
import { chartInfo } from './chartInfo';
import OpenAI from 'openai';
import { config } from '../../../../config';

export function AiChartRouter(): express.Router {
  const router = express.Router();
  const openai = new OpenAI({ apiKey: config.services.openai.apiKey });

  const chartSpecs = {
    chartType: '<name of the chart>',
    visualizationElements: {
      xAxis: '<header name or undefined>',
      yAxis: '<header name or undefined>',
      label: '<header name or undefined>',
      indicator: '<header name or undefined>',
      value: '<header name or undefined>',
      bin: '<header name or undefined>',
      count: '<header name or undefined>',
      bubbleDiameter: '<header name or undefined>',
      treemapParent: '<header name or undefined>',
      treemapChild: '<header name or undefined>',
      scatterMatrixAttributes: ['header name', 'header name', '...'],
    },
    explanation: '<concise explanation of chart choice and element assignments>',
  };

  const systemPrompt = `
        # Chart Choosing Agent

        You are a chart choosing agent. Your task is to recommend the most appropriate chart type based on the provided data and user requirements. Use the decision-making document to guide your choices and provide your output in the specified JSON format.

        ## Decision-Making Document

        [DECISION_MAKING_DOCUMENT]
        ${JSON.stringify(chartInfo)}
        [/DECISION_MAKING_DOCUMENT]

        ## Output Format

        Provide your recommendation in the following JSON format:
        ${JSON.stringify(chartSpecs)}

        ## Instructions

        1. CAREFULLY review the decision-making document, user prompt, and provided data. The headers and the first of row of the whole dataset will be provided. Think it through step by step.
        2. Based on the decision-making document and the user's requirements, select the most appropriate chart type.
        3. Determine how each relevant data element should be used in the chart (e.g., x-axis, y-axis, label, etc.).
        4. Provide your recommendation using the specified JSON format.
        5. In the "explanation" field, justify your chart choice and how it addresses the user's needs.

        Remember:
        - Strictly adhere to the guidelines in the decision-making document.
        - If the user prompt is unclear, still make a chart with your best judgement and provide an explanation.
        - Only use chart types and data elements that are available in the provided information.
        - Ensure your entire response is VALID JSON with no text outside the JSON object.
        - Double check that the visualization elements match the [DECISION_MAKING_DOCUMENT].
        - PAY ATTENTION TO THE MAIN TYPE FROM [DECISION_MAKING_DOCUMENT] WHEN SELECTING THE VISUALIZATION ELEMENTS

        Your task begins now. Analyze the provided information and make your chart recommendation.
    `;

  // Send query to OpenAI
  router.post('/query', async (req, res) => {
    try {
      // Get request params
      const { prompt, data } = req.body;
      console.log('\n\nprompt', prompt);
      console.log('\n\ndata', data);
      if (!prompt || !data) {
        throw new Error('Prompt and data are required');
      }

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: JSON.stringify(systemPrompt),
          },
          { role: 'user', content: prompt },
          {
            role: 'user',
            content: `${data}`,
          },
        ],
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0].message.content;
      res.status(200).json({ success: true, response });
    } catch (error) {
      console.log('error', error);
      res.status(500).json({ success: false, error_message: `${error.message}` });
    }
  });

  return router;
}
