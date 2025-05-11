import { BrowserReportRecord } from "./types.ts";
import { BaseCsvConverter } from "./baseCsvConverter.ts";

export class BrowserHistoryCsvConverter extends BaseCsvConverter {
  /**
   * このコンバーターが期待するCSVヘッダーを返す
   * @returns 期待するヘッダーの配列
   */
  public override getExpectedHeaders(): string[] {
    return ["date", "time", "title", "url", "transition"];
  }

  /**
   * パース済みのCSVデータからレコードを作成する
   * @param records パース済みのCSVデータ
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  protected override convertRecords(
    records: Record<"date" | "time" | "title" | "url" | "transition", string>[],
  ): BrowserReportRecord[] {
    const browserRecords: BrowserReportRecord[] = [];

    for (const row of records) {
      if (row.transition === "reload") {
        continue;
      }

      let title = row.title.trim();
      let url = new URL(row.url.trim());

      // Skip if title is empty
      if (title === "") {
        continue;
      }

      // Remove notification count from Notion titles
      const notionMatch = url.href.match(
        /https:\/\/www.notion.so\/.*?-?([0-9a-f]{32})/,
      );
      if (notionMatch) {
        title = row.title.replace(/^\((\d+\+?)\)\s/, "");
        url = new URL(`https://www.notion.so/${notionMatch[1]}`);
      }

      const githubPrMatch = url.href.match(
        /https:\/\/github.com\/(.*?)\/(.*?)\/pull\/(\d+)/,
      );
      if (githubPrMatch) {
        url = new URL(
          `https://github.com/${githubPrMatch[1]}/${githubPrMatch[2]}/pull/${
            githubPrMatch[3]
          }`,
        );
      }

      // Remove search params and hash
      url.search = "";
      url.hash = "";

      try {
        // Calculate epoch time from date and time
        // us order
        const [month, day, year] = row.date.split("/").map(Number);
        const [hour, minute, second] = row.time.split(":").map(Number);

        if (
          isNaN(year) || isNaN(month) || isNaN(day) ||
          isNaN(hour) || isNaN(minute) || isNaN(second)
        ) {
          this.logger.error(`Invalid date format: ${row.date} ${row.time}`);
          continue;
        }

        // JavaScript months start from 0, so subtract 1 from the month
        const dateObj = new Date(year, month - 1, day, hour, minute, second);
        const epoch = dateObj.getTime();

        // Create Record object and add it to the array
        browserRecords.push(new BrowserReportRecord(epoch, title, url.href));
      } catch (error) {
        this.logger.error(
          `Date conversion error: ${row.date} ${row.time}`,
          error,
        );
      }
    }

    return browserRecords;
  }
}
