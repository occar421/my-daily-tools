import { parse as parseCsv } from "jsr:@std/csv";
import type { ReportRecord } from "./types.ts";

const LOOK_BACK_RECORDS = 10;
const LOOK_BACK_RANGE = [...Array(LOOK_BACK_RECORDS).keys()].map((x) => x + 1);

/**
 * CSVテキストからレコードを作成する関数
 * @param text CSVテキスト
 * @returns 抽出されたRecord型オブジェクトの配列
 */
export function chromeHistoryCsvToRecord(text: string): ReportRecord[] {
  const records: ReportRecord[] = [];

  const csv: Record<"date" | "time" | "title" | "url", string>[] = parseCsv(
    text,
    {
      skipFirstRow: true,
      strip: true,
    },
  );

  for (const row of csv) {
    // タイトルが無い場合は除く
    if (row.title.trim() === "") {
      continue;
    }

    let title = row.title.trim();
    // Notion ではタイトルから通知数を取り除く
    if (row.url.startsWith("https://www.notion.so/")) {
      title = row.title.replace(/^\((\d+\+?)\)\s/, "");
    }

    // Slack は除く （記録が中途半端）
    if (title.match(/-\sSlack$/)) {
      continue;
    }

    // 同じタイトルの場合は省く
    if (
      LOOK_BACK_RANGE.some((x) =>
        records.at(-x)?.title.toUpperCase() === title.toUpperCase()
      )
    ) {
      continue;
    }

    // Google Meet は除く（カレンダーで補完できる）
    if (row.url.startsWith("https://meet.google.com/")) {
      continue;
    }

    // X は除く
    if (row.url.startsWith("https://x.com/")) {
      continue;
    }

    // Google Calendar 内の遷移は除く
    if (
      row.url.startsWith("https://calendar.google.com/calendar") &&
      (LOOK_BACK_RANGE.some((x) =>
        records.at(-x)?.meta.startsWith(
          "https://calendar.google.com/calendar",
        )
      ))
    ) {
      continue;
    }

    // Google Keep を除く
    if (row.url.startsWith("https://keep.google.com/")) {
      continue;
    }

    // Scrapbox を除く （Firefox でカウント）
    if (row.url.startsWith("https://scrapbox.io/")) {
      continue;
    }

    // GTD を除く
    if (row.url.includes("17331669571280f28638e7aa1ca78021")) {
      continue;
    }

    const notionMatch = row.url.match(
      /https:\/\/www.notion.so\/.*?[\-\/]([0-9a-f]{32})/,
    );
    if (notionMatch) {
      const notionId = notionMatch[1];
      if (
        LOOK_BACK_RANGE.some((x) => records.at(-x)?.meta.includes(notionId))
      ) {
        continue;
      }
    }

    // メモを除く
    if (
      [
        "8939b3782f014b7aa4b4748683ff686d",
        "641c5b2213924efb932de9d8da62e4f0",
        "41612fa22e19450385ca88138de0ec4c",
      ]
        .some((id) => row.url.includes(id))
    ) {
      continue;
    }

    // Looker を除く
    if (
      row.url.includes(".cloud.looker.com") ||
      row.url.includes("https://lookerstudio.google.com/")
    ) {
      continue;
    }

    // 検索自体を除く
    if (row.url.startsWith("https://www.google.com/search?")) {
      continue;
    }

    // ログインを除く
    if (
      row.url.startsWith("https://login.microsoftonline.com/") ||
      row.url.startsWith("https://accounts.google.com/v3/signin") ||
      row.url.startsWith("https://mysignins.microsoft.com/") ||
      row.url.includes(".smarthr.jp/login")
    ) {
      continue;
    }

    // 議事録を除く
    if (
      [
        "14c3166957128005aba0d72f3329b7b6",
        "135316695712807c9616ceecf9f58ea0",
        "13f31669571280c0a5dffa3f82d43601",
        "a11a734b78784a5cb5b41474e4febbdd",
        "1cf316695712800eb2b0d1b352d753b2",
      ]
        .some((id) => row.url.includes(id)) ||
      ["Delivery 分科会", "議事録(2024~)", "Delivery Sync"].some((id) =>
        row.title.includes(id)
      )
    ) {
      continue;
    }

    try {
      // 日付と時間からエポック時間を算出
      // us order
      const [month, day, year] = row.date.split("/").map(Number);
      const [hour, minute, second] = row.time.split(":").map(Number);

      if (
        isNaN(year) || isNaN(month) || isNaN(day) ||
        isNaN(hour) || isNaN(minute) || isNaN(second)
      ) {
        console.error(`不正な日付形式: ${row.date} ${row.time}`);
        continue;
      }

      // Javascriptの月は0から始まるため、月から1を引く
      const dateObj = new Date(year, month - 1, day, hour, minute, second);
      const epoch = dateObj.getTime();

      // Recordオブジェクトを作成して配列に追加
      records.push({
        epoch,
        title,
        meta: row.url,
      });
    } catch (error) {
      console.error(`日付変換エラー: ${row.date} ${row.time}`, error);
    }
  }

  console.debug("Records: ", records);

  return records;
}
