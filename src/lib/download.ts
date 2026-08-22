/**
 * Hands the browser a generated file to save.
 *
 * There is no backend to serve a download from, so the file is built in memory
 * and offered through a temporary object URL. The URL is revoked immediately
 * after the click: the browser has already taken its copy of the blob by then.
 */
export function downloadTextFile(filename: string, contents: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)

  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
