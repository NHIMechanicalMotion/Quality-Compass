declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  export interface ArrayBufferInput {
    arrayBuffer: ArrayBuffer;
  }
  export function convertToHtml(input: ArrayBufferInput, options?: any): Promise<MammothResult>;
  export function convertToMarkdown(input: ArrayBufferInput, options?: any): Promise<MammothResult>;
  export function extractRawText(input: ArrayBufferInput): Promise<MammothResult>;
}
