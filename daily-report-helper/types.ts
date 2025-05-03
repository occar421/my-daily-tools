import { z } from "zod";

abstract class ReportRecordBase {
  epoch: number;

  protected constructor(epoch: number) {
    this.epoch = epoch;
  }

  abstract dump(): string;
  abstract hash(): string;
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

  hash(): string {
    return this.dump();
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

  hash(): string {
    return this.dump();
  }
}

export type ReportRecord = BrowserReportRecord | SlackReportRecord;

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
});

/**
 * Type definition for exclusion rules
 */
export type Exclusions = z.infer<typeof exclusionsSchema>;
