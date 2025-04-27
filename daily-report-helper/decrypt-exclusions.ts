import { Decrypter } from "age-encryption";
import { 
  Config, 
  loadPassphrase, 
  readInputFileBinary, 
  shouldProceedWithWrite, 
  writeOutputFile as writeFile,
  handleError as handleFileError
} from "./fileUtils.ts";

/**
 * Load and validate environment settings
 */
function loadConfig(): Config {
  const inputFile = "exclusions.json5.age";
  const outputFile = inputFile.replace(".age", "");
  const passphrase = loadPassphrase();

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
    const cypherBuffer = await readInputFileBinary(config.inputFile);
    const plainBuffer = await decrypter.decrypt(cypherBuffer);

    if (await shouldProceedWithWrite(config.outputFile)) {
      await writeDecryptedFile(config.outputFile, plainBuffer);
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
 * Write decrypted data to output file with specific success message
 */
async function writeDecryptedFile(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  await writeFile(filePath, data);
  console.log(`Decrypted file successfully saved: ${filePath}`);
}

/**
 * Handle errors with specific context for decryption
 */
function handleError(error: unknown): never {
  const config = loadConfig();
  return handleFileError(error, config.inputFile);
}

await main();
