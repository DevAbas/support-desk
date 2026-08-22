const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(isoString: string): string {
  return dateFormatter.format(new Date(isoString))
}

export function formatDateTime(isoString: string): string {
  return dateTimeFormatter.format(new Date(isoString))
}
