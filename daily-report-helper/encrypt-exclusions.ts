import { Encrypter } from "age-encryption";
import { loadConfig, parseExclusions } from "./utils.ts";
import { createDefaultServices, Services } from "./services.ts";
import { getLogger } from "jsr:@std/log";

const logger = getLogger();

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
export async function encryptExclusions(
  services: Services,
) {
  // Load configuration once and use its values throughout
  const config = loadConfig();

  const rawText = await services.fileSystem.readTextFile(config.rawFilePath);
  parseExclusions(rawText);

  const encrypter = initializeEncrypter(config.envVars.passphrase);
  const cipherBinary = await encrypter.encrypt(rawText);

  await services.fileSystem.writeFile(config.cryptedFilePath, cipherBinary);
  logger.info(`Encrypted file successfully saved: ${config.cryptedFilePath}`);
}

// Only run the main function if this is the main module
if (import.meta.main) {
  await encryptExclusions(createDefaultServices());
}
