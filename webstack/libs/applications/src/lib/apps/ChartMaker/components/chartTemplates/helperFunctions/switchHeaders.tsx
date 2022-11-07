// Helper function to switch the order of headers in extractedHeaders
// Usually used in most create chart type templates (Ex: createBar, createLine, etc..)
export default function switchHeaders(extractedHeaders: string[], targetIndex: number, sourceIndex: number) {
  let tmpHeader = extractedHeaders[targetIndex];
  extractedHeaders[targetIndex] = extractedHeaders[sourceIndex];
  extractedHeaders[sourceIndex] = tmpHeader;
  return extractedHeaders;
}
