// =============================================================================
// .docx -> .pdf conversion.
//
// Needed twice over:
//   * Season 3 and Season 4's Babak Penyisihan ship no PDF at all;
//   * Season 4's Babak Final ships the *clean student copy*, so the answer key
//     only exists inside the .docx.
//
// LibreOffice does this faithfully. The two alternatives on this machine do not:
// Microsoft Word 365 for Mac no longer answers the AppleScript `save as`
// message (raises -1708), and Pages reflows the floating illustrations so badly
// that pictures land on top of the prose — verified on Season 4 Matematika PAUD,
// where the Pages render loses half the answer highlights.
//
// Conversions are cached in .import-cache so a re-import costs nothing.
// =============================================================================
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access, rename, mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename, extname } from 'node:path'

const run = promisify(execFile)

/** True when the path already exists. */
export async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Convert `docxPath` to `pdfPath`. Resolves to `pdfPath`.
 * Skips the work when the destination is already present.
 */
export async function docxToPdf(docxPath, pdfPath) {
  if (await exists(pdfPath)) return pdfPath

  // soffice names the output after the input and only takes a directory, so it
  // runs into a scratch dir and the result is moved into place.
  const stage = await mkdtemp(join(tmpdir(), 'osn-convert-'))
  try {
    await run(
      'soffice',
      [
        // A private profile keeps this from fighting with a LibreOffice window
        // the user may have open.
        `-env:UserInstallation=file://${stage}/profile`,
        '--headless',
        '--norestore',
        '--convert-to',
        'pdf',
        '--outdir',
        stage,
        docxPath,
      ],
      { timeout: 5 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 },
    )

    const produced = (await readdir(stage)).find((name) => name.endsWith('.pdf'))
    if (!produced) {
      throw new Error(`LibreOffice produced no PDF for ${basename(docxPath)}`)
    }
    await rename(join(stage, produced), pdfPath)
    return pdfPath
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

/** Kept for symmetry with the old Pages-based converter; nothing to clean up. */
export async function closePages() {}

/** The extension-free name of a source document. */
export function stemOf(path) {
  return basename(path, extname(path))
}
