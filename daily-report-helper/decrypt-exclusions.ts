import { Decrypter } from "age-encryption";
import {
  handleFileNotFoundError,
  loadConfig,
  shouldProceedWithWrite,
} from "./exclusions-utils.ts";

/**
 * Decrypt configuration file
 */
async function main() {
  // Load configuration once and use its values throughout
  const config = loadConfig();

  try {
    const decrypter = initializeDecrypter(config.envVars.passphrase);
    const cypherBuffer = await Deno.readFile(config.cryptedFilePath);
    const plainTextData = await decrypter.decrypt(cypherBuffer);

    if (await shouldProceedWithWrite(config.rawFilePath)) {
      await Deno.writeFile(config.rawFilePath, plainTextData);
      console.log(`File successfully saved: ${config.rawFilePath}`);
    }
  } catch (error) {
    handleFileNotFoundError(error, config.cryptedFilePath);
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

await main();
