import { getLogger } from "jsr:@std/log";
import { ReportRecord } from "./types.ts";
import { parse as parseCsv } from "jsr:@std/csv";
import { BrowserHistoryCsvConverter } from "./browserHistoryCsvToRecord.ts";
import { SlackMessageCsvConverter } from "./slackMessageCsvToRecord.ts";
import { CalendarEventsCsvConverter } from "./calendarEventsCsvToRecord.ts";

/**
 * CSVからレコードに変換するための基底抽象クラス
 */
export abstract class BaseCsvConverter {
  protected logger = getLogger();

  /**
   * CSVテキストからレコードを作成する
   * @param text CSVテキスト
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  public abstract convert(text: string): ReportRecord[];

  /**
   * 日付文字列をエポック時間に変換する
   * @param dateStr 日付文字列
   * @returns エポック時間（ミリ秒）
   * @throws 日付の解析に失敗した場合
   */
  protected parseDateToEpoch(dateStr: string): number {
    const dateObj = new Date(dateStr);
    const epoch = dateObj.getTime();

    if (isNaN(epoch)) {
      throw new Error(`無効な日付形式: ${dateStr}`);
    }

    return epoch;
  }

  /**
   * CSVのヘッダー行に基づいて適切なコンバーターを生成する
   * @param text CSVテキスト
   * @returns 適切なコンバーターのインスタンス
   * @throws ヘッダー行が認識できない場合
   */
  public static createConverter(text: string): BaseCsvConverter {
    const csv = parseCsv(text, { skipFirstRow: false, strip: true });
    if (csv.length === 0) {
      throw new Error("CSVファイルが空です");
    }

    const headers = Object.keys(csv[0]);

    // ブラウザ履歴のヘッダー
    if (
      headers.includes("date") &&
      headers.includes("time") &&
      headers.includes("title") &&
      headers.includes("url") &&
      headers.includes("transition")
    ) {
      return new BrowserHistoryCsvConverter();
    }

    // Slackメッセージのヘッダー
    if (
      headers.includes("datetime") &&
      headers.includes("channelName") &&
      headers.includes("sender") &&
      headers.includes("message")
    ) {
      return new SlackMessageCsvConverter();
    }

    // カレンダーイベントのヘッダー
    if (
      headers.includes("startDatetime") &&
      headers.includes("endDatetime") &&
      headers.includes("type") &&
      headers.includes("title") &&
      headers.includes("calendarName") &&
      headers.includes("status") &&
      headers.includes("location")
    ) {
      return new CalendarEventsCsvConverter();
    }

    throw new Error(
      `認識できないCSVヘッダー: ${headers.join(", ")}`,
    );
  }
}
