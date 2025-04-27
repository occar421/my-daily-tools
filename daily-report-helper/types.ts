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
}

export interface Exclusions {}
