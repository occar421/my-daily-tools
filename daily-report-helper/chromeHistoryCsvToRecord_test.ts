import { assertEquals } from "jsr:@std/assert";
import { chromeHistoryCsvToRecord } from "./chromeHistoryCsvToRecord.ts";
import type { Exclusions } from "./types.ts";

// Sample CSV data for testing
const sampleCsvHeader = "date,time,title,url,transition\n";

// Helper function to create a CSV row
function createCsvRow(
  date: string,
  time: string,
  title: string,
  url: string,
  transition: string
): string {
  return `${date},${time},${title},${url},${transition}\n`;
}

Deno.test("chromeHistoryCsvToRecord - basic parsing", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Test Page", "https://example.com", "link");

  const exclusions: Exclusions = {};
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Test Page");
  assertEquals(result[0].meta, "https://example.com");
  // Check that epoch is a number (exact value depends on timezone)
  assertEquals(typeof result[0].epoch, "number");
});

Deno.test("chromeHistoryCsvToRecord - skip reload transitions", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Test Page", "https://example.com", "reload") +
    createCsvRow("1/1/2023", "10:01:00", "Another Page", "https://example.org", "link");

  const exclusions: Exclusions = {};
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Another Page");
});

Deno.test("chromeHistoryCsvToRecord - skip empty titles", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "", "https://example.com", "link") +
    createCsvRow("1/1/2023", "10:01:00", "  ", "https://example.org", "link") +
    createCsvRow("1/1/2023", "10:02:00", "Valid Title", "https://example.net", "link");

  const exclusions: Exclusions = {};
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Valid Title");
});

Deno.test("chromeHistoryCsvToRecord - remove notification count from Notion titles", () => {
  const csvData = sampleCsvHeader +
    createCsvRow(
      "1/1/2023",
      "10:00:00",
      "(5) Notion Page",
      "https://www.notion.so/workspace/page-123",
      "link"
    );

  const exclusions: Exclusions = {};
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Notion Page");
});

Deno.test("chromeHistoryCsvToRecord - skip duplicate titles", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Test Page", "https://example.com", "link") +
    createCsvRow("1/1/2023", "10:01:00", "Test Page", "https://example.org", "link") +
    createCsvRow("1/1/2023", "10:02:00", "Another Page", "https://example.net", "link");

  const exclusions: Exclusions = {};
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 2);
  assertEquals(result[0].title, "Test Page");
  assertEquals(result[1].title, "Another Page");
});

Deno.test("chromeHistoryCsvToRecord - exclude by URL prefix", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Excluded Page", "https://excluded.com/page", "link") +
    createCsvRow("1/1/2023", "10:01:00", "Included Page", "https://example.com/page", "link");

  const exclusions: Exclusions = {
    urlPrefixes: ["https://excluded.com"]
  };
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Included Page");
});

Deno.test("chromeHistoryCsvToRecord - exclude by URL contains", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Excluded Page", "https://example.com/excluded/page", "link") +
    createCsvRow("1/1/2023", "10:01:00", "Included Page", "https://example.com/included/page", "link");

  const exclusions: Exclusions = {
    urlContains: ["/excluded/"]
  };
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Included Page");
});

Deno.test("chromeHistoryCsvToRecord - exclude by Notion ID", () => {
  const csvData = sampleCsvHeader +
    createCsvRow(
      "1/1/2023",
      "10:00:00",
      "Excluded Notion Page",
      "https://www.notion.so/workspace/Excluded-1234567890abcdef1234567890abcdef",
      "link"
    ) +
    createCsvRow(
      "1/1/2023",
      "10:01:00",
      "Included Notion Page",
      "https://www.notion.so/workspace/Included-abcdef1234567890abcdef1234567890",
      "link"
    );

  const exclusions: Exclusions = {
    notionIds: ["1234567890abcdef1234567890abcdef"]
  };
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Included Notion Page");
});

Deno.test("chromeHistoryCsvToRecord - exclude by title contains", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Private Page", "https://example.com/page1", "link") +
    createCsvRow("1/1/2023", "10:01:00", "Public Page", "https://example.com/page2", "link");

  const exclusions: Exclusions = {
    titleContains: ["Private"]
  };
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Public Page");
});

Deno.test("chromeHistoryCsvToRecord - handle invalid date format", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("invalid", "10:00:00", "Invalid Date", "https://example.com/page1", "link") +
    createCsvRow("1/1/2023", "10:01:00", "Valid Date", "https://example.com/page2", "link");

  // Mock console.error
  const originalConsoleError = console.error;
  const errorMessages: string[] = [];
  console.error = (...args: unknown[]) => {
    errorMessages.push(args.join(" "));
  };

  try {
    const exclusions: Exclusions = {};
    const result = chromeHistoryCsvToRecord(csvData, exclusions);

    assertEquals(result.length, 1);
    assertEquals(result[0].title, "Valid Date");
    assertEquals(errorMessages.length, 1);
    assertEquals(errorMessages[0].includes("Invalid date format"), true);
  } finally {
    // Restore console.error
    console.error = originalConsoleError;
  }
});

Deno.test("chromeHistoryCsvToRecord - multiple exclusion rules", () => {
  const csvData = sampleCsvHeader +
    createCsvRow("1/1/2023", "10:00:00", "Private Page", "https://excluded.com/page", "link") +
    createCsvRow("1/1/2023", "10:01:00", "Secret Page", "https://example.com/secret", "link") +
    createCsvRow(
      "1/1/2023",
      "10:02:00",
      "Notion Secret",
      "https://www.notion.so/workspace/Secret-1234567890abcdef1234567890abcdef",
      "link"
    ) +
    createCsvRow("1/1/2023", "10:03:00", "Public Page", "https://example.com/public", "link");

  const exclusions: Exclusions = {
    urlPrefixes: ["https://excluded.com"],
    urlContains: ["/secret"],
    notionIds: ["1234567890abcdef1234567890abcdef"],
    titleContains: ["Private"]
  };
  const result = chromeHistoryCsvToRecord(csvData, exclusions);

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Public Page");
});
