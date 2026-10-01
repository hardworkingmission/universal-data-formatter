import { test, expect, type Page } from "@playwright/test";
import ts from "typescript";
import { inferTypeScript, inferJsonSchema } from "../lib/schemaInference";
import { yamlToJson, jsonToCsv, jsonToXml, csvToJson } from "../lib/convert";
import { runAction } from "../lib/actions";

async function enter(page: Page, input: string, format: string) {
  await page.goto("/");
  await page.getByLabel("Format:").selectOption(format);
  await page.locator('.cm-content').first().fill(input);
}

test("inferred TypeScript compiles for arrays and arbitrary property names", () => {
  for (const value of [[1, "a", null], [{ "a-b": 1, "123": { value: true } }], { Root: {}, a: { x: 1 }, b: { x: "a" } }]) {
    const result = inferTypeScript(JSON.stringify(value));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const file = "inferred.ts";
    const options = { strict: true, noEmit: true, skipLibCheck: true };
    const host = ts.createCompilerHost(options);
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (name, version, onError, fresh) => name === file
      ? ts.createSourceFile(file, `${result.value}\nconst sample: Root = ${JSON.stringify(value)};`, version)
      : original(name, version, onError, fresh);
    const program = ts.createProgram([file], options, host);
    expect(ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))).toEqual([]);
  }
});

test("JSON Schema preserves special keys and heterogeneous arrays", () => {
  const result = inferJsonSchema('{"__proto__":[1,"a"]}');
  expect(result.ok).toBe(true);
  if (result.ok) expect(JSON.parse(result.value).properties.__proto__.items.anyOf).toHaveLength(2);
});

test("empty and cyclic YAML do not crash conversions", () => {
  expect(yamlToJson("", 2).ok).toBe(false);
  expect(yamlToJson("---", 2)).toEqual({ ok: true, value: "null" });
  expect(yamlToJson("&a [*a]", 2).ok).toBe(false);
  expect(runAction("yaml", "convertToJson", "&a [*a]", { indent: 2 }).error).not.toBeNull();
});

test("CSV conversion preserves special keys and nested values", () => {
  const result = jsonToCsv('[{"__proto__":"safe","value":{"x":1}}]');
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value).toContain("__proto__");
    expect(result.value).toContain("safe");
  }
  expect(jsonToXml('{"@bad name":1}', 2).ok).toBe(false);
  const csv = csvToJson("value\n001\n9007199254740993\n42", 2);
  expect(csv.ok).toBe(true);
  if (csv.ok) expect(JSON.parse(csv.value)).toEqual([{ value: "001" }, { value: "9007199254740993" }, { value: 42 }]);
});

test("XML formatting preserves mixed text, CDATA and document instructions", async ({ page }) => {
  const input = '<?keep test?><root><p>Hello <b>world</b>!</p><data><![CDATA[a < b]]></data><space xml:space="preserve">  <x/>  </space></root>';
  await enter(page, input, "xml");
  for (const action of ["Prettify", "Minify"]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    const output = page.locator(".cm-content").nth(1);
    await expect(output).toContainText("Hello <b>world</b>!");
    await expect(output).toContainText("<![CDATA[a < b]]>");
    await expect(output).toContainText("<?keep test?>");
    expect(await output.innerText()).toContain('xml:space="preserve">  <x/>  ');
  }
});

test("JSON to XML escapes attributes and text", async ({ page }) => {
  await enter(page, JSON.stringify({ "@label": 'a & "b" <c>', "#text": "a < b & c", child: "ok" }), "json");
  await page.getByRole("button", { name: /Convert.*XML/ }).click();
  await expect(page.locator(".cm-content").nth(1)).toContainText("&amp;");
  await page.getByRole("button", { name: /Swap/ }).click();
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".cm-content").nth(1)).toContainText("Valid XML.");
});

test("changing actions cancels stale work and leaving JSON keeps output visible", async ({ page }) => {
  await enter(page, '{"b":2,"a":1}', "json");
  await page.getByRole("button", { name: "Prettify", exact: true }).click();
  await page.getByRole("button", { name: "Schema", exact: true }).click();
  await page.getByRole("button", { name: /Convert.*YAML/ }).click();
  await expect(page.locator(".cm-content").nth(1)).toContainText("b: 2");
  await page.waitForTimeout(400);
  await expect(page.locator(".cm-content").nth(1)).toContainText("a: 1");
  await expect(page.getByRole("button", { name: "Schema", exact: true })).toHaveCount(0);
});

test("invalid input remains editable and reports an error", async ({ page }) => {
  await enter(page, '{"broken":}', "json");
  await page.getByRole("button", { name: "Prettify", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /JSON|Unexpected|Expected/ })).toBeVisible();
  await expect(page.locator(".cm-content").first()).toHaveText('{"broken":}');
});

test("XML validation distinguishes malformed markup from a parsererror element", async ({ page }) => {
  await enter(page, "<root><broken></root>", "xml");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /error/i })).toBeVisible();
  await page.locator(".cm-content").first().fill("<parsererror>ordinary data</parsererror>");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".cm-content").nth(1)).toContainText("Valid XML.");
});

test("mobile output can be downloaded after conversion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page, '{"name":"Ada"}', "json");
  await page.getByRole("button", { name: /Convert.*YAML/ }).click();
  await expect(page.locator(".cm-content").nth(1)).toContainText("name: Ada");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("output.yaml");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
