import { CalendarReportRecord, ReportRecord } from "../types.ts";
import { BaseCsvConverter } from "./baseCsvConverter.ts";

export class CalendarEventsCsvConverter extends BaseCsvConverter {
  private static readonly EXPECTED_HEADERS = [
    "startDatetime",
    "endDatetime",
    "type",
    "title",
    "calendarName",
    "status",
    "location",
  ] as const;

  /**
   * このコンバーターが期待するCSVヘッダーを返す
   * @returns 期待するヘッダーの配列
   */
  public override getExpectedHeaders(): readonly string[] {
    return CalendarEventsCsvConverter.EXPECTED_HEADERS;
  }

  /**
   * このコンバーターの名前を返す
   * @returns コンバーターの名前
   */
  public override getConverterName(): string {
    return "カレンダーイベント";
  }

  /**
   * パース済みのCSVデータからレコードを作成する
   * @param records パース済みのCSVデータ
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  public override convertRecords(
    records: Record<
      typeof CalendarEventsCsvConverter.EXPECTED_HEADERS[number],
      string
    >[],
  ): ReportRecord[] {
    const calendarRecords: ReportRecord[] = [];

    for (const row of records) {
      if (row.status !== "accepted") {
        continue;
      }

      try {
        const startEpoch = this.parseDateToEpoch(row.startDatetime);
        const endEpoch = this.parseDateToEpoch(row.endDatetime);
        const duration = endEpoch - startEpoch;

        calendarRecords.push(
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

    return calendarRecords;
  }
}
