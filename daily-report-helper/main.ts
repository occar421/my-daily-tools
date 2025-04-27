import { join, parse as parsePath } from "jsr:@std/path";
import { chromeHistoryCsvToRecord } from "./chromeHistoryCsvToRecord.ts";
import type { ReportRecord } from "./types.ts";

const records: ReportRecord[] = [];

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
          ...chromeHistoryCsvToRecord(await Deno.readTextFile(path)),
        );
        break;
      default:
        continue;
    }

    console.log("Read file: ", parsedPath.base);
  }
}

records.sort((a, b) => a.epoch - b.epoch);

console.debug("Records: ", records);
