// Request Return Type
export type AiQueryRequest = {
  input: string;
  model: string;
};

export type AiQueryResponse = {
  success: boolean;
  output?: string;
  error_message?: string;
};

export type AiStatusResponse = {
  onlineModels: string[];
};
