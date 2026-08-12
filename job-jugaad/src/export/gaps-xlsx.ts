import ExcelJS from 'exceljs'
import path from 'node:path'
import type { GapRow } from '../lib/paths.js'
import { resolveFromRoot } from '../lib/paths.js'
import { insertGap } from '../db/client.js'

export async function writeGapsExcel(
  rows: GapRow[],
  outRel = 'data/gaps.xlsx',
): Promise<string> {
  const out = resolveFromRoot(outRel)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Job Jugaad'
  const sheet = wb.addWorksheet('Skill Gaps')
  sheet.columns = [
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Role', key: 'role', width: 28 },
    { header: 'Chosen resume', key: 'chosenResume', width: 18 },
    { header: 'Gap', key: 'gap', width: 22 },
    { header: 'Why', key: 'why', width: 48 },
    { header: 'Learn next', key: 'learnNext', width: 48 },
  ]
  for (const r of rows) {
    sheet.addRow(r)
    insertGap({
      company: r.company,
      role: r.role,
      chosen_resume: r.chosenResume,
      gap: r.gap,
      why: r.why,
      learn_next: r.learnNext,
    })
  }
  sheet.getRow(1).font = { bold: true }
  await wb.xlsx.writeFile(out)
  return out
}

export async function appendGapsExcel(
  rows: GapRow[],
  outRel = 'data/gaps.xlsx',
): Promise<string> {
  const out = resolveFromRoot(outRel)
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.readFile(out)
  } catch {
    /* new file */
  }
  let sheet = wb.getWorksheet('Skill Gaps')
  if (!sheet) {
    sheet = wb.addWorksheet('Skill Gaps')
    sheet.columns = [
      { header: 'Company', key: 'company', width: 22 },
      { header: 'Role', key: 'role', width: 28 },
      { header: 'Chosen resume', key: 'chosenResume', width: 18 },
      { header: 'Gap', key: 'gap', width: 22 },
      { header: 'Why', key: 'why', width: 48 },
      { header: 'Learn next', key: 'learnNext', width: 48 },
    ]
    sheet.getRow(1).font = { bold: true }
  }
  for (const r of rows) {
    sheet.addRow(r)
    insertGap({
      company: r.company,
      role: r.role,
      chosen_resume: r.chosenResume,
      gap: r.gap,
      why: r.why,
      learn_next: r.learnNext,
    })
  }
  await wb.xlsx.writeFile(out)
  return path.resolve(out)
}
