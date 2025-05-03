import { parse as parseCsv } from "jsr:@std/csv";
import { getLogger } from "jsr:@std/log";
import type { ReportRecord } from "./types.ts";

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
    // メッセージが空の場合はスキップ
    if (row.message.trim() === "") {
      continue;
    }

    try {
      // 日時文字列をエポック時間に変換
      // フォーマットは「YYYY-MM-DD Xxx HH:MM:SS」を想定
      const dateObj = new Date(row.datetime.replace(/\s[A-Za-z]{3}\s/, ' '));
      const epoch = dateObj.getTime();

      if (isNaN(epoch)) {
        logger.error(`無効な日付形式: ${row.datetime}`);
        continue;
      }

      // ReportRecordオブジェクトを作成して配列に追加
      records.push({
        epoch,
        title: row.message.trim(),
        meta: `Channel: ${row.channelName}`,
        source: "Slack",
      });
    } catch (error) {
      logger.error(`日付変換エラー: ${row.datetime}`, error);
    }
  }

  return records;
}
