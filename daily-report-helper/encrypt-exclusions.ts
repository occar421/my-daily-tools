import { Encrypter } from "age-encryption";
import {
  handleFileNotFoundError,
  loadConfig,
  parseExclusions,
  shouldProceedWithWrite,
} from "./exclusions-utils.ts";
import { Services, createDefaultServices } from "./services.ts";

/**
 * Initialize encryption tool
 * @param passphrase The passphrase to use for encryption
 */
export function initializeEncrypter(passphrase: string): Encrypter {
  const encrypter = new Encrypter();
  encrypter.setPassphrase(passphrase);
  return encrypter;
}

/**
 * Encrypt configuration file
 * @param services Services for file system, environment, and user interaction
 */
export async function encryptExclusions(services: Services = createDefaultServices()) {
  // Load configuration once and use its values throughout
  const config = loadConfig(services);

  try {
    const rawText = await services.fileSystem.readTextFile(config.rawFilePath);
    parseExclusions(rawText, services);

    const encrypter = initializeEncrypter(config.envVars.passphrase);
    const cipherBinary = await encrypter.encrypt(rawText);

    if (await shouldProceedWithWrite(config.cryptedFilePath, services)) {
      await services.fileSystem.writeFile(config.cryptedFilePath, cipherBinary);
      console.log(`Encrypted file successfully saved: ${config.cryptedFilePath}`);
    }
  } catch (error) {
    handleFileNotFoundError(error, config.rawFilePath, services);
  }
}

// Only run the main function if this is the main module
if (import.meta.main) {
  await encryptExclusions();
}
