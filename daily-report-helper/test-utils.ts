/**
 * Test utilities for mocking modules and services
 */
import { FileSystem, Services } from "./services.ts";
import { Config } from "./types.ts";

/**
 * Create a mock services object for testing
 */
export function createMockServices(): Services {
  const mockFileSystem: FileSystem = {
    readTextFile: () => Promise.resolve(""),
    readFile: () => Promise.resolve(new Uint8Array()),
    writeFile: () => Promise.resolve(),
    exists: () => Promise.resolve(false),
  };

  return {
    fileSystem: mockFileSystem,
    cryptoSystem: mockFileSystem,
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
