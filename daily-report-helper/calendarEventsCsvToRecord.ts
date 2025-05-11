import { parse as parseCsv } from "jsr:@std/csv";
import { CalendarReportRecord, ReportRecord } from "./types.ts";
import { BaseCsvConverter } from "./baseCsvConverter.ts";

export class CalendarEventsCsvConverter extends BaseCsvConverter {
  /**
   * このコンバーターが期待するCSVヘッダーを返す
   * @returns 期待するヘッダーの配列
   */
  public override getExpectedHeaders(): string[] {
    return [
      "startDatetime",
      "endDatetime",
      "type",
      "title",
      "calendarName",
      "status",
      "location",
    ];
  }

  /**
   * CSVテキストからレコードを作成する
   * @param text CSVテキスト
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  public override convert(text: string): ReportRecord[] {
    const records: ReportRecord[] = [];

    const csv: Record<
      | "startDatetime"
      | "endDatetime"
      | "type"
      | "title"
      | "calendarName"
      | "status"
      | "location",
      string
    >[] = parseCsv(
      text,
      {
        skipFirstRow: true,
        strip: true,
      },
    );

    for (const row of csv) {
      if (row.status !== "accepted") {
        continue;
      }

      try {
        const startEpoch = this.parseDateToEpoch(row.startDatetime);
        const endEpoch = this.parseDateToEpoch(row.endDatetime);
        const duration = endEpoch - startEpoch;

        records.push(
          new CalendarReportRecord(
            startEpoch,
            duration,
            row.title,
            row.calendarName,
          ),
        );
      } catch (error) {
        this.logger.error(
          `無効な日付形式: start=${row.startDatetime}, end=${row.endDatetime}`,
          error,
        );
      }
    }

    return records;
  }
}
