import { parse as parseCsv } from "jsr:@std/csv";
import { getLogger } from "jsr:@std/log";
import { CalendarReportRecord, ReportRecord } from "./types.ts";

export function calendarEventsCsvToRecord(
  text: string,
): ReportRecord[] {
  const logger = getLogger();

  const records: ReportRecord[] = [];

  const csv: Record<
    | "startDatetime"
    | "endDatetime"
    | "type"
    | "title"
    | "calendarName"
    | "status"
    | "location",
    string
  >[] = parseCsv(
    text,
    {
      skipFirstRow: true,
      strip: true,
    },
  );

  for (const row of csv) {
    if (row.status !== "accepted") {
      continue;
    }

    const startDate = new Date(row.startDatetime);
    const endDate = new Date(row.endDatetime);

    const startEpoch = startDate.getTime();
    const endEpoch = endDate.getTime();

    if (isNaN(startEpoch) || isNaN(endEpoch)) {
      logger.error(
        `無効な日付形式: start=${row.startDatetime}, end=${row.endDatetime}`,
      );
      continue;
    }

    const duration = endEpoch - startEpoch;

    records.push(
      new CalendarReportRecord(
        startEpoch,
        duration,
        row.title,
        row.calendarName,
      ),
    );
  }

  return records;
}
