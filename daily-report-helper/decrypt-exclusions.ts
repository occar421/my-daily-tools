import { Decrypter } from "age-encryption";
import {
  handleFileNotFoundError,
  loadConfig,
  shouldProceedWithWrite,
} from "./exclusions-utils.ts";
import { Services, createDefaultServices } from "./services.ts";

/**
 * Initialize decryption tool
 * @param passphrase The passphrase to use for decryption
 */
export function initializeDecrypter(passphrase: string): Decrypter {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  return decrypter;
}

/**
 * Decrypt configuration file
 * @param services Services for file system, environment, and user interaction
 */
export async function decryptExclusions(services: Services = createDefaultServices()) {
  // Load configuration once and use its values throughout
  const config = loadConfig(services);

  try {
    const decrypter = initializeDecrypter(config.envVars.passphrase);
    const cypherBuffer = await services.fileSystem.readFile(config.cryptedFilePath);
    const plainTextData = await decrypter.decrypt(cypherBuffer);

    if (await shouldProceedWithWrite(config.rawFilePath, services)) {
      await services.fileSystem.writeFile(config.rawFilePath, plainTextData);
      console.log(`File successfully saved: ${config.rawFilePath}`);
    }
  } catch (error) {
    handleFileNotFoundError(error, config.cryptedFilePath, services);
  }
}

// Only run the main function if this is the main module
if (import.meta.main) {
  await decryptExclusions();
}
