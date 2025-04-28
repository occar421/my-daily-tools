/**
 * Test utilities for mocking modules and services
 */
import { Services, FileSystem, Environment } from "./services.ts";
import { Config } from "./types.ts";

/**
 * Create a mock services object for testing
 */
export function createMockServices(): Services {
  const mockEnvironment: Environment = {
    getEnv: (key: string) => key === "PASSPHRASE" ? "test-passphrase" : undefined,
    getArgs: () => ["--startDate", "2023-01-01"],
    exit: (code: number) => { throw new Error(`Exit with code ${code}`); },
  };

  const mockFileSystem: FileSystem = {
    readTextFile: () => Promise.resolve(""),
    readFile: () => Promise.resolve(new Uint8Array()),
    writeFile: () => Promise.resolve(),
    exists: () => Promise.resolve(false),
  };

  return {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
  };
}

/**
 * Create a mock config object for testing
 */
export function createMockConfig(): Config {
  return {
    rawFilePath: "test-raw.json5",
    cryptedFilePath: "test-crypted.json5.age",
    envVars: {
      passphrase: "test-passphrase",
    },
    startEpoch: 1672531200000, // 2023-01-01 00:00:00
  };
}

/**
 * Create a mock exclusions-utils module for testing
 */
export function createMockExclusionsUtils() {
  return {
    loadConfig: () => createMockConfig(),
    parseExclusions: () => ({ urlPrefixes: ["https://example.com"] }),
    shouldProceedWithWrite: () => Promise.resolve(true),
    handleFileNotFoundError: (error: unknown, inputFile: string) => {
      throw new Error("Mocked file not found error");
    },
  };
}