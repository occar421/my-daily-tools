import { loadConfig, parseExclusions } from "./utils.ts";
import { createDefaultServices, Services } from "./services.ts";
import { getLogger } from "jsr:@std/log";
import { Config } from "./types.ts";

const logger = getLogger();

/**
 * Encrypt configuration file
 */
export async function encryptExclusions(
  config: Config,
  services: Services,
) {
  const rawText = await services.fileSystem.readTextFile(config.rawFilePath);
  parseExclusions(rawText);

  const cipherBinary = await services.cryptoSystem.encrypt(rawText);

  await services.fileSystem.writeFile(config.cryptedFilePath, cipherBinary);
  logger.info(`Encrypted file successfully saved: ${config.cryptedFilePath}`);
}

// Only run the main function if this is the main module
if (import.meta.main) {
  const config = loadConfig();

  await encryptExclusions(
    config,
    createDefaultServices({
      crypto: { passphrase: config.envVars.passphrase },
    }),
  );
}
