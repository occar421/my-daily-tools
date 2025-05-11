import { join, parse as parsePath } from "jsr:@std/path";
import { ConsoleHandler, getLogger, setup } from "jsr:@std/log";
import { browserHistoryCsvToRecord } from "./browserHistoryCsvToRecord.ts";
import {
  BrowserReportRecord,
  CalendarReportRecord,
  Config,
  Exclusions,
  ReportRecord,
  SlackReportRecord,
} from "./types.ts";
import {
  loadConfig,
  loadParams,
  parseExclusions,
  splitRecordsByDay,
} from "./utils.ts";
import { Decrypter } from "age-encryption";
import { createDefaultServices } from "./services.ts";
import { slackMessageCsvToRecord } from "./slackMessageCsvToRecord.ts";
import { calendarEventsCsvToRecord } from "./calendarEventsCsvToRecord.ts";
import { BrowserHistoryCsvConverter } from "./BrowserHistoryCsvConverter.ts";
import { SlackMessageCsvConverter } from "./SlackMessageCsvConverter.ts";
import { CalendarEventsCsvConverter } from "./CalendarEventsCsvConverter.ts";

// Configure logging
setup({
  handlers: {
    default: new ConsoleHandler("DEBUG"),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["default"],
    },
  },
});

const logger = getLogger();

const config = loadConfig();
const params = loadParams();

const services = createDefaultServices({
  crypto: { passphrase: config.envVars.passphrase },
});

const exclusions = await getExclusions(config);
const baseDir = join(import.meta.dirname ?? ".", "data");

const records: ReportRecord[] = [];
let fileCount = 0;

for await (
  const entry of Deno.readDir(baseDir)
) {
  if (entry.isFile) {
    const path = join(baseDir, entry.name);
    const parsedPath = parsePath(path);

    if (parsedPath.name.startsWith("history")) {
      const text = await services.fileSystem.readTextFile(path);
      fileCount++;

      const browserConverter = new BrowserHistoryCsvConverter();
      const browserRecords = browserConverter.convert(text);

      records.push(
        ...browserRecords,
      );

      logger.info(`Read file as browser history: ${parsedPath.base}`);
    } else if (parsedPath.name.startsWith("slack_messages")) {
      const text = await services.fileSystem.readTextFile(path);
      fileCount++;

      const slackConverter = new SlackMessageCsvConverter();
      const slackRecords = slackConverter.convert(text);

      records.push(
        ...slackRecords,
      );

      logger.info(`Read file as slack: ${parsedPath.base}`);
    } else if (parsedPath.name.startsWith("calendar_events")) {
      const text = await services.fileSystem.readTextFile(path);
      fileCount++;
      const calendarConverter = new CalendarEventsCsvConverter();
      const calendarRecords = calendarConverter.convert(text);
      records.push(
        ...calendarRecords,
      );

      logger.info(`Read file as calendar: ${parsedPath.base}`);
    }
  }
}
logger.info(`合計${fileCount}個のファイルを読み込みました`);

const filteredRecords = filterRecordsByEpochRange(
  records,
  params.startEpoch,
  params.endEpoch,
);

const excludedRecords = [];

for (const record of filteredRecords) {
  if (record instanceof BrowserReportRecord) {
    // Skip based on URL prefixes from exclusions
    if (
      exclusions.urlPrefixes?.some((prefix) => record.url.startsWith(prefix))
    ) {
      continue;
    }

    // Skip based on URL substrings from exclusions
    if (exclusions.urlContains?.some((prefix) => record.url.includes(prefix))) {
      continue;
    }

    // // Check for Notion IDs
    const notionMatch = record.url.match(
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
    }

    // Skip if the title matches any of the exclusion patterns
    if (
      exclusions.titleContains?.some((pattern) =>
        normalize(record.title).includes(normalize(pattern))
      )
    ) {
      continue;
    }

    excludedRecords.push(record);
  } else if (record instanceof SlackReportRecord) {
    if (record.channel.startsWith("times-")) {
      continue;
    }

    // slackMessagesの条件によって除外
    if (
      exclusions.slackMessages?.some((item) =>
        item.channel === record.channel &&
        item.message.some((pattern) => record.message.includes(pattern))
      )
    ) {
      continue;
    }

    excludedRecords.push(record);
  } else if (record instanceof CalendarReportRecord) {
    if (
      !exclusions.notCalendarNames?.some((name) => name === record.calendarName)
    ) {
      continue;
    }

    excludedRecords.push(record);
  } else {
    logger.error(`Unknown record type: ${record}`);
  }
}

// レコードを日付ごとに分割
const recordsByDay = splitRecordsByDay(excludedRecords);

const distinctRecordsByDay = new Map<string, ReportRecord[]>();

for (const [date, records] of recordsByDay.entries()) {
  const map = new Map<string, ReportRecord>();
  for (const record of records) {
    if (map.has(record.keyInDay())) {
      continue;
    }
    map.set(record.keyInDay(), record);
  }

  distinctRecordsByDay.set(
    date,
    [...map.values()].sort((a, b) => a.epoch - b.epoch),
  );
}

function formatRecordsToMarkdown(
  date: string,
  records: ReportRecord[],
): string {
  const content = [`# Daily Report - ${date}\n`];

  for (const record of records) {
    const time = new Date(record.epoch).toLocaleTimeString("ja-JP");

    if (record instanceof BrowserReportRecord) {
      content.push(`- ${time} - Browser  `);
      content.push(`  ${record.title}  `);
      content.push(`  ${record.url}`);
    } else if (record instanceof SlackReportRecord) {
      content.push(`- ${time} - Slack #${record.channel}  `);
      content.push(...record.message.split("\n").map((line) => `  ${line}`));
    } else if (record instanceof CalendarReportRecord) {
      const hours = Math.floor(record.duration / (60 * 60 * 1000));
      const minutes = Math.floor(
        (record.duration % (60 * 60 * 1000)) / (60 * 1000),
      );
      const durationStr = hours > 0
        ? minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
        : `${minutes}m`;

      content.push(`- ${time} (${durationStr}) - Calendar  `);
      content.push(`  ${record.title}  `);
    } else {
      logger.error(`Unknown record type: ${record}`);
    }

    content.push("");
  }

  return content.join("\n");
}

logger.info(`レコードを${recordsByDay.size}日分に分割しました`);
for (const [date, records] of distinctRecordsByDay.entries()) {
  const content = formatRecordsToMarkdown(date, records);
  const filePath = join(import.meta.dirname ?? ".", "out", `daily report ${date}.md`);
  await services.fileSystem.writeTextFile(filePath, content);
  logger.info(`${date}: ${records.length} レコード`);
}

async function getExclusions(config: Config): Promise<Exclusions> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(config.envVars.passphrase);

  const cypherBuffer = await services.fileSystem.readFile(
    config.cryptedFilePath,
  );
  const plainTextData = await decrypter.decrypt(cypherBuffer);
  const text = new TextDecoder().decode(plainTextData);

  return parseExclusions(text);
}

// Filter records by epoch range (startEpoch is required, endEpoch is optional)
export function filterRecordsByEpochRange(
  records: ReportRecord[],
  startEpoch: number,
  endEpoch?: number,
): ReportRecord[] {
  return records.filter((record) => {
    const isAfterStart = record.epoch >= startEpoch;
    const isBeforeEnd = endEpoch === undefined || record.epoch <= endEpoch;
    return isAfterStart && isBeforeEnd;
  });
}

function normalize(text: string | undefined): string {
  return text?.replace(/[\uE000-\uF8FF]/g, "").toUpperCase() ?? "";
}
