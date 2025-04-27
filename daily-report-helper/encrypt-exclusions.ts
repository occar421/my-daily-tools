import { Encrypter } from "age-encryption";
import {
  handleFileError,
  loadConfig,
  shouldProceedWithWrite,
} from "./exclusions-utils.ts";

/**
 * Encrypt configuration file
 */
async function main() {
  // Load configuration once and use its values throughout
  const config = loadConfig();

  try {
    const encrypter = initializeEncrypter(config.envVars.passphrase);
    const rawText = await Deno.readTextFile(config.rawFilePath);
    const cipherBinary = await encrypter.encrypt(rawText);

    if (await shouldProceedWithWrite(config.cryptedFilePath)) {
      await Deno.writeFile(config.cryptedFilePath, cipherBinary);
      console.log(
        `Decrypted file successfully saved: ${config.cryptedFilePath}`,
      );
    }
  } catch (error) {
    handleFileError(error, config.rawFilePath);
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
