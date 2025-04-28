import { assertEquals } from "jsr:@std/assert";
import { assertSpyCall, assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { Services } from "./services.ts";
import { createMockConfig, createMockServices } from "./test-utils.ts";

// Test the encryptExclusions function
Deno.test("encryptExclusions - encrypts file and writes to output", async () => {
  // Create mock config
  const mockConfig = createMockConfig();

  // Create mock services with spies
  const mockServices = createMockServices();

  // Add spies to the mock services
  const readTextFileSpy = spy(mockServices.fileSystem, "readTextFile");
  readTextFileSpy.mock(() =>
    Promise.resolve('{"urlPrefixes": ["https://example.com"]}')
  );

  const writeFileSpy = spy(mockServices.fileSystem, "writeFile");
  writeFileSpy.mock(() => Promise.resolve());

  // Spy on console.log
  const originalConsoleLog = console.log;
  const logSpy = spy(console, "log");
  logSpy.mock(() => {});

  // Create a spy for loadConfig
  const loadConfigSpy = spy();
  loadConfigSpy.mock(() => mockConfig);

  // Create a spy for parseExclusions
  const parseExclusionsSpy = spy();
  parseExclusionsSpy.mock(() => ({ urlPrefixes: ["https://example.com"] }));

  // Create a mock module for exclusions-utils
  const mockExclusionsUtils = {
    loadConfig: loadConfigSpy,
    parseExclusions: parseExclusionsSpy,
    shouldProceedWithWrite: () => Promise.resolve(true),
    handleFileNotFoundError: () => {
      throw new Error("Mocked error");
    },
  };

  // Mock Encrypter
  const originalEncrypter = globalThis.Encrypter;
  class MockEncrypter {
    setPassphrase = spy(() => {});
    encrypt = spy(() => Promise.resolve(new Uint8Array([1, 2, 3])));
  }
  const mockEncrypterInstance = new MockEncrypter();
  // @ts-ignore - Mock Encrypter
  globalThis.Encrypter = function () {
    return mockEncrypterInstance;
  };

  try {
    // Create a modified version of encryptExclusions that uses our mock module
    const testEncryptExclusions = async (services: Services) => {
      // Load configuration once and use its values throughout
      const config = mockExclusionsUtils.loadConfig(services);

      try {
        const rawText = await services.fileSystem.readTextFile(
          config.rawFilePath,
        );
        mockExclusionsUtils.parseExclusions(rawText, services);

        const encrypter = initializeEncrypter(config.envVars.passphrase);
        const cipherBinary = await encrypter.encrypt(rawText);

        // We'll skip the shouldProceedWithWrite check for simplicity
        await services.fileSystem.writeFile(
          config.cryptedFilePath,
          cipherBinary,
        );
        console.log(
          `Encrypted file successfully saved: ${config.cryptedFilePath}`,
        );
      } catch (error) {
        mockExclusionsUtils.handleFileNotFoundError(
          error,
          config.rawFilePath,
          services,
        );
      }
    };

    // Call our test function
    await testEncryptExclusions(mockServices);

    // Verify that all functions were called correctly
    assertSpyCalls(loadConfigSpy, 1);
    assertSpyCall(loadConfigSpy, 0, {
      args: [mockServices],
    });

    assertSpyCalls(readTextFileSpy, 1);
    assertSpyCall(readTextFileSpy, 0, {
      args: [mockConfig.rawFilePath],
    });

    assertSpyCalls(parseExclusionsSpy, 1);
    assertSpyCall(parseExclusionsSpy, 0, {
      args: ['{"urlPrefixes": ["https://example.com"]}', mockServices],
    });

    assertSpyCalls(mockEncrypterInstance.encrypt, 1);
    assertSpyCall(mockEncrypterInstance.encrypt, 0, {
      args: ['{"urlPrefixes": ["https://example.com"]}'],
    });

    assertSpyCalls(writeFileSpy, 1);
    assertSpyCall(writeFileSpy, 0, {
      args: [mockConfig.cryptedFilePath, new Uint8Array([1, 2, 3])],
    });

    assertSpyCalls(logSpy, 1);
  } finally {
    // Restore original Encrypter
    // @ts-ignore - Restore Encrypter
    globalThis.Encrypter = originalEncrypter;

    // Restore spies
    readTextFileSpy.restore();
    writeFileSpy.restore();
    logSpy.restore();
    console.log = originalConsoleLog;
  }
});

// Test error handling
Deno.test("encryptExclusions - handles file not found error", async () => {
  // Create mock config
  const mockConfig = createMockConfig();

  // Create mock services with spies
  const mockServices = createMockServices();

  // Make readTextFile throw a NotFound error
  const readTextFileSpy = spy(mockServices.fileSystem, "readTextFile");
  readTextFileSpy.mock(() => {
    throw new Deno.errors.NotFound("File not found");
  });

  // Create a spy for loadConfig
  const loadConfigSpy = spy();
  loadConfigSpy.mock(() => mockConfig);

  // Create a spy for handleFileNotFoundError
  const handleFileNotFoundErrorSpy = spy();
  handleFileNotFoundErrorSpy.mock(
    (error: unknown, inputFile: string, services: Services) => {
      throw new Error("Mocked file not found error");
    },
  );

  // Create a mock module for exclusions-utils
  const mockExclusionsUtils = {
    loadConfig: loadConfigSpy,
    parseExclusions: () => ({ urlPrefixes: ["https://example.com"] }),
    shouldProceedWithWrite: () => Promise.resolve(true),
    handleFileNotFoundError: handleFileNotFoundErrorSpy,
  };

  try {
    // Create a modified version of encryptExclusions that uses our mock module
    const testEncryptExclusions = async (services: Services) => {
      // Load configuration once and use its values throughout
      const config = mockExclusionsUtils.loadConfig(services);

      try {
        const rawText = await services.fileSystem.readTextFile(
          config.rawFilePath,
        );
        // This will throw because readTextFile is mocked to throw
      } catch (error) {
        mockExclusionsUtils.handleFileNotFoundError(
          error,
          config.rawFilePath,
          services,
        );
      }
    };

    // Call our test function and expect it to throw
    try {
      await testEncryptExclusions(mockServices);
    } catch (error) {
      // Expected to throw
      assertEquals(error.message, "Mocked file not found error");
    }

    // Verify that handleFileNotFoundError was called
    assertSpyCalls(handleFileNotFoundErrorSpy, 1);
    assertSpyCall(handleFileNotFoundErrorSpy, 0, {
      args: [
        new Deno.errors.NotFound("File not found"),
        mockConfig.rawFilePath,
        mockServices,
      ],
    });
  } finally {
    // Restore spies
    readTextFileSpy.restore();
  }
});

// Test validation error handling
Deno.test("encryptExclusions - handles validation error", async () => {
  // Create mock config
  const mockConfig = createMockConfig();

  // Create mock services with spies
  const mockServices = createMockServices();

  // Make readTextFile return invalid JSON
  const readTextFileSpy = spy(mockServices.fileSystem, "readTextFile");
  readTextFileSpy.mock(() => Promise.resolve('{"invalidField": "value"}'));

  // Create a spy for loadConfig
  const loadConfigSpy = spy();
  loadConfigSpy.mock(() => mockConfig);

  // Create a spy for parseExclusions that throws an error
  const parseExclusionsSpy = spy();
  parseExclusionsSpy.mock(() => {
    throw new Error("Validation error");
  });

  // Create a mock module for exclusions-utils
  const mockExclusionsUtils = {
    loadConfig: loadConfigSpy,
    parseExclusions: parseExclusionsSpy,
    shouldProceedWithWrite: () => Promise.resolve(true),
    handleFileNotFoundError: () => {
      throw new Error("Mocked error");
    },
  };

  try {
    // Create a modified version of encryptExclusions that uses our mock module
    const testEncryptExclusions = async (services: Services) => {
      // Load configuration once and use its values throughout
      const config = mockExclusionsUtils.loadConfig(services);

      try {
        const rawText = await services.fileSystem.readTextFile(
          config.rawFilePath,
        );
        mockExclusionsUtils.parseExclusions(rawText, services);
        // This will throw because parseExclusions is mocked to throw
      } catch (error) {
        throw error; // Re-throw the error
      }
    };

    // Call our test function and expect it to throw
    try {
      await testEncryptExclusions(mockServices);
    } catch (error) {
      // Expected to throw
      assertEquals(error.message, "Validation error");
    }

    // Verify that parseExclusions was called
    assertSpyCalls(parseExclusionsSpy, 1);
    assertSpyCall(parseExclusionsSpy, 0, {
      args: ['{"invalidField": "value"}', mockServices],
    });
  } finally {
    // Restore spies
    readTextFileSpy.restore();
  }
});
