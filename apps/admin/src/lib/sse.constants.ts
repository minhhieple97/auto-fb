export const sseProtocol = {
  dataPrefix: "data:",
  eventSeparator: "\n\n",
  lineJoiner: "\n",
  lineBreakPattern: /\r?\n/
} as const;
