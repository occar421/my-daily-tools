import { exists } from "jsr:@std/fs/exists";

/**
 * Application configuration information
 */
export interface Config {
  rawFilePath: string;
  cryptedFilePath: string;
  envVars: {
    passphrase: string;
  };
}

/**
 * Load and validate environment settings
 */
export function loadConfig(): Config {
  const rawFilePath = "exclusions.json5";
  const cryptedFilePath = `${rawFilePath}.age`;
  const passphrase = loadPassphrase();

  return {
    rawFilePath,
    cryptedFilePath,
    envVars: {
      passphrase,
    },
  };
}

/**
 * Check if output file should be written
 */
export async function shouldProceedWithWrite(
  filePath: string,
): Promise<boolean> {
  if (await exists(filePath)) {
    console.warn(`Warning: File '${filePath}' already exists.`);
    const shouldOverwrite = confirm(
      `Do you want to overwrite file '${filePath}'?`,
    );

    if (!shouldOverwrite) {
      console.log("Operation cancelled. File will not be overwritten.");
      return false;
    }
    console.log("Overwriting file...");
  }
  return true;
}

/**
 * Handle errors appropriately
 */
export function handleFileNotFoundError(error: unknown, inputFile: string): never {
  if (error instanceof Deno.errors.NotFound) {
    console.error(`Error: File '${inputFile}' not found.`);
    Deno.exit(1);
  } else {
    console.error(
      `Unexpected error occurred: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Load and validate passphrase from environment
 */
export function loadPassphrase(): string {
  const passphrase = Deno.env.get("PASSPHRASE");
  if (!passphrase) {
    throw new Error("Environment variable 'PASSPHRASE' is not set");
  }
  return passphrase;
}
