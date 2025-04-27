import { Encrypter } from "age-encryption";
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
  const inputFile = "exclusions.json5";
  const outputFile = `${inputFile}.age`;

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
 * Encrypt configuration file
 */
async function main() {
  try {
    // Load configuration once and use its values throughout
    const config = loadConfig();

    const encrypter = initializeEncrypter(config.envVars.passphrase);
    const plaintext = await readInputFile(config.inputFile);
    const ciphertext = await encrypter.encrypt(plaintext);

    if (await shouldProceedWithWrite(config.outputFile)) {
      await writeOutputFile(config.outputFile, ciphertext);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Initialize encryption tool
 */
function initializeEncrypter(passphrase: string): Encrypter {
  const encrypter = new Encrypter();
  encrypter.setPassphrase(passphrase);
  return encrypter;
}

/**
 * Read input file
 */
async function readInputFile(filePath: string): Promise<string> {
  const buffer = await Deno.readFile(filePath);
  return new TextDecoder().decode(buffer);
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
 * Write encrypted data to output file
 */
async function writeOutputFile(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  await Deno.writeFile(filePath, data);
  console.log(`Encrypted file successfully saved: ${filePath}`);
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
