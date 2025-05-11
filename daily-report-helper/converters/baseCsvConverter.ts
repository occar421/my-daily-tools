import { getLogger } from "jsr:@std/log";
import { ReportRecord } from "../types.ts";

/**
 * CSVからレコードに変換するための基底抽象クラス
 */
export abstract class BaseCsvConverter {
  protected logger = getLogger();

  /**
   * パース済みのCSVデータからレコードを作成する
   * @param records パース済みのCSVデータ
   * @returns 抽出されたRecord型オブジェクトの配列
   */
  public abstract convertRecords(
    records: Record<string, string>[],
  ): ReportRecord[];

  /**
   * このコンバーターが期待するCSVヘッダーを返す
   * @returns 期待するヘッダーの配列
   */
  public abstract getExpectedHeaders(): readonly string[];

  /**
   * このコンバーターの名前を返す
   * @returns コンバーターの名前
   */
  public abstract getConverterName(): string;

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
}
