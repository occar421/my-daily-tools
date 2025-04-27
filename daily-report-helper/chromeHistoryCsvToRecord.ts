import { parse as parseCsv } from "jsr:@std/csv";
import type { ReportRecord } from "./types.ts";

const LOOK_BACK_RECORDS = 10;
const LOOK_BACK_RANGE = [...Array(LOOK_BACK_RECORDS).keys()].map((x) => x + 1);

/**
 * Function to create records from CSV text
 * @param text CSV text
 * @returns Array of extracted Record type objects
 */
export function chromeHistoryCsvToRecord(text: string): ReportRecord[] {
  const records: ReportRecord[] = [];

  const csv: Record<"date" | "time" | "title" | "url", string>[] = parseCsv(
    text,
    {
      skipFirstRow: true,
      strip: true,
    },
  );

  for (const row of csv) {
    // Skip if title is empty
    if (row.title.trim() === "") {
      continue;
    }

    let title = row.title.trim();
    // Remove notification count from Notion titles
    if (row.url.startsWith("https://www.notion.so/")) {
      title = row.title.replace(/^\((\d+\+?)\)\s/, "");
    }

    // Skip Slack (records are incomplete)
    if (row.url.includes(".slack.com")) {
      continue;
    }

    // Skip if title is the same as a recent one
    if (
      LOOK_BACK_RANGE.some((x) =>
        records.at(-x)?.title.toUpperCase() === title.toUpperCase()
      )
    ) {
      continue;
    }

    // Skip Google Meet (can be supplemented by calendar)
    if (row.url.startsWith("https://meet.google.com/")) {
      continue;
    }

    // Skip X
    if (row.url.startsWith("https://x.com/")) {
      continue;
    }

    // Skip navigation within Google Calendar
    if (
      row.url.startsWith("https://calendar.google.com/calendar") &&
      (LOOK_BACK_RANGE.some((x) =>
        records.at(-x)?.meta.startsWith(
          "https://calendar.google.com/calendar",
        )
      ))
    ) {
      continue;
    }

    // Skip redirects
    if (row.url.startsWith("https://www.google.com/url")) {
      continue;
    }

    // Skip Google Keep
    if (row.url.startsWith("https://keep.google.com/")) {
      continue;
    }

    // Skip Scrapbox (counted in Firefox)
    if (row.url.startsWith("https://scrapbox.io/")) {
      continue;
    }

    // Skip GitHub
    if (row.url.startsWith("https://github.com/")) {
      continue;
    }

    // Skip GTD
    if (row.url.includes("17331669571280f28638e7aa1ca78021")) {
      continue;
    }

    const notionMatch = row.url.match(
      /https:\/\/www.notion.so\/.*?[\-\/]([0-9a-f]{32})/,
    );
    if (notionMatch) {
      const notionId = notionMatch[1];
      if (
        LOOK_BACK_RANGE.some((x) => records.at(-x)?.meta.includes(notionId))
      ) {
        continue;
      }
    }

    // Skip notes
    if (
      [
        "8939b3782f014b7aa4b4748683ff686d",
        "641c5b2213924efb932de9d8da62e4f0",
        "41612fa22e19450385ca88138de0ec4c",
        "42159aef09234dbaa984ae6f9592c3aa",
        "1ad316695712805098ebe3d7c91fefe8",
        "13d316695712809bb635f53ffdaf2117",
        "51165ebaf0bd41218ea4cf48b3c6fb81",
        "e4319b8d4e9144bcacbe5f67295494cd",
      ]
        .some((id) => row.url.includes(id))
    ) {
      continue;
    }

    // Skip Looker
    if (
      row.url.includes(".cloud.looker.com") ||
      row.url.includes("https://lookerstudio.google.com/")
    ) {
      continue;
    }

    // Skip Salesforce
    if (title.endsWith("| Salesforce")) {
      continue;
    }

    // Skip Vivaldi
    if (row.url.includes("vivaldi.")) {
      continue;
    }

    // Skip searches
    if (row.url.startsWith("https://www.google.com/search?")) {
      continue;
    }

    // Skip login pages
    if (
      row.url.startsWith("https://login.microsoftonline.com/") ||
      row.url.startsWith("https://accounts.google.com/v3/signin") ||
      row.url.startsWith("https://accounts.google.com/o/oauth2/") ||
      row.url.startsWith("https://mysignins.microsoft.com/") ||
      row.url.includes(".smarthr.jp/login")
    ) {
      continue;
    }

    // Skip meeting minutes
    if (
      [
        "14c3166957128005aba0d72f3329b7b6",
        "135316695712807c9616ceecf9f58ea0",
        "13f31669571280c0a5dffa3f82d43601",
        "a11a734b78784a5cb5b41474e4febbdd",
        "1cf316695712800eb2b0d1b352d753b2",
        "a953386776044551a22c18c8360c2521",
        "1a8316695712809caf67dcd49930d8f8",
        "1c731669571280ca833ad06b242ee078",
      ]
        .some((id) => row.url.includes(id)) ||
      []
        .some((id) => row.title.includes(id))
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
        console.error(`Invalid date format: ${row.date} ${row.time}`);
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
      });
    } catch (error) {
      console.error(`Date conversion error: ${row.date} ${row.time}`, error);
    }
  }

  return records;
}
