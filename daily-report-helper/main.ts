import { join, parse as parsePath } from "jsr:@std/path";
import { parse as parseCsv } from "jsr:@std/csv";

type ReportRecord = {
  epoch: number;
  title: string;
  meta: string;
};

const records: ReportRecord[] = [];

const baseDir = join(import.meta.dirname ?? ".", "data");
for await (
  const entry of Deno.readDir(baseDir)
) {
  if (entry.isFile) {
    const path = join(baseDir, entry.name);
    const parsedPath = parsePath(path);

    switch (parsedPath.ext) {
      case ".csv":
        records.push(
          ...chromeHistoryCsvToRecord(await Deno.readTextFile(path)),
        );
        break;
      default:
        continue;
    }

    console.log("Read file: ", parsedPath.base);
  }
}

/**
 * CSVテキストからレコードを作成する関数
 * @param text CSVテキスト
 * @returns 抽出されたRecord型オブジェクトの配列
 */
function chromeHistoryCsvToRecord(text: string): ReportRecord[] {
  const records: ReportRecord[] = [];

  const csv: Record<"date" | "time" | "title" | "url", string>[] = parseCsv(
    text,
    {
      skipFirstRow: true,
      strip: true,
    },
  );

  for (const row of csv) {
    try {
      // 日付と時間からエポック時間を算出
      // us order
      const [month, day, year] = row.date.split("/").map(Number);
      const [hour, minute] = row.time.split(":").map(Number);

      if (
        isNaN(year) || isNaN(month) || isNaN(day) ||
        isNaN(hour) || isNaN(minute)
      ) {
        console.error(`不正な日付形式: ${row.date} ${row.time}`);
        continue;
      }

      // Javascriptの月は0から始まるため、月から1を引く
      const dateObj = new Date(year, month - 1, day, hour, minute);
      const epoch = dateObj.getTime();

      // Recordオブジェクトを作成して配列に追加
      records.push({
        epoch,
        title: row.title,
        meta: row.url,
      });
    } catch (error) {
      console.error(`日付変換エラー: ${row.date} ${row.time}`, error);
    }
  }

  console.debug("Records: ", records);

  return records;
}
