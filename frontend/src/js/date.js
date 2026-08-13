/* All helpers work in local time so dates never shift via UTC. */

export function formatDateISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr() {
  return formatDateISO(new Date())
}

export function parseISODate(ds) {
  const [y, m, d] = String(ds).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftDateStr(ds, days) {
  const d = parseISODate(ds)
  d.setDate(d.getDate() + days)
  return formatDateISO(d)
}

export function prettyDate(ds) {
  return parseISODate(ds).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function prettyDateNoYear(ds) {
  return parseISODate(ds).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function weekdayNarrow(ds) {
  return parseISODate(ds).toLocaleDateString(undefined, { weekday: 'narrow' })
}