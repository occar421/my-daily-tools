import { ReportRecord, SlackReportRecord } from "../types.ts";
import { BaseCsvConverter } from "./baseCsvConverter.ts";

export class SlackMessageCsvConverter extends BaseCsvConverter {
  private static readonly EXPECTED_HEADERS = [
    "datetime",
    "channelName",
    "sender",
    "message",
  ] as const;

  /**
   * このコンバーターが期待するCSVヘッダーを返す
   * @returns 期待するヘッダーの配列
   */
  public override getExpectedHeaders(): readonly string[] {
    return SlackMessageCsvConverter.EXPECTED_HEADERS;
  }

  /**
   * このコンバーターの名前を返す
   * @returns コンバーターの名前
   */
  public override getConverterName(): string {
    return "Slackメッセージ";
  }

  /**
   * パース済みのCSVデータからレコードを作成する
   * @param records パース済みのCSVデータ
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  public override convertRecords(
    records: Record<
      typeof SlackMessageCsvConverter.EXPECTED_HEADERS[number],
      string
    >[],
  ): ReportRecord[] {
    const slackRecords: ReportRecord[] = [];

    for (const row of records) {
      const message = row.message.trim();

      // メッセージが空の場合はスキップ
      if (message === "") {
        continue;
      }

      try {
        // 日時文字列をエポック時間に変換
        // フォーマットは「YYYY-MM-DD Xxx HH:MM:SS」を想定
        const epoch = this.parseDateToEpoch(
          row.datetime.replace(/\s[A-Za-z]{3}\s/, " "),
        );

        // ReportRecordオブジェクトを作成して配列に追加
        slackRecords.push(
          new SlackReportRecord(epoch, row.channelName, message),
        );
      } catch (error) {
        this.logger.error(`日付変換エラー: ${row.datetime}`, error);
      }
    }

    return slackRecords;
  }
}
