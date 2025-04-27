import { Encrypter } from "age-encryption";
import { 
  Config, 
  loadPassphrase, 
  readInputFileText, 
  shouldProceedWithWrite, 
  writeOutputFile as writeFile,
  handleError as handleFileError
} from "./fileUtils.ts";

/**
 * Load and validate environment settings
 */
function loadConfig(): Config {
  const inputFile = "exclusions.json5";
  const outputFile = `${inputFile}.age`;
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
 * Encrypt configuration file
 */
async function main() {
  try {
    // Load configuration once and use its values throughout
    const config = loadConfig();

    const encrypter = initializeEncrypter(config.envVars.passphrase);
    const plaintext = await readInputFileText(config.inputFile);
    const ciphertext = await encrypter.encrypt(plaintext);

    if (await shouldProceedWithWrite(config.outputFile)) {
      await writeEncryptedFile(config.outputFile, ciphertext);
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
 * Write encrypted data to output file with specific success message
 */
async function writeEncryptedFile(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  await writeFile(filePath, data);
  console.log(`Encrypted file successfully saved: ${filePath}`);
}

/**
 * Handle errors with specific context for encryption
 */
function handleError(error: unknown): never {
  const config = loadConfig();
  return handleFileError(error, config.inputFile);
}

await main();
