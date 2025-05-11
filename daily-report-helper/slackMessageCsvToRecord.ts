import { parse as parseCsv } from "jsr:@std/csv";
import { ReportRecord, SlackReportRecord } from "./types.ts";
import { BaseCsvConverter } from "./baseCsvConverter.ts";

export class SlackMessageCsvConverter extends BaseCsvConverter {
  /**
   * CSVテキストからレコードを作成する
   * @param text CSVテキスト
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  public override convert(text: string): ReportRecord[] {
    const records: ReportRecord[] = [];

    const csv: Record<
      "datetime" | "channelName" | "sender" | "message",
      string
    >[] = parseCsv(
      text,
      {
        skipFirstRow: true,
        strip: true,
      },
    );

    for (const row of csv) {
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
        records.push(new SlackReportRecord(epoch, row.channelName, message));
      } catch (error) {
        this.logger.error(`日付変換エラー: ${row.datetime}`, error);
      }
    }

    return records;
  }
}
