import { parse as parseCsv } from "jsr:@std/csv";
import { getLogger } from "jsr:@std/log";
import type { Exclusions, ReportRecord } from "./types.ts";

const LOOK_BACK_RECORDS = 1;
const LOOK_BACK_RANGE = [...Array(LOOK_BACK_RECORDS).keys()].map((x) => x + 1);

/**
 * Function to create records from CSV text
 * @param text CSV text
 * @param exclusions Configuration object containing patterns and rules for excluding records
 * @returns Array of extracted Record type objects
 */
export function chromeHistoryCsvToRecord(
  text: string,
  exclusions: Exclusions,
): ReportRecord[] {
  const logger = getLogger();

  const records: ReportRecord[] = [];

  const csv: Record<
    "date" | "time" | "title" | "url" | "transition",
    string
  >[] = parseCsv(
    text,
    {
      skipFirstRow: true,
      strip: true,
    },
  );

  for (const row of csv) {
    if (row.transition === "reload") {
      continue;
    }

    // Skip if title is empty
    if (row.title.trim() === "") {
      continue;
    }

    let title = row.title.trim();
    // Remove notification count from Notion titles
    if (row.url.startsWith("https://www.notion.so/")) {
      title = row.title.replace(/^\((\d+\+?)\)\s/, "");
    }

    // Skip if title is the same as a recent one
    if (
      LOOK_BACK_RANGE.some((x) =>
        normalize(records.at(-x)?.title) === normalize(title)
      )
    ) {
      continue;
    }

    // Skip based on URL prefixes from exclusions
    if (exclusions.urlPrefixes?.some((prefix) => row.url.startsWith(prefix))) {
      continue;
    }

    // Skip based on URL substrings from exclusions
    if (exclusions.urlContains?.some((prefix) => row.url.includes(prefix))) {
      continue;
    }

    // Check for Notion IDs
    const notionMatch = row.url.match(
      /https:\/\/www.notion.so\/.*?-?([0-9a-f]{32})/,
    );
    if (notionMatch) {
      const notionId = notionMatch[1];
      // Skip if this Notion ID is in exclusions
      if (
        exclusions.notionIds?.includes(notionId)
      ) {
        continue;
      }
      // Skip if we've seen this Notion page recently
      if (
        LOOK_BACK_RANGE.some((x) => records.at(-x)?.meta.includes(notionId))
      ) {
        continue;
      }
    }

    // Skip if the Notion title matches any of the exclusion patterns
    if (
      exclusions.titleContains?.some((pattern) =>
        normalize(title).includes(normalize(pattern))
      )
    ) {
      continue;
    }

    try {
      // Calculate epoch time from date and time
      // us order
      const [month, day, year] = row.date.split("/").map(Number);
      const [hour, minute, second] = row.time.split(":").map(Number);

      if (
        isNaN(year) || isNaN(month) || isNaN(day) ||
        isNaN(hour) || isNaN(minute) || isNaN(second)
      ) {
        logger.error(`Invalid date format: ${row.date} ${row.time}`);
        continue;
      }

      // JavaScript months start from 0, so subtract 1 from the month
      const dateObj = new Date(year, month - 1, day, hour, minute, second);
      const epoch = dateObj.getTime();

      // Create Record object and add it to the array
      records.push({
        epoch,
        title,
        meta: row.url,
        source: "Browser",
      });
    } catch (error) {
      logger.error(`Date conversion error: ${row.date} ${row.time}`, error);
    }
  }

  return records;
}

function normalize(text: string | undefined): string {
  return text?.replace(/[\uE000-\uF8FF]/g, "").toUpperCase() ?? "";
}
