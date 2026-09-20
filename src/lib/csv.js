export function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function rowsToCsv(headers, rows, { delimiter = ';', bom = true } = {}) {
  const encodeRow = (row) => row.map(csvEscape).join(delimiter);
  const content = [encodeRow(headers), ...rows.map(encodeRow)].join('\r\n');
  return bom ? `\ufeff${content}` : content;
}

export function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
