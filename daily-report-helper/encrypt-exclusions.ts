import { Encrypter } from "age-encryption";
import {
  handleFileNotFoundError,
  loadConfig,
  parseExclusions,
  shouldProceedWithWrite,
} from "./exclusions-utils.ts";

/**
 * Encrypt configuration file
 */
async function main() {
  // Load configuration once and use its values throughout
  const config = loadConfig();

  try {
    const rawText = await Deno.readTextFile(config.rawFilePath);
    parseExclusions(rawText);

    const encrypter = initializeEncrypter(config.envVars.passphrase);
    const cipherBinary = await encrypter.encrypt(rawText);

    if (await shouldProceedWithWrite(config.cryptedFilePath)) {
      await Deno.writeFile(config.cryptedFilePath, cipherBinary);
      console.log(
        `Encrypted file successfully saved: ${config.cryptedFilePath}`,
      );
    }
  } catch (error) {
    handleFileNotFoundError(error, config.rawFilePath);
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

await main();
