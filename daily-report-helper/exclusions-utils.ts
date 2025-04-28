import { Config, Exclusions, exclusionsSchema } from "./types.ts";
import JSON5 from "json5";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { Services } from "./services.ts";
import { getLogger } from "jsr:@std/log";

// Constant for the hour offset used for date calculations
const HOUR_OFFSET = 7;

const logger = getLogger();

/**
 * Validate and create a Date object from a date string
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object or undefined if dateStr is undefined
 */
function createDateFromString(dateStr?: string): Date | undefined {
  if (!dateStr) {
    return undefined;
  }

  // Validate that date string doesn't contain time components
  if (dateStr.includes("T") || dateStr.includes(":")) {
    throw new Error(`Date should only contain date (YYYY-MM-DD), not time`);
  }

  return new Date(dateStr);
}

/**
 * Convert a date string to epoch timestamp for start date
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Epoch timestamp or undefined if dateStr is undefined
 */
function getStartEpochFromDateString(dateStr?: string): number | undefined {
  const date = createDateFromString(dateStr);
  if (!date) {
    return undefined;
  }

  // For start date: set to HOUR_OFFSET:00:00.000
  date.setHours(HOUR_OFFSET, 0, 0, 0);
  return date.getTime();
}

/**
 * Convert a date string to epoch timestamp for end date
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Epoch timestamp or undefined if dateStr is undefined
 */
function getEndEpochFromDateString(dateStr?: string): number | undefined {
  const date = createDateFromString(dateStr);
  if (!date) {
    return undefined;
  }

  // For end date: set to next day at HOUR_OFFSET:00:00.000 minus 1ms
  date.setDate(date.getDate() + 1);
  date.setHours(HOUR_OFFSET, 0, 0, 0);
  return date.getTime() - 1; // Subtract 1ms to make it 06:59:59.999
}

/**
 * Parse date range from command line arguments
 * @param services Services for environment and user interaction
 * @returns Object containing start and end epoch timestamps
 * @throws Error if startDate is not provided
 */
function parseDateRangeFromArgs(
  services: Services,
): { startEpoch: number; endEpoch?: number } {
  // Parse command line arguments for start and end dates
  const args = parseArgs(services.environment.getArgs(), {
    string: ["startDate", "endDate"],
  });

  // Check if startDate is provided
  if (!args.startDate) {
    throw new Error(
      "startDate is required. Please provide a start date in YYYY-MM-DD format.",
    );
  }

  // Convert date strings to epoch timestamps using the specific functions
  const startEpoch = getStartEpochFromDateString(args.startDate);
  const endEpoch = getEndEpochFromDateString(args.endDate);

  // Ensure startEpoch is defined (this should always be true if args.startDate is provided)
  if (startEpoch === undefined) {
    throw new Error(
      "Failed to parse startDate. Please provide a valid date in YYYY-MM-DD format.",
    );
  }

  // Log the date range being used for filtering
  logger.info("Filtering records by date range:");
  // Use the original input date string instead of converting from epoch to avoid timezone issues
  const startDateStr = args.startDate;
  const startTimeStr = `${HOUR_OFFSET.toString().padStart(2, "0")}:00:00`;
  logger.info(
    `  Start date: ${startDateStr} (from ${startTimeStr})`,
  );

  if (endEpoch !== undefined && args.endDate) {
    // Use the original input date string instead of converting from epoch to avoid timezone issues
    const endDateStr = args.endDate;
    const prevHour = (HOUR_OFFSET - 1).toString().padStart(2, "0");
    const endTimeStr = `${prevHour}:59:59.999`;
    logger.info(
      `  End date: ${endDateStr} (until ${endTimeStr} of the next day)`,
    );
  }

  return {
    startEpoch,
    endEpoch,
  };
}

/**
 * Load and validate environment settings
 * @param services Services for environment and user interaction
 */
export function loadConfig(services: Services): Config {
  const rawFilePath = "exclusions.json5";
  const cryptedFilePath = `${rawFilePath}.age`;
  const passphrase = loadPassphrase(services);

  // Get date range from command line arguments
  const { startEpoch, endEpoch } = parseDateRangeFromArgs(services);

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
 * @param filePath Path to the file to check
 * @param services Services for file system and user interaction
 */
export async function shouldProceedWithWrite(
  filePath: string,
  services: Services,
): Promise<boolean> {
  if (await services.fileSystem.exists(filePath)) {
    logger.warn(`Warning: File '${filePath}' already exists.`);
    const shouldOverwrite = services.userInteraction.confirm(
      `Do you want to overwrite file '${filePath}'?`,
    );

    if (!shouldOverwrite) {
      logger.info(
        "Operation cancelled. File will not be overwritten.",
      );
      return false;
    }
    logger.info("Overwriting file...");
  }
  return true;
}

/**
 * Handle errors appropriately
 * @param error The error to handle
 * @param inputFile The file that caused the error
 * @param services Services for environment and user interaction
 */
export function handleFileNotFoundError(
  error: unknown,
  inputFile: string,
  services: Services,
): never {
  if (error instanceof Deno.errors.NotFound) {
    logger.error(`Error: File '${inputFile}' not found.`);
    return services.environment.exit(1);
  } else {
    logger.error(
      `Unexpected error occurred: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Load and validate passphrase from environment
 * @param services Services for environment access
 */
function loadPassphrase(services: Services): string {
  const passphrase = services.environment.getEnv("PASSPHRASE");
  if (!passphrase) {
    throw new Error("Environment variable 'PASSPHRASE' is not set");
  }
  return passphrase;
}

/**
 * Parse and validate exclusions data
 * @param rawText The raw JSON5 text to parse
 * @param services Services for environment and user interaction
 */
export function parseExclusions(
  rawText: string,
  services: Services,
): Exclusions {
  // Validate JSON5 data before encrypting
  try {
    const parsedJson = JSON5.parse(rawText);
    const parsedExclusions = exclusionsSchema.parse(parsedJson);
    logger.info("Exclusions data validation successful");
    return parsedExclusions;
  } catch (validationError) {
    logger.error(
      "Error validating exclusions data:",
      String(validationError),
    );
    return services.environment.exit(1);
  }
}
