import type { Locator, Page } from 'playwright'

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function bezierPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  steps = 18,
): Array<{ x: number; y: number }> {
  const cx = x0 + (x1 - x0) * rand(0.25, 0.55) + rand(-40, 40)
  const cy = y0 + (y1 - y0) * rand(0.2, 0.6) + rand(-30, 30)
  const out: Array<{ x: number; y: number }> = []
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push({
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1,
    })
  }
  return out
}

export async function humanPause(msMin = 180, msMax = 520): Promise<void> {
  await new Promise((r) => setTimeout(r, rand(msMin, msMax)))
}

/** Move mouse along a curved path then click (reduces teleport-click fingerprints). */
export async function humanClick(
  page: Page,
  target: Locator,
): Promise<boolean> {
  try {
    await target.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => undefined)
    const box = await target.boundingBox()
    if (!box) {
      await target.click({ timeout: 4000 })
      return true
    }
    const x = box.x + box.width * rand(0.3, 0.7)
    const y = box.y + box.height * rand(0.35, 0.65)
    const start = await page.evaluate(() => ({
      x: (window as unknown as { __jjMouseX?: number }).__jjMouseX ?? 40,
      y: (window as unknown as { __jjMouseY?: number }).__jjMouseY ?? 80,
    }))
    const pts = bezierPoints(start.x, start.y, x, y, Math.floor(rand(14, 24)))
    for (const p of pts) {
      await page.mouse.move(p.x, p.y)
      await page.waitForTimeout(rand(8, 22))
    }
    await page.evaluate(
      ({ x, y }) => {
        ;(window as unknown as { __jjMouseX?: number; __jjMouseY?: number }).__jjMouseX =
          x
        ;(window as unknown as { __jjMouseX?: number; __jjMouseY?: number }).__jjMouseY =
          y
      },
      { x, y },
    )
    await humanPause(40, 120)
    await page.mouse.down()
    await page.waitForTimeout(rand(40, 110))
    await page.mouse.up()
    await humanPause(120, 320)
    return true
  } catch {
    await target.click({ timeout: 3000 }).catch(() => undefined)
    return false
  }
}

/** Click field, clear, type with per-keystroke delays. */
export async function humanType(
  page: Page,
  target: Locator,
  text: string,
): Promise<void> {
  if (!text) return
  await humanClick(page, target)
  await target.click({ clickCount: 3 }).catch(() => undefined)
  await page.keyboard.press('Backspace').catch(() => undefined)
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: rand(35, 95) })
    if (Math.random() < 0.06) await humanPause(120, 280)
  }
  await humanPause(80, 200)
}
