import { exists, expect, isTouch, openGame, openMap, savedStamps, tap, test, waitForResult, withStamps } from './helpers.mjs';

// Each test plays one game the way a child would, through real taps, until the result screen.
// The labels it looks for are the Indonesian interface text from js/strings.js.

test('tea picking: shoots score, caterpillars do not, the stamp is kept', async ({ page }) => {
  await openMap(page);
  await openGame(page, 'tea');

  let caterpillars = 0;
  const end = Date.now() + 50_000;
  while (Date.now() < end && !(await exists(page, '.result'))) {
    const shoot = page.locator('.bush.up[aria-label="Pucuk teh"]').first();
    if (await shoot.count()) {
      await tap(page, shoot, { timeout: 500 }).catch(() => {});
    } else if (caterpillars < 2 && (await exists(page, '.bush.up[aria-label="Ulat"]'))) {
      const before = await page.locator('#score').innerText();
      await tap(page, page.locator('.bush.up[aria-label="Ulat"]').first(), { timeout: 500 }).catch(() => {});
      expect(await page.locator('#score').innerText(), 'a caterpillar adds nothing').toBe(before);
      caterpillars++;
    }
    await page.waitForTimeout(50);
  }

  const r = await waitForResult(page);
  expect(r.number).toBeGreaterThan(8);
  expect(r.stars).toBe(r.number >= 20 ? 3 : r.number >= 10 ? 2 : 1);
  expect(await savedStamps(page)).toEqual({ tea: r.stars });
});

test('fishing: the boat follows the finger and catches fish', async ({ page }) => {
  await openMap(page);
  await openGame(page, 'lake');
  const box = await page.locator('#stage').boundingBox();

  const end = Date.now() + 50_000;
  while (Date.now() < end && !(await exists(page, '.result'))) {
    // Chase the fish closest to the boat.
    const x = await page.evaluate(() => {
      const fish = [...document.querySelectorAll('.floater-fish')]
        .map((e) => e.getBoundingClientRect())
        .sort((a, b) => b.top - a.top)[0];
      return fish ? fish.left + fish.width / 2 : null;
    });
    if (x !== null) {
      const tx = Math.max(box.x + 5, Math.min(box.x + box.width - 5, x));
      const ty = box.y + box.height / 2;
      await (isTouch(page) ? page.touchscreen.tap(tx, ty) : page.mouse.move(tx, ty)).catch(() => {});
    }
    await page.waitForTimeout(50);
  }

  const r = await waitForResult(page);
  expect(r.number).toBeGreaterThan(5);
  expect(await savedStamps(page)).toEqual({ lake: r.stars });
});

test('wildlife photos: all five animals end up in the album', async ({ page }) => {
  await openMap(page);
  await openGame(page, 'forest');

  const end = Date.now() + 70_000;
  while (Date.now() < end && !(await exists(page, '.result'))) {
    const animal = page.locator('.spot.up').first();
    if (await animal.count()) await tap(page, animal, { timeout: 500 }).catch(() => {});
    await page.waitForTimeout(70);
  }

  const r = await waitForResult(page);
  expect(r.number).toBe(5);
  expect(r.stars).toBeGreaterThanOrEqual(2);
  expect(await savedStamps(page)).toEqual({ forest: r.stars });
});

test('rhythm: repeating the pattern wins, one slip is forgiven', async ({ page }) => {
  await openMap(page);
  await openGame(page, 'rhythm');

  // Write down which instrument lights up while the game is showing the pattern
  // (its status line then says "Lihat ...", "watch").
  await page.evaluate(() => {
    window.__pattern = [];
    const pads = [...document.querySelectorAll('.pad')];
    new MutationObserver((changes) => {
      for (const c of changes) {
        const showing = /[Ll]ihat/.test(document.querySelector('.rhythm-status').textContent);
        if (c.target.classList.contains('lit') && showing) window.__pattern.push(pads.indexOf(c.target));
      }
    }).observe(document.querySelector('.rhythm-pads'), { attributes: true, attributeFilter: ['class'], subtree: true });
  });

  let slipped = false;
  const end = Date.now() + 70_000;
  while (Date.now() < end && !(await exists(page, '.result'))) {
    if (await exists(page, '#stage.your-turn')) {
      const pattern = await page.evaluate(() => window.__pattern.splice(0));
      if (!slipped && pattern.length === 3) {
        slipped = true;
        await tap(page, `.pad-${(pattern[0] + 1) % 4}`);
        await expect(page.locator('.rhythm-status')).toContainText('Coba lagi');
        continue;
      }
      for (const i of pattern) {
        await tap(page, `.pad-${i}`);
        await page.waitForTimeout(240);
      }
    }
    await page.waitForTimeout(70);
  }

  const r = await waitForResult(page);
  expect(slipped).toBe(true);
  expect(r.stars, 'one slip still earns three stars').toBe(3);
  expect(await savedStamps(page)).toEqual({ rhythm: 3 });
});

test('memory cards: pairs stay open, and the fifth stamp completes the book', async ({ page }) => {
  await withStamps(page, { tea: 1, lake: 1, forest: 1, rhythm: 1 });
  await openMap(page);
  await expect(page.locator('.pin[data-id="mountain"]')).toHaveClass(/pin-locked/);
  await openGame(page, 'market');

  const names = await page.locator('.card .card-front b').allInnerTexts();
  expect(names).toHaveLength(12);
  expect(new Set(names).size).toBe(6);
  const card = (i) => page.locator('.card').nth(i);

  // One wrong try first: both cards turn back.
  await tap(page, card(0));
  await tap(page, card(names.findIndex((n) => n !== names[0])));
  await expect(page.locator('.card.open')).toHaveCount(0, { timeout: 3000 });

  const done = new Set();
  for (let i = 0; i < 12; i++) {
    if (done.has(i)) continue;
    const j = names.findIndex((n, k) => k > i && n === names[i]);
    done.add(i).add(j);
    await tap(page, card(i));
    await tap(page, card(j));
    await expect(card(j)).toHaveClass(/matched/);
  }

  const r = await waitForResult(page);
  expect(r.number).toBe(7);
  expect(r.stars).toBe(3);
  await expect(page.locator('.result-note')).toContainText('tempat baru');
  await tap(page, '#to-map');
  await expect(page.locator('#book')).toContainText('5/5');
  await expect(page.locator('.pin[data-id="mountain"]')).toHaveClass(/pin-locked/);
});
