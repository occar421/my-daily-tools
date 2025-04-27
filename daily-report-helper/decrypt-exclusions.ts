import { Decrypter } from "age-encryption";
import { exists } from "jsr:@std/fs/exists";

/**
 * Application configuration information
 */
interface Config {
  inputFile: string;
  outputFile: string;
  envVars: {
    passphrase: string;
  };
}

/**
 * Load and validate environment settings
 */
function loadConfig(): Config {
  const inputFile = "exclusions.json5.age";
  const outputFile = inputFile.replace(".age", "");

  // Get and validate environment variables
  const passphrase = Deno.env.get("PASSPHRASE");
  if (!passphrase) {
    throw new Error("Environment variable 'PASSPHRASE' is not set");
  }

  return {
    inputFile,
    outputFile,
    envVars: {
      passphrase,
    },
  };
}

/**
 * Decrypt configuration file
 */
async function main() {
  try {
    // Load configuration once and use its values throughout
    const config = loadConfig();

    const decrypter = initializeDecrypter(config.envVars.passphrase);
    const cypherBuffer = await readInputFile(config.inputFile);
    const plainBuffer = await decrypter.decrypt(cypherBuffer);

    if (await shouldProceedWithWrite(config.outputFile)) {
      await writeOutputFile(config.outputFile, plainBuffer);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Initialize decryption tool
 */
function initializeDecrypter(passphrase: string): Decrypter {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  return decrypter;
}

/**
 * Read input file
 */
async function readInputFile(filePath: string): Promise<Uint8Array> {
  return await Deno.readFile(filePath);
}

/**
 * Check if output file should be written
 */
async function shouldProceedWithWrite(filePath: string): Promise<boolean> {
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
 * Write decrypted data to output file
 */
async function writeOutputFile(
  filePath: string,
  data: Uint8Array<ArrayBufferLike>,
): Promise<void> {
  await Deno.writeFile(filePath, data);
  console.log(`Decrypted file successfully saved: ${filePath}`);
}

/**
 * Handle errors appropriately
 */
function handleError(error: unknown): never {
  if (error instanceof Deno.errors.NotFound) {
    const config = loadConfig();
    console.error(`Error: File '${config.inputFile}' not found.`);
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

await main();
