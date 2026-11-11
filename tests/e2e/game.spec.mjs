import { ada, bukaGame, denganStempel, expect, kePeta, layarSentuh, sentuh, stempel, test, tungguHasil } from './bantu.mjs';

// Each test plays one game the way a child would, through real taps, until the result screen.

test('Petik Teh: shoots score, caterpillars do not, the stamp is kept', async ({ page }) => {
  await kePeta(page);
  await bukaGame(page, 'teh');

  let ulat = 0;
  const akhir = Date.now() + 50_000;
  while (Date.now() < akhir && !(await ada(page, '.hasil'))) {
    const pucuk = page.locator('.semak.ada[aria-label="Pucuk teh"]').first();
    if (await pucuk.count()) {
      await sentuh(page, pucuk, { timeout: 500 }).catch(() => {});
    } else if (ulat < 2 && (await ada(page, '.semak.ada[aria-label="Ulat"]'))) {
      const sebelum = await page.locator('#skor').innerText();
      await sentuh(page, page.locator('.semak.ada[aria-label="Ulat"]').first(), { timeout: 500 }).catch(() => {});
      expect(await page.locator('#skor').innerText(), 'a caterpillar adds nothing').toBe(sebelum);
      ulat++;
    }
    await page.waitForTimeout(50);
  }

  const h = await tungguHasil(page);
  expect(h.angka).toBeGreaterThan(8);
  expect(h.bintang).toBe(h.angka >= 20 ? 3 : h.angka >= 10 ? 2 : 1);
  expect(await stempel(page)).toEqual({ teh: h.bintang });
});

test('Tangkap Ikan: the boat follows the finger and catches fish', async ({ page }) => {
  await kePeta(page);
  await bukaGame(page, 'danau');
  const kotak = await page.locator('#panggung').boundingBox();
  const sentuhan = layarSentuh(page);

  const akhir = Date.now() + 50_000;
  while (Date.now() < akhir && !(await ada(page, '.hasil'))) {
    // Chase the fish closest to the boat.
    const x = await page.evaluate(() => {
      const ikan = [...document.querySelectorAll('.benda-ikan')]
        .map((e) => e.getBoundingClientRect())
        .sort((a, b) => b.top - a.top)[0];
      return ikan ? ikan.left + ikan.width / 2 : null;
    });
    if (x !== null) {
      const tx = Math.max(kotak.x + 5, Math.min(kotak.x + kotak.width - 5, x));
      const ty = kotak.y + kotak.height / 2;
      await (sentuhan ? page.touchscreen.tap(tx, ty) : page.mouse.move(tx, ty)).catch(() => {});
    }
    await page.waitForTimeout(50);
  }

  const h = await tungguHasil(page);
  expect(h.angka).toBeGreaterThan(5);
  expect(await stempel(page)).toEqual({ danau: h.bintang });
});

test('Potret Satwa: all five animals end up in the album', async ({ page }) => {
  await kePeta(page);
  await bukaGame(page, 'rimba');

  const akhir = Date.now() + 70_000;
  while (Date.now() < akhir && !(await ada(page, '.hasil'))) {
    const satwa = page.locator('.intip.ada').first();
    if (await satwa.count()) await sentuh(page, satwa, { timeout: 500 }).catch(() => {});
    await page.waitForTimeout(70);
  }

  const h = await tungguHasil(page);
  expect(h.angka).toBe(5);
  expect(h.bintang).toBeGreaterThanOrEqual(2);
  expect(await stempel(page)).toEqual({ rimba: h.bintang });
});

test('Ikuti Irama: repeating the pattern wins, one slip is forgiven', async ({ page }) => {
  await kePeta(page);
  await bukaGame(page, 'rentak');

  // Write down which instrument lights up while the game is showing the pattern.
  await page.evaluate(() => {
    window.__urutan = [];
    const alat = [...document.querySelectorAll('.alat')];
    new MutationObserver((perubahan) => {
      for (const p of perubahan) {
        const menunjukkan = /[Ll]ihat/.test(document.querySelector('.rentak-status').textContent);
        if (p.target.classList.contains('nyala') && menunjukkan) window.__urutan.push(alat.indexOf(p.target));
      }
    }).observe(document.querySelector('.rentak-alat'), { attributes: true, attributeFilter: ['class'], subtree: true });
  });

  let sudahKeliru = false;
  const akhir = Date.now() + 70_000;
  while (Date.now() < akhir && !(await ada(page, '.hasil'))) {
    if (await ada(page, '#panggung.giliran')) {
      const urutan = await page.evaluate(() => window.__urutan.splice(0));
      if (!sudahKeliru && urutan.length === 3) {
        sudahKeliru = true;
        await sentuh(page, `.alat-${(urutan[0] + 1) % 4}`);
        await expect(page.locator('.rentak-status')).toContainText('Coba lagi');
        continue;
      }
      for (const i of urutan) {
        await sentuh(page, `.alat-${i}`);
        await page.waitForTimeout(240);
      }
    }
    await page.waitForTimeout(70);
  }

  const h = await tungguHasil(page);
  expect(sudahKeliru).toBe(true);
  expect(h.bintang, 'one slip still earns three stars').toBe(3);
  expect(await stempel(page)).toEqual({ rentak: 3 });
});

test('Cari Pasangan: pairs stay open, and the fifth stamp opens the mountain', async ({ page }) => {
  await denganStempel(page, { teh: 1, danau: 1, rimba: 1, rentak: 1 });
  await kePeta(page);
  await expect(page.locator('.pin[data-id="gunung"]')).toHaveClass(/pin-kunci/);
  await bukaGame(page, 'pasar');

  const nama = await page.locator('.kartu .kartu-depan b').allInnerTexts();
  expect(nama).toHaveLength(12);
  expect(new Set(nama).size).toBe(6);
  const kartu = (i) => page.locator('.kartu').nth(i);

  // One wrong try first: both cards turn back.
  await sentuh(page, kartu(0));
  await sentuh(page, kartu(nama.findIndex((n) => n !== nama[0])));
  await expect(page.locator('.kartu.buka')).toHaveCount(0, { timeout: 3000 });

  const selesai = new Set();
  for (let i = 0; i < 12; i++) {
    if (selesai.has(i)) continue;
    const j = nama.findIndex((n, k) => k > i && n === nama[i]);
    selesai.add(i).add(j);
    await sentuh(page, kartu(i));
    await sentuh(page, kartu(j));
    await expect(kartu(j)).toHaveClass(/cocok/);
  }

  const h = await tungguHasil(page);
  expect(h.angka).toBe(7);
  expect(h.bintang).toBe(3);
  await expect(page.locator('.hasil-catatan')).toContainText('terbuka');
  await sentuh(page, '#peta');
  await expect(page.locator('.pin[data-id="gunung"]')).not.toHaveClass(/pin-kunci/);
});
