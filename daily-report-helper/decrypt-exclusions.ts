import { Decrypter } from "age-encryption";
import {
  handleFileError,
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
    const cypherBuffer = await Deno.readFile(config.rawFilePath);
    const plainTextData = await decrypter.decrypt(cypherBuffer);

    if (await shouldProceedWithWrite(config.cryptedFilePath)) {
      await Deno.writeFile(config.cryptedFilePath, plainTextData);
      console.log(`File successfully saved: ${config.cryptedFilePath}`);
    }
  } catch (error) {
    handleFileError(error, config.rawFilePath);
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
