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
  public convert(text: string): ReportRecord[] {
    const csv = parseCsv(text, { skipFirstRow: true, strip: true });
    return this.convertRecords(csv);
  }

  /**
   * パース済みのCSVデータからレコードを作成する
   * @param records パース済みのCSVデータ
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  protected abstract convertRecords(records: Record<string, string>[]): ReportRecord[];

  /**
   * このコンバーターが期待するCSVヘッダーを返す
   * @returns 期待するヘッダーの配列
   */
  public abstract getExpectedHeaders(): string[];

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

    // 各コンバーターのインスタンスを作成して、ヘッダーが一致するかチェック
    const converters = [
      new BrowserHistoryCsvConverter(),
      new SlackMessageCsvConverter(),
      new CalendarEventsCsvConverter(),
    ];

    for (const converter of converters) {
      const expectedHeaders = converter.getExpectedHeaders();
      if (expectedHeaders.every((header) => headers.includes(header))) {
        return converter;
      }
    }

    throw new Error(
      `認識できないCSVヘッダー: ${headers.join(", ")}`,
    );
  }
}
