export default function extractHeaders(input: string, headers: string[]) {
  const extractedHeaders: string[] = [];
  headers.forEach((header) => {
    if (input.includes(header)) {
      extractedHeaders.push(header);
    }
  });
  return extractedHeaders;
}
