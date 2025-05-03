import { getLogger } from "jsr:@std/log";
import type { ReportRecord } from "./types.ts";

export function slackMessageCsvToRecord(
  text: string,
): ReportRecord[] {
  const logger = getLogger();

  const records: ReportRecord[] = [];

  // TODO implement

  return records;
}
