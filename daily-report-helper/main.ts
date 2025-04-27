import { join, parse as parsePath } from "jsr:@std/path";
import { chromeHistoryCsvToRecord } from "./chromeHistoryCsvToRecord.ts";
import type { Config, Exclusions, ReportRecord } from "./types.ts";
import { loadConfig, parseExclusions } from "./exclusions-utils.ts";
import { Decrypter } from "age-encryption";

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

const filteredRecords = filterRecordsByEpochRange(
  uniqueRecords,
  config.startEpoch,
  config.endEpoch,
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
