import { join, parse as parsePath } from "jsr:@std/path";
import { chromeHistoryCsvToRecord } from "./chromeHistoryCsvToRecord.ts";
import type { Config, Exclusions, ReportRecord } from "./types.ts";
import { loadConfig, parseExclusions } from "./exclusions-utils.ts";
import { Decrypter } from "age-encryption";
import { parse } from "jsr:@std/flags";

const records: ReportRecord[] = [];

const config = loadConfig();

const exclusions = await getExclusions(config);

const baseDir = join(import.meta.dirname ?? ".", "data");
for await (
  const entry of Deno.readDir(baseDir)
) {
  if (entry.isFile) {
    const path = join(baseDir, entry.name);
    const parsedPath = parsePath(path);

    switch (parsedPath.ext) {
      case ".csv":
        records.push(
          ...chromeHistoryCsvToRecord(
            await Deno.readTextFile(path),
            exclusions,
          ),
        );
        break;
      default:
        continue;
    }

    console.log("Read file: ", parsedPath.base);
  }
}

// Remove duplicate records (same epoch, title, and meta) using Map for O(n) complexity
const uniqueMap: Map<string, ReportRecord> = new Map();
for (const record of records) {
  // Create a unique key for each record
  const key = `${record.epoch}-${record.title}-${record.meta}`;
  // Only add to map if this key doesn't exist yet
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, record);
  }
}

// Convert map values back to array
const uniqueRecords = Array.from(uniqueMap.values());
uniqueRecords.sort((a, b) => a.epoch - b.epoch);

// Parse command line arguments for start and end dates
const args = parse(Deno.args, {
  string: ["start", "end"],
});

// Convert date strings to epoch timestamps (midnight UTC)
let startEpoch: number | undefined = undefined;
let endEpoch: number | undefined = undefined;

if (args.start) {
  const startDate = new Date(args.start);
  startEpoch = startDate.getTime();
}

if (args.end) {
  const endDate = new Date(args.end);
  // Set to end of day (23:59:59.999) to include the entire end date
  endDate.setHours(23, 59, 59, 999);
  endEpoch = endDate.getTime();
}

// Log the date range being used for filtering
if (startEpoch !== undefined || endEpoch !== undefined) {
  console.log("Filtering records by date range:");
  if (startEpoch !== undefined) {
    console.log("  Start date:", new Date(startEpoch).toISOString().split("T")[0]);
  }
  if (endEpoch !== undefined) {
    console.log("  End date:", new Date(endEpoch).toISOString().split("T")[0]);
  }
} else {
  console.log("No date range specified, showing all records.");
}

const filteredRecords = filterRecordsByEpochRange(
  uniqueRecords,
  startEpoch,
  endEpoch,
);

console.debug("Filtered Records: ", filteredRecords);

async function getExclusions(config: Config): Promise<Exclusions> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(config.envVars.passphrase);

  const cypherBuffer = await Deno.readFile(config.cryptedFilePath);
  const plainTextData = await decrypter.decrypt(cypherBuffer);
  const text = new TextDecoder().decode(plainTextData);

  return parseExclusions(text);
}

// Filter records by epoch range if start and end are provided
export function filterRecordsByEpochRange(
  records: ReportRecord[],
  startEpoch?: number,
  endEpoch?: number,
): ReportRecord[] {
  if (startEpoch === undefined && endEpoch === undefined) {
    return records;
  }

  return records.filter((record) => {
    const isAfterStart = startEpoch === undefined || record.epoch >= startEpoch;
    const isBeforeEnd = endEpoch === undefined || record.epoch <= endEpoch;
    return isAfterStart && isBeforeEnd;
  });
}
