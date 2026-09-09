declare const process: {
  env: Record<string, string | undefined>;
  exitCode: number | undefined;
  stdout: {
    write(chunk: string): void;
  };
};
