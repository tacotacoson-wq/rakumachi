import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { parseProperty } from './property.js';

export const SOURCE = 'https://www.rakumachi.jp/syuuekibukken/area/prefecture/dimAll/?uiaid=sptop202003';
export function safeUrl(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || u.hostname !== 'www.rakumachi.jp' || u.port || u.username || u.password || !u.pathname.startsWith('/syuuekibukken/')) throw new Error('楽待の収益物件ページのHTTPS URLを指定してください。');
  return u.href;
}

async function navigate(page, url) {
  const response = await page.goto(safeUrl(url), { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`取得先が HTTP ${response?.status() ?? '不明'} を返しました。`);
  if (/captcha|アクセスが集中|アクセス制限|ロボットでは/i.test(await page.locator('body').innerText())) throw new Error('サイトが認証またはアクセス制限を要求しています。自動取得を停止しました。');
}

export async function scrape({ sourceUrl = SOURCE, pages = 1, limit = 20 }, progress) {
  let browser;
  try {
    const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({ locale: 'ja-JP' });
    // Do not permit arbitrary third-party navigation or credential submission.
    await context.route('**/*', route => {
      const request = route.request();
      const u = new URL(request.url());
      if (request.isNavigationRequest() && u.hostname !== 'www.rakumachi.jp') return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const urls = new Set();
    let next = safeUrl(sourceUrl);
    const visited = new Set();
    for (let i = 0; i < pages && next && !visited.has(next); i++) {
      visited.add(next);
      progress(`検索結果 ${i + 1} ページ目を取得中`);
      await navigate(page, next);
      const links = await page.locator('a[href]').evaluateAll(as => as.map(a => ({ href: a.href, text: a.textContent, rel: a.rel })));
      for (const a of links) if (/\/syuuekibukken\/.*\/\d+\/show\.html/.test(a.href)) { try { urls.add(safeUrl(a.href)); } catch {} }
      const n = links.find(a => a.rel === 'next' || /^(次へ|次のページ|次へ\s*[>»›])$/.test(a.text?.trim()));
      next = n ? safeUrl(n.href) : null;
      if (next && i + 1 < pages) await page.waitForTimeout(1500);
    }
    if (!urls.size) throw new Error('物件リンクを検出できませんでした。サイトの構造変更、JavaScript表示、アクセス制限の可能性があります。');
    const properties = [], errors = [];
    for (const url of [...urls].slice(0, limit)) {
      progress(`詳細を取得中 ${properties.length + errors.length + 1}/${Math.min(urls.size, limit)}`);
      try {
        await page.waitForTimeout(1500);
        await navigate(page, url);
        const more = page.getByText(/Webで続きを見る/i).first();
        if (await more.count()) {
          await more.click({ timeout: 10000 });
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(1000);
        }
        const property = parseProperty(await page.content(), url);
        property.expanded = await more.count() === 0 || !await more.isVisible();
        if (!property.expanded) { property.netIncome = null; property.netYield = null; property.missing.push('続きを見るの展開確認'); }
        properties.push(property);
      } catch (error) { errors.push({ url, message: error.message }); }
    }
    return { properties, errors, discovered: urls.size, capped: urls.size > limit, sourceUrl };
  } catch (error) {
    if (/ERR_CERT_AUTHORITY_INVALID/.test(error.message)) throw new Error('ブラウザが接続先の証明書を信頼できません。クラウドのプロキシCA証明書をブラウザの信頼ストアに登録して再試行してください。TLS検証は無効化しません。');
    if (/ERR_TUNNEL|ERR_PROXY/.test(error.message)) throw new Error('楽待への接続がネットワーク設定で拒否されました。環境設定で www.rakumachi.jp を許可して保存・公開してください。');
    throw error;
  } finally { await browser?.close(); }
}
