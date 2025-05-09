import { parse as parseCsv } from "jsr:@std/csv";
import { getLogger } from "jsr:@std/log";
import { ReportRecord, SlackReportRecord } from "./types.ts";

export function slackMessageCsvToRecord(
  text: string,
): ReportRecord[] {
  const logger = getLogger();

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
      const dateObj = new Date(row.datetime.replace(/\s[A-Za-z]{3}\s/, " "));
      const epoch = dateObj.getTime();

      if (isNaN(epoch)) {
        logger.error(`無効な日付形式: ${row.datetime}`);
        continue;
      }

      // ReportRecordオブジェクトを作成して配列に追加
      records.push(new SlackReportRecord(epoch, row.channelName, message));
    } catch (error) {
      logger.error(`日付変換エラー: ${row.datetime}`, error);
    }
  }

  return records;
}
