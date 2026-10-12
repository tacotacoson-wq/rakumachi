import { load } from 'cheerio';

export function money(value) {
  if (value == null) return null;
  const s = String(value).normalize('NFKC').replace(/[,\s]/g, '');
  if (/^(なし|無し|不要|無料|0円|0)$/.test(s)) return 0;
  if (!/\d/.test(s) || /未定|不明|相談|非公開|含む/.test(s)) return null;
  let total = 0;
  let matched = false;
  for (const [pattern, scale] of [[/(\d+(?:\.\d+)?)億/, 1e8], [/(\d+(?:\.\d+)?)万/, 1e4]]) {
    const match = s.match(pattern);
    if (match) { total += Number(match[1]) * scale; matched = true; }
  }
  const yen = s.match(/(?:^|億|万)(\d+(?:\.\d+)?)円/);
  if (yen) { total += Number(yen[1]); matched = true; }
  return matched ? total : /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : null;
}

export function calculate(property) {
  const { price, annualIncome, managementFee, repairReserve } = property;
  const missing = [['販売価格', price], ['想定年間収入', annualIncome], ['管理費月額', managementFee], ['修繕積立金月額', repairReserve]].filter(([, v]) => !Number.isFinite(v) || v < 0).map(([name]) => name);
  if (price === 0) missing.push('販売価格');
  const netIncome = missing.length ? null : annualIncome - (managementFee + repairReserve) * 12;
  return { ...property, netIncome, netYield: netIncome === null ? null : netIncome / price * 100, missing };
}

export function parseProperty(html, url) {
  const $ = load(html);
  $('script, style, nav, footer').remove();
  const fields = new Map();
  const clean = s => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
  $('tr').each((_, tr) => {
    const children = $(tr).children('th,td');
    for (let i = 0; i + 1 < children.length; i += 2) fields.set(clean($(children[i]).text()), clean($(children[i + 1]).text()));
  });
  $('dt').each((_, dt) => fields.set(clean($(dt).text()), clean($(dt).next('dd').text())));
  const get = (...labels) => {
    for (const label of labels) for (const [key, value] of fields) if (key.replace(/\s/g, '') === label) return value;
    return null;
  };
  const name = get('物件名', '物件名称') || clean($('h1').first().text()) || '名称不明';
  const price = money(get('販売価格', '物件価格', '価格'));
  const annualIncome = money(get('想定年間収入', '満室想定年間収入', '年間収入'));
  const surfaceText = get('表面利回り', '想定利回り', '利回り');
  const surfaceYield = surfaceText?.match(/([\d.]+)\s*%/) ? Number(surfaceText.match(/([\d.]+)\s*%/)[1]) : null;
  const image = $('meta[property="og:image"]').attr('content') || $('img').filter((_, img) => /物件|外観/.test($(img).attr('alt') || '')).first().attr('src');
  return calculate({ name, url, image: image ? new URL(image, url).href : null, price, annualIncome,
    managementFee: money(get('管理費(月額)', '管理費月額', '管理費')),
    repairReserve: money(get('修繕積立金(月額)', '修繕積立金月額', '修繕積立金')),
    surfaceYield, address: get('所在地', '住所'), station: get('交通', '最寄駅'),
    built: get('築年月', '築年数'), area: get('専有面積', '建物面積', '面積'),
    fetchedAt: new Date().toISOString(), fields: Object.fromEntries(fields) });
}
