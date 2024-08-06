/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '@sage3/frontend';
import {
  AiStatusResponse,
  AiQueryRequest,
  AiImageQueryRequest,
  AiQueryResponse,
  AiJSONQueryResponse,
  AgentQueryType,
  AgentQueryResponse,
} from '@sage3/shared';

async function chatStatus(): Promise<AiStatusResponse> {
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.chat.status, {
      method: 'GET',
    });
    if (response.status !== 200) {
      return { onlineModels: [] };
    }
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.onlineModels) {
      return { onlineModels: jsonResponse.onlineModels };
    } else {
      return { onlineModels: [] };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API CHAT AI STATUS ERROR> ', error);
    return { onlineModels: [] };
  }
}

async function chatQuery(request: AiQueryRequest): Promise<AiQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.chat.query, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.success) {
      return jsonResponse;
    } else {
      return { success: false, error_message: `API CHAT AI QUERY ERROR>  Failed to query AI (Status Error${response.status})` };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API CHAT AI QUERY ERROR> ', error);
    return { success: false };
  }
}

async function ask(request: AiQueryRequest): Promise<AiQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.chat.ask, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.success) {
      return jsonResponse;
    } else {
      return { success: false, error_message: `API CHAT AI QUERY ERROR>  Failed to query AI (Status Error${response.status})` };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API CHAT AI QUERY ERROR> ', error);
    return { success: false };
  }
}

async function codeStatus(): Promise<AiStatusResponse> {
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.code.status, {
      method: 'GET',
    });
    if (response.status !== 200) {
      return { onlineModels: [] };
    }
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.onlineModels) {
      return { onlineModels: jsonResponse.onlineModels };
    } else {
      return { onlineModels: [] };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API CODE AI STATUS ERROR> ', error);
    return { onlineModels: [] };
  }
}

async function imageStatus(): Promise<AiStatusResponse> {
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.image.status, {
      method: 'GET',
    });
    if (response.status !== 200) {
      return { onlineModels: [] };
    }
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.onlineModels) {
      return { onlineModels: jsonResponse.onlineModels };
    } else {
      return { onlineModels: [] };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API IMAGE AI STATUS ERROR> ', error);
    return { onlineModels: [] };
  }
}

async function codeQuery(request: AiQueryRequest): Promise<AiQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.code.query, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.success) {
      return jsonResponse;
    } else {
      return { success: false, error_message: `API AI QUERY ERROR>  Failed to query AI (Status Error${response.status})` };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API AI QUERY ERROR> ', error);
    return { success: false };
  }
}

async function imageLabels(request: AiImageQueryRequest): Promise<AiJSONQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.image.labels, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.success) {
      return jsonResponse;
    } else {
      return { success: false, error_message: `API AI QUERY ERROR>  Failed to query AI (Status Error${response.status})` };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API AI QUERY ERROR> ', error);
    return { success: false };
  }
}

async function imageToImage(request: AiImageQueryRequest): Promise<AiJSONQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.image.image, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    // Parse the response
    const jsonResponse = await response.json();
    // Check if the response is valid
    if (jsonResponse.success) {
      return jsonResponse;
    } else {
      return { success: false, error_message: `API AI QUERY ERROR>  Failed to query AI (Status Error${response.status})` };
    }
  } catch (error) {
    // Return an error message if the request fails
    console.log('API AI QUERY ERROR> ', error);
    return { success: false };
  }
}

async function agentStatus(): Promise<boolean> {
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.agents.status, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function agentAsk(request: AgentQueryType): Promise<AgentQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.agents.ask, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    if (response.status === 200) {
      // Parse the response
      const jsonResponse = await response.json();
      return { success: true, r: jsonResponse.r, id: jsonResponse.id, actions: jsonResponse.actions };
    } else {
      const error_text = await response.json();
      return { success: false, r: error_text.error_message, id: request.id };
    }
  } catch (error) {
    return { success: false, r: 'Query failed', id: request.id };
  }
}

async function agentSummary(request: AgentQueryType): Promise<AgentQueryResponse> {
  const modelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Try/catch block to handle errors
  try {
    // Send the request
    const response = await fetch(apiUrls.ai.agents.summary, {
      method: 'POST',
      headers: modelHeaders,
      body: JSON.stringify(request),
    });
    if (response.status === 200) {
      // Parse the response
      const jsonResponse = await response.json();
      return { success: true, r: jsonResponse.r, id: jsonResponse.id, actions: jsonResponse.actions };
    } else {
      const error_text = await response.json();
      return { success: false, r: error_text.error_message, id: request.id };
    }
  } catch (error) {
    return { success: false, r: 'Query failed', id: request.id };
  }
}

export const AiAPI = {
  chat: {
    status: chatStatus,
    query: chatQuery,
    ask: ask,
  },
  code: {
    status: codeStatus,
    query: codeQuery,
  },
  image: {
    status: imageStatus,
    labels: imageLabels,
    image: imageToImage,
  },
  agents: {
    status: agentStatus,
    ask: agentAsk,
    summary: agentSummary,
  },
};
