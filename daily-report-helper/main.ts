import { join, parse } from "jsr:@std/path";

type Record = {
  epoch: number;
  title: string;
  meta: string;
};

const records: Record[] = [];

const baseDir = join(import.meta.dirname ?? ".", "data");
for await (
  const entry of Deno.readDir(baseDir)
) {
  if (entry.isFile) {
    const path = join(baseDir, entry.name);
    const parsedPath = parse(path);

    switch (parsedPath.ext) {
      case ".csv":
        records.push(...csvToRecord(await Deno.readTextFile(path)));
        break;
      default:
        continue;
    }

    console.log("Read file: ", parsedPath.base);
  }
}

function csvToRecord(csv: string): Record[] {
  // TODO

  return [];
}
