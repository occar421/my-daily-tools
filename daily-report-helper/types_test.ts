import { assertEquals, assertThrows } from "jsr:@std/assert";
import { exclusionsSchema } from "./types.ts";

Deno.test("exclusionsSchema - valid data with all fields", () => {
  const validData = {
    urlPrefixes: ["https://example.com", "http://test.org"],
    urlContains: ["private", "internal"],
    notionIds: [
      "1234567890abcdef1234567890abcdef",
      "abcdef1234567890abcdef1234567890",
    ],
    titleContains: ["Private", "Internal"],
  };

  const result = exclusionsSchema.parse(validData);
  assertEquals(result, validData);
});

Deno.test("exclusionsSchema - valid data with some fields", () => {
  const validData = {
    urlPrefixes: ["https://example.com"],
    titleContains: ["Private"],
  };

  const result = exclusionsSchema.parse(validData);
  assertEquals(result, validData);
});

Deno.test("exclusionsSchema - valid empty object", () => {
  const validData = {};

  const result = exclusionsSchema.parse(validData);
  assertEquals(result, {});
});

Deno.test("exclusionsSchema - invalid urlPrefixes type", () => {
  const invalidData = {
    urlPrefixes: "https://example.com", // Should be an array
  };

  assertThrows(
    () => exclusionsSchema.parse(invalidData),
    Error,
  );
});

Deno.test("exclusionsSchema - invalid urlContains type", () => {
  const invalidData = {
    urlContains: 123, // Should be an array of strings
  };

  assertThrows(
    () => exclusionsSchema.parse(invalidData),
    Error,
  );
});

Deno.test("exclusionsSchema - invalid notionIds type", () => {
  const invalidData = {
    notionIds: [123, 456], // Should be an array of strings
  };

  assertThrows(
    () => exclusionsSchema.parse(invalidData),
    Error,
  );
});

Deno.test("exclusionsSchema - invalid titleContains type", () => {
  const invalidData = {
    titleContains: [true, false], // Should be an array of strings
  };

  assertThrows(
    () => exclusionsSchema.parse(invalidData),
    Error,
  );
});

Deno.test("exclusionsSchema - unknown field", () => {
  const invalidData = {
    unknownField: ["test"],
  };

  // Zod's default behavior is to strip unknown fields, so this should pass
  const result = exclusionsSchema.parse(invalidData);
  assertEquals(result, {});
});
