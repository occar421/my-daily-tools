import { loadConfig } from "./utils.ts";
import { createDefaultServices, Services } from "./services.ts";
import { getLogger } from "jsr:@std/log";
import { Config } from "./types.ts";

/**
 * Decrypt configuration file
 */
export async function decryptExclusions(config: Config, services: Services) {
  const logger = getLogger();

  const cypherBuffer = await services.fileSystem.readFile(
    config.cryptedFilePath,
  );
  const plainTextData = await services.cryptoSystem.decrypt(cypherBuffer);

  await services.fileSystem.writeFile(config.rawFilePath, plainTextData);
  logger.info(`File successfully saved: ${config.rawFilePath}`);
}

// Only run the main function if this is the main module
if (import.meta.main) {
  const config = loadConfig();

  await decryptExclusions(
    config,
    createDefaultServices({
      crypto: { passphrase: config.envVars.passphrase },
    }),
  );
}
