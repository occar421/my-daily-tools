import { exists } from "jsr:@std/fs/exists";

/**
 * Application configuration information
 */
export interface Config {
  inputFile: string;
  outputFile: string;
  envVars: {
    passphrase: string;
  };
}

/**
 * Read input file as binary data
 */
export async function readInputFileBinary(filePath: string): Promise<Uint8Array> {
  return await Deno.readFile(filePath);
}

/**
 * Read input file as text
 */
export async function readInputFileText(filePath: string): Promise<string> {
  const buffer = await Deno.readFile(filePath);
  return new TextDecoder().decode(buffer);
}

/**
 * Check if output file should be written
 */
export async function shouldProceedWithWrite(filePath: string): Promise<boolean> {
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
 * Write data to output file
 */
export async function writeOutputFile(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  await Deno.writeFile(filePath, data);
  console.log(`File successfully saved: ${filePath}`);
}

/**
 * Handle errors appropriately
 */
export function handleError(error: unknown, inputFile: string): never {
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