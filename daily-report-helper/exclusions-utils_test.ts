import { assertEquals, assertThrows, assertRejects } from "jsr:@std/assert";
import { assertSpyCalls, assertSpyCall, spy } from "jsr:@std/testing/mock";
import { FakeTime } from "jsr:@std/testing/time";
import { Config, Exclusions } from "./types.ts";
import {
  handleFileNotFoundError,
  loadConfig,
  parseExclusions,
  shouldProceedWithWrite,
} from "./exclusions-utils.ts";
import { Services, FileSystem, Environment, UserInteraction } from "./services.ts";
import { createMockServices, createMockConfig } from "./test-utils.ts";

// Mock for testing functions that use Deno.env
const originalEnv = Deno.env;
const mockEnv = {
  get: (key: string) => key === "PASSPHRASE" ? "test-passphrase" : null,
};

// Mock for testing functions that use Deno.args
const originalArgs = Deno.args;

Deno.test("parseExclusions - valid data", () => {
  const validJson = `{
    urlPrefixes: ["https://example.com"],
    urlContains: ["test"],
    notionIds: ["1234567890abcdef1234567890abcdef"],
    titleContains: ["Example"]
  }`;

  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => "test-passphrase"),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(false)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  const result = parseExclusions(validJson, mockServices);
  assertEquals(result.urlPrefixes, ["https://example.com"]);
  assertEquals(result.urlContains, ["test"]);
  assertEquals(result.notionIds, ["1234567890abcdef1234567890abcdef"]);
  assertEquals(result.titleContains, ["Example"]);
  assertSpyCalls(mockUserInteraction.log, 1);
});

Deno.test("parseExclusions - invalid data", () => {
  const invalidJson = `{
    invalidField: ["test"]
  }`;

  // Create mock services
  const mockServices = createMockServices();

  // Add spies to the mock services
  const errorSpy = spy(mockServices.userInteraction, "error");
  errorSpy.mock(() => {});

  const exitSpy = spy(mockServices.environment, "exit");
  exitSpy.mock((code) => { throw new Error(`Exit with code ${code}`); });

  try {
    parseExclusions(invalidJson, mockServices);
  } catch (error) {
    // Expected to throw with "Exit with code 1"
    assertEquals(error.message, "Exit with code 1");
  }

  assertSpyCalls(errorSpy, 1);
  assertSpyCalls(exitSpy, 1);
  assertSpyCall(exitSpy, 0, {
    args: [1],
  });

  // Restore spies
  errorSpy.restore();
  exitSpy.restore();
});

Deno.test("handleFileNotFoundError - NotFound error", () => {
  const error = new Deno.errors.NotFound("File not found");

  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => "test-passphrase"),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(false)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  try {
    handleFileNotFoundError(error, "test-file.txt", mockServices);
  } catch (error) {
    // Expected to throw with "Exit with code 1"
    assertEquals(error.message, "Exit with code 1");
  }

  assertSpyCalls(mockUserInteraction.error, 1);
  assertSpyCalls(mockEnvironment.exit, 1);
  assertSpyCall(mockEnvironment.exit, 0, {
    args: [1],
  });
});

Deno.test("handleFileNotFoundError - other error", () => {
  const error = new Error("Some other error");

  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => "test-passphrase"),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(false)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  assertThrows(
    () => handleFileNotFoundError(error, "test-file.txt", mockServices),
    Error,
    "Some other error"
  );

  assertSpyCalls(mockUserInteraction.error, 1);
});

Deno.test("shouldProceedWithWrite - file exists and user confirms", async () => {
  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => "test-passphrase"),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(true)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  const result = await shouldProceedWithWrite("test-file.txt", mockServices);
  assertEquals(result, true);
  assertSpyCalls(mockFileSystem.exists, 1);
  assertSpyCalls(mockUserInteraction.warn, 1);
  assertSpyCalls(mockUserInteraction.confirm, 1);
  assertSpyCalls(mockUserInteraction.log, 1);
});

Deno.test("shouldProceedWithWrite - file exists and user cancels", async () => {
  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => false),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => "test-passphrase"),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(true)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  const result = await shouldProceedWithWrite("test-file.txt", mockServices);
  assertEquals(result, false);
  assertSpyCalls(mockFileSystem.exists, 1);
  assertSpyCalls(mockUserInteraction.warn, 1);
  assertSpyCalls(mockUserInteraction.confirm, 1);
  assertSpyCalls(mockUserInteraction.log, 1);
});

Deno.test("shouldProceedWithWrite - file does not exist", async () => {
  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => "test-passphrase"),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(false)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  const result = await shouldProceedWithWrite("test-file.txt", mockServices);
  assertEquals(result, true);
  assertSpyCalls(mockFileSystem.exists, 1);
  assertSpyCalls(mockUserInteraction.warn, 0);
  assertSpyCalls(mockUserInteraction.confirm, 0);
  assertSpyCalls(mockUserInteraction.log, 0);
});

Deno.test("loadConfig - with valid environment", () => {
  // Create mock services
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy((key) => key === "PASSPHRASE" ? "test-passphrase" : undefined),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(false)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  const config = loadConfig(mockServices);
  assertEquals(config.rawFilePath, "exclusions.json5");
  assertEquals(config.cryptedFilePath, "exclusions.json5.age");
  assertEquals(config.envVars.passphrase, "test-passphrase");
  assertEquals(typeof config.startEpoch, "number");
  assertSpyCalls(mockEnvironment.getEnv, 1);
  assertSpyCalls(mockEnvironment.getArgs, 1);
  assertSpyCall(mockEnvironment.getEnv, 0, {
    args: ["PASSPHRASE"],
  });
});

Deno.test("loadConfig - without passphrase", () => {
  // Create mock services with environment that returns null for PASSPHRASE
  const mockUserInteraction: UserInteraction = {
    log: spy(() => {}),
    warn: spy(() => {}),
    error: spy(() => {}),
    confirm: spy(() => true),
  };

  const mockEnvironment: Environment = {
    getEnv: spy(() => undefined),
    getArgs: spy(() => ["--startDate", "2023-01-01"]),
    exit: spy((code) => { throw new Error(`Exit with code ${code}`); }),
  };

  const mockFileSystem: FileSystem = {
    readTextFile: spy(() => Promise.resolve("")),
    readFile: spy(() => Promise.resolve(new Uint8Array())),
    writeFile: spy(() => Promise.resolve()),
    exists: spy(() => Promise.resolve(false)),
  };

  const mockServices: Services = {
    fileSystem: mockFileSystem,
    environment: mockEnvironment,
    userInteraction: mockUserInteraction,
  };

  assertThrows(
    () => loadConfig(mockServices),
    Error,
    "Environment variable 'PASSPHRASE' is not set"
  );
  assertSpyCalls(mockEnvironment.getEnv, 1);
});
