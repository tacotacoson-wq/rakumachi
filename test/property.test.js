import test from 'node:test';
import assert from 'node:assert/strict';
import { money, calculate, parseProperty } from '../lib/property.js';
import { safeUrl, checkResponse } from '../lib/scraper.js';
test('Japanese prices preserve mixed units and zero fees',()=>{
  assert.equal(money('1億2,500万円'),125000000);
  assert.equal(money('7万5000円'),75000);
  assert.equal(money('１２．５万円'),125000);
  assert.equal(money('なし'),0);
  assert.equal(money('不明'),null);
  assert.equal(money('賃料に含む'),null);
});
test('net annual income and threshold arithmetic',()=>{
  const p=calculate({price:6500000,annualIncome:900000,managementFee:6000,repairReserve:4000});
  assert.equal(p.netIncome,780000);assert.equal(p.netYield,12);
});
test('missing costs and zero price never produce qualifying yield',()=>{
  assert.equal(calculate({price:100,annualIncome:20,managementFee:null,repairReserve:0}).netYield,null);
  assert.equal(calculate({price:0,annualIncome:20,managementFee:0,repairReserve:0}).netYield,null);
});
test('detail table extraction keeps all available fields',()=>{
  const p=parseProperty('<h1>テスト物件</h1><table><tr><th>販売価格</th><td>650万円</td><th>想定年間収入</th><td>90万円</td></tr><tr><th>管理費（月額）</th><td>6,000円</td></tr><tr><th>修繕積立金（月額）</th><td>4,000円</td></tr></table>','https://www.rakumachi.jp/syuuekibukken/x/1/show.html');
  assert.equal(p.name,'テスト物件');assert.equal(p.price,6500000);
  assert.equal(p.netIncome,780000);assert.equal(p.netYield,12);
});
test('source URL rejects arbitrary hosts and credentials',()=>{
  for(const u of ['http://www.rakumachi.jp/syuuekibukken/','https://evil.com/syuuekibukken/','https://user:pass@www.rakumachi.jp/syuuekibukken/'])assert.throws(()=>safeUrl(u));
});
test('denial reports stage and source URL, successful response proceeds',()=>{
  checkResponse(200, 'https://www.rakumachi.jp/syuuekibukken/', '検索結果 1 ページ目');
  assert.throws(()=>checkResponse(403, 'https://www.rakumachi.jp/syuuekibukken/', '検索結果 1 ページ目'), error=>error.status===403 && error.message.includes('検索結果 1 ページ目') && error.message.includes('https://www.rakumachi.jp/syuuekibukken/') && error.message.includes('停止'));
  assert.throws(()=>checkResponse(403, 'https://www.rakumachi.jp/syuuekibukken/x/1/show.html', '物件の詳細ページ'), /物件の詳細ページ/);
});
