import { exists } from "jsr:@std/fs/exists";
import { Config, Exclusions, exclusionsSchema } from "./types.ts";
import JSON5 from "json5";
import { parseArgs } from "jsr:@std/cli/parse-args";

/**
 * Load and validate environment settings
 */
export function loadConfig(): Config {
  const rawFilePath = "exclusions.json5";
  const cryptedFilePath = `${rawFilePath}.age`;
  const passphrase = loadPassphrase();

  // Parse command line arguments for start and end dates
  const args = parseArgs(Deno.args, {
    string: ["startDate", "endDate"],
  });

  // Convert date strings to epoch timestamps
  let startEpoch: number | undefined = undefined;
  let endEpoch: number | undefined = undefined;

  if (args.startDate) {
    const startDate = new Date(args.startDate);
    startEpoch = startDate.getTime();
  }

  if (args.endDate) {
    const endDate = new Date(args.endDate);
    // Set to end of day (23:59:59.999) to include the entire end date
    endDate.setHours(23, 59, 59, 999);
    endEpoch = endDate.getTime();
  }

  // Log the date range being used for filtering
  if (startEpoch !== undefined || endEpoch !== undefined) {
    console.log("Filtering records by date range:");
    if (startEpoch !== undefined) {
      console.log(
        "  Start date:",
        new Date(startEpoch).toISOString().split("T")[0],
      );
    }
    if (endEpoch !== undefined) {
      console.log(
        "  End date:",
        new Date(endEpoch).toISOString().split("T")[0],
      );
    }
  } else {
    console.log("No date range specified, showing all records.");
  }

  return {
    rawFilePath,
    cryptedFilePath,
    envVars: {
      passphrase,
    },
    startEpoch,
    endEpoch,
  };
}

/**
 * Check if output file should be written
 */
export async function shouldProceedWithWrite(
  filePath: string,
): Promise<boolean> {
  if (await exists(filePath)) {
    console.warn(`Warning: File '${filePath}' already exists.`);
    const shouldOverwrite = confirm(
      `Do you want to overwrite file '${filePath}'?`,
    );

    if (!shouldOverwrite) {
      console.log("Operation cancelled. File will not be overwritten.");
      return false;
    }
    console.log("Overwriting file...");
  }
  return true;
}

/**
 * Handle errors appropriately
 */
export function handleFileNotFoundError(
  error: unknown,
  inputFile: string,
): never {
  if (error instanceof Deno.errors.NotFound) {
    console.error(`Error: File '${inputFile}' not found.`);
    Deno.exit(1);
  } else {
    console.error(
      `Unexpected error occurred: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Load and validate passphrase from environment
 */
export function loadPassphrase(): string {
  const passphrase = Deno.env.get("PASSPHRASE");
  if (!passphrase) {
    throw new Error("Environment variable 'PASSPHRASE' is not set");
  }
  return passphrase;
}

export function parseExclusions(rawText: string): Exclusions {
  // Validate JSON5 data before encrypting
  try {
    const parsedJson = JSON5.parse(rawText);
    const parsedExclusions = exclusionsSchema.parse(parsedJson);
    console.log("Exclusions data validation successful");
    return parsedExclusions;
  } catch (validationError) {
    console.error("Error validating exclusions data:", validationError);
    Deno.exit(1);
  }
}
