export type ToolAnnotations = {
  consequentialHint?: boolean;
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
};

export type ToolExecuteOptions = {
  signal?: AbortSignal;
};

export type RegisteredTool = {
  annotations?: ToolAnnotations;
  description: string;
  execute: (args: Record<string, unknown>, options: ToolExecuteOptions) => Promise<string> | string;
  inputSchema: Record<string, unknown>;
  name: string;
};

export type DiscoveredTool = {
  annotations?: ToolAnnotations;
  description: string;
  inputSchema: unknown;
  name: string;
};

export type ModelContext = {
  addEventListener(type: 'toolchange', listener: () => void): void;
  executeTool(
    tool: DiscoveredTool,
    input: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>;
  getTools(): Promise<DiscoveredTool[]>;
  registerTool(tool: RegisteredTool, options?: { signal?: AbortSignal }): Promise<void>;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export {};
