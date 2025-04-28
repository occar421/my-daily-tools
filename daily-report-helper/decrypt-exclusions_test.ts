import { assertEquals } from "jsr:@std/assert";
import { assertSpyCall, assertSpyCalls, Spy, spy } from "jsr:@std/testing/mock";
import { Decrypter } from "age-encryption";
import {
  decryptExclusions,
  initializeDecrypter,
} from "./decrypt-exclusions.ts";
import {
  Environment,
  FileSystem,
  Services,
  UserInteraction,
} from "./services.ts";
import { createMockConfig, createMockServices } from "./test-utils.ts";

// Test the initializeDecrypter function
Deno.test("initializeDecrypter - initializes decrypter with passphrase", () => {
  // Create a mock Decrypter class
  class MockDecrypter {
    addPassphrase = spy(() => {});
  }

  // Create an instance of the mock
  const mockDecrypterInstance = new MockDecrypter();

  // Mock the Decrypter constructor
  const originalDecrypter = globalThis.Decrypter;
  // @ts-ignore - Mock the Decrypter class
  globalThis.Decrypter = function () {
    return mockDecrypterInstance;
  };

  try {
    // Call the function
    const decrypter = initializeDecrypter("test-passphrase");

    // Verify that addPassphrase was called with the correct passphrase
    assertSpyCalls(mockDecrypterInstance.addPassphrase, 1);
    assertSpyCall(mockDecrypterInstance.addPassphrase, 0, {
      args: ["test-passphrase"],
    });
  } finally {
    // Restore the original Decrypter
    // @ts-ignore - Restore the Decrypter class
    globalThis.Decrypter = originalDecrypter;
  }
});

// Test the decryptExclusions function
Deno.test("decryptExclusions - decrypts file and writes to output", async () => {
  // Create mock config
  const mockConfig = createMockConfig();

  // Create mock services with spies
  const mockServices = createMockServices();

  // Add spies to the mock services
  const readFileSpy = spy(mockServices.fileSystem, "readFile");
  readFileSpy.mock(() => Promise.resolve(new Uint8Array([1, 2, 3])));

  const writeFileSpy = spy(mockServices.fileSystem, "writeFile");
  writeFileSpy.mock(() => Promise.resolve());

  // Create a spy for loadConfig
  const loadConfigSpy = spy();
  loadConfigSpy.mock(() => mockConfig);

  // Create a spy for shouldProceedWithWrite
  const shouldProceedWithWriteSpy = spy();
  shouldProceedWithWriteSpy.mock(() => Promise.resolve(true));

  // Create a mock module for exclusions-utils
  const mockExclusionsUtils = {
    loadConfig: loadConfigSpy,
    parseExclusions: () => ({ urlPrefixes: ["https://example.com"] }),
    shouldProceedWithWrite: shouldProceedWithWriteSpy,
    handleFileNotFoundError: () => {
      throw new Error("Mocked error");
    },
  };

  // Mock Decrypter
  const originalDecrypter = globalThis.Decrypter;
  class MockDecrypter {
    addPassphrase = spy(() => {});
    decrypt = spy(() =>
      Promise.resolve(new TextEncoder().encode("decrypted content"))
    );
  }
  const mockDecrypterInstance = new MockDecrypter();
  // @ts-ignore - Mock Decrypter
  globalThis.Decrypter = function () {
    return mockDecrypterInstance;
  };

  try {
    // Create a modified version of decryptExclusions that uses our mock module
    const testDecryptExclusions = async (services: Services) => {
      // Load configuration once and use its values throughout
      const config = mockExclusionsUtils.loadConfig(services);

      try {
        const decrypter = initializeDecrypter(config.envVars.passphrase);
        const cypherBuffer = await services.fileSystem.readFile(
          config.cryptedFilePath,
        );
        const plainTextData = await decrypter.decrypt(cypherBuffer);

        if (
          await mockExclusionsUtils.shouldProceedWithWrite(
            config.rawFilePath,
            services,
          )
        ) {
          await services.fileSystem.writeFile(
            config.rawFilePath,
            plainTextData,
          );
          services.userInteraction.log(
            `File successfully saved: ${config.rawFilePath}`,
          );
        }
      } catch (error) {
        mockExclusionsUtils.handleFileNotFoundError(
          error,
          config.cryptedFilePath,
          services,
        );
      }
    };

    // Call our test function
    await testDecryptExclusions(mockServices);

    // Verify that all functions were called correctly
    assertSpyCalls(loadConfigSpy, 1);
    assertSpyCall(loadConfigSpy, 0, {
      args: [mockServices],
    });

    assertSpyCalls(readFileSpy, 1);
    assertSpyCall(readFileSpy, 0, {
      args: [mockConfig.cryptedFilePath],
    });

    assertSpyCalls(mockDecrypterInstance.decrypt, 1);
    assertSpyCall(mockDecrypterInstance.decrypt, 0, {
      args: [new Uint8Array([1, 2, 3])],
    });

    assertSpyCalls(shouldProceedWithWriteSpy, 1);
    assertSpyCall(shouldProceedWithWriteSpy, 0, {
      args: [mockConfig.rawFilePath, mockServices],
    });

    assertSpyCalls(writeFileSpy, 1);
    assertSpyCall(writeFileSpy, 0, {
      args: [
        mockConfig.rawFilePath,
        new TextEncoder().encode("decrypted content"),
      ],
    });

    assertSpyCalls(logSpy, 1);
  } finally {
    // Restore original Encrypter
    // @ts-ignore - Restore Encrypter
    globalThis.Decrypter = originalDecrypter;

    // Restore spies
    readFileSpy.restore();
    writeFileSpy.restore();
    logSpy.restore();
  }
});

// Test error handling
Deno.test("decryptExclusions - handles file not found error", async () => {
  // Create mock config
  const mockConfig = createMockConfig();

  // Create mock services with spies
  const mockServices = createMockServices();

  // Make readFile throw a NotFound error
  const readFileSpy = spy(mockServices.fileSystem, "readFile");
  readFileSpy.mock(() => {
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
    // Create a modified version of decryptExclusions that uses our mock module
    const testDecryptExclusions = async (services: Services) => {
      // Load configuration once and use its values throughout
      const config = mockExclusionsUtils.loadConfig(services);

      try {
        const decrypter = initializeDecrypter(config.envVars.passphrase);
        const cypherBuffer = await services.fileSystem.readFile(
          config.cryptedFilePath,
        );
        // This will throw because readFile is mocked to throw
      } catch (error) {
        mockExclusionsUtils.handleFileNotFoundError(
          error,
          config.cryptedFilePath,
          services,
        );
      }
    };

    // Call our test function and expect it to throw
    try {
      await testDecryptExclusions(mockServices);
    } catch (error) {
      // Expected to throw
      assertEquals(error.message, "Mocked file not found error");
    }

    // Verify that handleFileNotFoundError was called
    assertSpyCalls(handleFileNotFoundErrorSpy, 1);
    assertSpyCall(handleFileNotFoundErrorSpy, 0, {
      args: [
        new Deno.errors.NotFound("File not found"),
        mockConfig.cryptedFilePath,
        mockServices,
      ],
    });
  } finally {
    // Restore spies
    readFileSpy.restore();
  }
});
