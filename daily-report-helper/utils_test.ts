import { assertEquals, assertThrows } from "jsr:@std/assert";

import { parseExclusions } from "./utils.ts";

Deno.test("parseExclusions - valid data", () => {
  const validJson = `{
    urlPrefixes: ["https://example.com"],
    urlContains: ["test"],
    notionIds: ["1234567890abcdef1234567890abcdef"],
    titleContains: ["Example"]
  }`;

  const result = parseExclusions(validJson);
  assertEquals(result.urlPrefixes, ["https://example.com"]);
  assertEquals(result.urlContains, ["test"]);
  assertEquals(result.notionIds, ["1234567890abcdef1234567890abcdef"]);
  assertEquals(result.titleContains, ["Example"]);
});

Deno.test("parseExclusions - invalid data", () => {
  const invalidJson = `{
    invalidField: ["test"]
  }`;

  assertThrows(() => {
    parseExclusions(invalidJson);
  });
});
