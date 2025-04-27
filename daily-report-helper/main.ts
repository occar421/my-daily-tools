import { join, parse as parsePath } from "jsr:@std/path";
import JSON5 from "json5";
import { chromeHistoryCsvToRecord } from "./chromeHistoryCsvToRecord.ts";
import type { Config, Exclusions, ReportRecord } from "./types.ts";
import { loadConfig } from "./exclusions-utils.ts";
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
          ...chromeHistoryCsvToRecord(await Deno.readTextFile(path), exclusions),
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

async function getExclusions(config: Config): Promise<Exclusions> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(config.envVars.passphrase);

  const cypherBuffer = await Deno.readFile(config.cryptedFilePath);
  const plainTextData = await decrypter.decrypt(cypherBuffer);
  const text = new TextDecoder().decode(plainTextData);
  return JSON5.parse<Exclusions>(text);
}
