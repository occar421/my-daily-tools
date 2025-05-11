import { parse as parseCsv } from "jsr:@std/csv";
import { ReportRecord } from "../types.ts";
import { BrowserHistoryCsvConverter } from "./browserHistoryCsvToRecord.ts";
import { SlackMessageCsvConverter } from "./slackMessageCsvToRecord.ts";
import { CalendarEventsCsvConverter } from "./calendarEventsCsvToRecord.ts";

/**
 * CSVテキストを適切なコンバーターで変換する
 * @param text CSVテキスト
 * @returns 抽出されたRecord型オブジェクトの配列
 * @throws ヘッダー行が認識できない場合
 */
export function convertCsv(
  text: string,
): { records: ReportRecord[]; converterName: string } {
  const csv = parseCsv(text, { skipFirstRow: true, strip: true });
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
      return {
        records: converter.convertRecords(csv),
        converterName: converter.getConverterName(),
      };
    }
  }

  throw new Error(
    `認識できないCSVヘッダー: ${headers.join(", ")}`,
  );
}
