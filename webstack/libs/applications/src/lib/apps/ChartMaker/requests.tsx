type NLPRequestResponse = {
  success: boolean;
  message: string;
};

type NLPExtractResponse = {
  success: boolean;
  message: { headers: string[]; filterValues: string[] };
};

export async function NLPHTTPRequest(message: string): Promise<NLPRequestResponse> {
  const response = await fetch('/api/nlp', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  return (await response.json()) as NLPRequestResponse;
}

export async function NLPExtractRequest(
  query: string,
  propertyList: { header: string; filterValues: string[]; headerType: string }[]
): Promise<NLPExtractResponse> {
  const response = await fetch('/api/nlp/extract', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, propertyList }),
  });
  return (await response.json()) as NLPExtractResponse;
}
