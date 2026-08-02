export function sanitizeCsvCell(value: unknown) {
  const original = String(value ?? "");
  // Inspect a trimmed view only. The exported value keeps its original
  // whitespace/control prefix so the report data itself is not rewritten.
  const significant = original.replace(/^[\s\u0000-\u001f\u007f]+/u, "");
  const formulaSafe = typeof value === "string" && /^[=+\-@]/u.test(significant)
    ? `'${original}`
    : original;
  const escaped = formulaSafe.replaceAll('"', '""');
  return /[",\r\n]/u.test(formulaSafe) ? `"${escaped}"` : escaped;
}
