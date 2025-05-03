import { Config, Exclusions, exclusionsSchema, ReportRecord } from "./types.ts";
import JSON5 from "json5";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { getLogger } from "jsr:@std/log";

// Constant for the hour offset used for date calculations
const HOUR_OFFSET = 7;

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
 * @param cmdArgs Command line arguments
 * @returns Object containing start and end epoch timestamps
 * @throws Error if startDate is not provided
 */
export function parseDateRangeFromArgs(
  cmdArgs: string[],
): { startEpoch: number; endEpoch?: number } {
  const logger = getLogger();

  // Parse command line arguments for start and end dates
  const args = parseArgs(cmdArgs, {
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
 * @privateRemarks This function needs to be tested.
 */
export function loadConfig(): Config {
  const rawFilePath = "exclusions.json5";
  const cryptedFilePath = `${rawFilePath}.age`;
  const passphrase = loadPassphraseFromEnv();

  // Get date range from command line arguments
  const { startEpoch, endEpoch } = parseDateRangeFromArgs(
    Deno.args,
  );

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
 * Load and validate passphrase from environment
 */
function loadPassphraseFromEnv(): string {
  const passphrase = Deno.env.get("PASSPHRASE");
  if (!passphrase) {
    throw new Error("Environment variable 'PASSPHRASE' is not set");
  }
  return passphrase;
}

/**
 * Parse and validate exclusions data
 * @param rawText The raw JSON5 text to parse
 */
export function parseExclusions(
  rawText: string,
): Exclusions {
  const logger = getLogger();

  const parsedJson = JSON5.parse(rawText);
  const parsedExclusions = exclusionsSchema.parse(parsedJson);
  logger.info("Exclusions data validation successful");
  return parsedExclusions;
}

/**
 * レコードをHOUR_OFFSETを考慮して日付ごとのチャンクに分割する
 * @param records フィルタリングされたレコードの配列
 * @returns 日付ごとにグループ化されたレコードのマップ（キーは日付文字列 YYYY-MM-DD）
 */
export function splitRecordsByDay(
  records: ReportRecord[],
): Map<string, ReportRecord[]> {
  const logger = getLogger();

  const recordsByDay = new Map<string, ReportRecord[]>();

  for (const record of records) {
    // エポックからローカル日付を作成
    const date = new Date(record.epoch - HOUR_OFFSET * 60 * 60 * 1000);

    // 日付文字列を YYYY-MM-DD 形式で作成
    const dateString = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replaceAll("/", "-");

    logger.debug(
      `Processing record: ${date} ${dateString} ${record.epoch} ${record.title} (${record.meta})`,
    );

    // その日付のエントリーがまだ存在しない場合は作成
    if (!recordsByDay.has(dateString)) {
      recordsByDay.set(dateString, []);
    }

    // レコードを対応する日付のリストに追加
    recordsByDay.get(dateString)?.push(record);
  }

  return recordsByDay;
}
