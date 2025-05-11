import { getLogger } from "jsr:@std/log";
import { ReportRecord } from "./types.ts";

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
} 