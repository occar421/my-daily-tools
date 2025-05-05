import { z } from "zod";

abstract class ReportRecordBase {
  epoch: number;

  protected constructor(epoch: number) {
    this.epoch = epoch;
  }

  abstract dump(): string;
  abstract keyInDay(): string;
}

export class BrowserReportRecord extends ReportRecordBase {
  title: string;
  url: string;

  constructor(epoch: number, title: string, url: string) {
    super(epoch);
    this.title = title;
    this.url = url;
  }

  dump(): string {
    return `${this.epoch} ${this.title} (${this.url})`;
  }

  keyInDay(): string {
    return this.url;
  }
}

export class SlackReportRecord extends ReportRecordBase {
  channel: string;
  message: string;

  constructor(epoch: number, channel: string, message: string) {
    super(epoch);
    this.channel = channel;
    this.message = message;
  }

  dump(): string {
    return `${this.epoch} #${this.channel} ${this.message}`;
  }

  keyInDay(): string {
    return this.message;
  }
}

export class CalendarReportRecord extends ReportRecordBase {
  duration: number;
  title: string;
  calendarName: string;

  constructor(
    epoch: number,
    duration: number,
    title: string,
    calendarName: string,
  ) {
    super(epoch);
    this.duration = duration;
    this.title = title;
    this.calendarName = calendarName;
  }

  dump(): string {
    return `${this.epoch} ${this.title} ${this.duration} (${this.calendarName})`;
  }

  keyInDay(): string {
    return this.title;
  }
}

export type ReportRecord =
  | BrowserReportRecord
  | SlackReportRecord
  | CalendarReportRecord;

/**
 * Application configuration information
 */
export interface Config {
  rawFilePath: string;
  cryptedFilePath: string;
  envVars: {
    passphrase: string;
  };
}

export interface Params {
  startEpoch: number;
  endEpoch?: number;
}

/**
 * Zod schema for exclusion rules
 */
export const exclusionsSchema = z.object({
  // URLs that start with these prefixes will be excluded
  urlPrefixes: z.array(z.string()).optional(),

  // URLs that contain these substrings will be excluded
  urlContains: z.array(z.string()).optional(),

  // Notion page IDs to exclude
  notionIds: z.array(z.string()).optional(),

  // Notion titles to exclude (exact match or substring)
  titleContains: z.array(z.string()).optional(),

  // Slack messages to exclude
  slackMessages: z.array(
    z.object({
      channel: z.string(),
      message: z.array(z.string()),
    }),
  ).optional(),

  // Calendar names to include
  notCalendarNames: z.array(z.string()).optional(),
});

/**
 * Type definition for exclusion rules
 */
export type Exclusions = z.infer<typeof exclusionsSchema>;
