/** Utilitas CSV: parser (kutip, BOM, delimiter otomatis), pembuat CSV, dan unduhan. */

const detectDelimiter = (headerLine) => {
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1
  for (const delimiter of candidates) {
    const count = headerLine.split(delimiter).length - 1
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }
  return best
}

/** Parse teks CSV menjadi array baris. Baris kosong dibuang. */
export function parseCsv(text) {
  const clean = String(text).replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(clean.split(/\r?\n/, 1)[0] || '')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const FORMULA_START = /^[=+\-@\t\r]/

/** Escape sel CSV + mitigasi CSV/formula injection saat dibuka di Excel. */
const escapeCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  if (/[",;\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

/** Bangun string CSV (dengan BOM agar Excel membaca UTF-8 dengan benar). */
export const toCsv = (headers, rows) =>
  `\uFEFF${[headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n')}`

/** Picu unduhan file CSV di browser. */
export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
