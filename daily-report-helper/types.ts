import { z } from "zod";

export type ReportRecord = {
  epoch: number;
  title: string;
  meta: string;
};

/**
 * Application configuration information
 */
export interface Config {
  rawFilePath: string;
  cryptedFilePath: string;
  envVars: {
    passphrase: string;
  };
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
