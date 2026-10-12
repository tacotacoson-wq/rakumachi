import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3000');
  await page.selectOption('#mode','demo');
  await page.click('#run');
  await page.waitForFunction(()=>document.querySelector('#count').textContent==='1件');
  assert.equal(await page.locator('#list .card').count(),1);
  assert.match(await page.locator('#list').innerText(),/12\.00%/);
  assert.match(await page.locator('#list').innerText(),/780,000円/);
  await page.locator('#unknown summary').click();
  assert.match(await page.locator('#unknown').innerText(),/判定不能/);
  const downloaded=page.waitForEvent('download');await page.click('#export');
  assert.equal((await downloaded).suggestedFilename(),'rakumachi-results.csv');
  await page.screenshot({path:'/tmp/rakumachi-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'/tmp/rakumachi-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS browser: sample search, calculation display, unknown costs, CSV, mobile layout, no JS errors');
} finally {await browser.close();}
