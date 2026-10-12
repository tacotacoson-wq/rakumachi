const $ = id => document.getElementById(id);
const esc = s => String(s ?? '未掲載').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen = n => Number.isFinite(n) ? n.toLocaleString('ja-JP') + '円' : '不明';
const pct = n => Number.isFinite(n) ? n.toFixed(2) + '%' : '判定不能';
const webUrl = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? esc(u.href) : ''; } catch { return ''; } };
let shown = [], timer;
function card(p) {
  const img = webUrl(p.image), link = webUrl(p.url);
  return `<article class="card">${img ? `<img class="photo" src="${img}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer">` : '<div class="photo placeholder">写真なし</div>'}<div class="card-body"><div class="card-top"><div><h3>${esc(p.name)}</h3><div class="location">${esc(p.address)}<br>${esc(p.station)}</div></div><div class="yield"><small>実質利回り</small><strong>${pct(p.netYield)}</strong></div></div><div class="stats"><div><small>販売価格</small><b>${yen(p.price)}</b></div><div><small>表面利回り</small><b>${pct(p.surfaceYield)}</b></div><div><small>実質年間収入</small><b>${yen(p.netIncome)}</b></div><div><small>想定年間収入</small><b>${yen(p.annualIncome)}</b></div></div><div class="costs">管理費：${yen(p.managementFee)} / 月　修繕積立金：${yen(p.repairReserve)} / 月${p.missing.length ? '<br>判定不能：' + esc(p.missing.join('、')) : ''}</div><div class="card-foot"><span>築年月・築年数 ${esc(p.built)}</span><span>広さ ${esc(p.area)}</span>${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">物件の詳細 ↗</a>` : '<span>架空のサンプル</span>'}</div></div></article>`;
}
function render(job) {
  const all = job.properties;
  shown = all.filter(p => p.netYield !== null && p.netYield >= job.threshold).sort((a,b) => b.netYield-a.netYield);
  const unknown = all.filter(p => p.netYield === null);
  $('count').textContent = `${shown.length}件`;
  $('list').innerHTML = shown.length ? shown.map(card).join('') : '<div class="empty"><h3>条件に合う物件はありませんでした</h3><p>下限利回りや取得範囲を調整してください。</p></div>';
  $('summary').textContent = `${job.mode === 'demo' ? 'サンプル表示（すべて架空の物件）・' : ''}検出 ${job.discovered}件 / 詳細取得 ${all.length}件 / 条件未達 ${all.length-shown.length-unknown.length}件 / 判定不能 ${unknown.length}件 / 取得失敗 ${job.errors.length}件${job.capped ? '・取得上限により未取得の物件があります' : ''}。全掲載物件の網羅を保証する結果ではありません。`;
  $('unknown').hidden = !unknown.length;
  $('unknown').querySelector('summary').textContent = `費用などが不明な物件（${unknown.length}件）`;
  $('unknown').querySelector('div').innerHTML = unknown.map(card).join('');
  $('errors').textContent = job.errors.map(e=>`${e.url}: ${e.message}`).join('\n');
  $('export').hidden = !shown.length;
}
async function poll(id) {
  try {
    const response = await fetch('/api/job/' + id);
    const job = await response.json();
    if (!response.ok) throw new Error(job.error);
    if (job.status === 'failed') throw new Error(job.error);
    $('status').textContent = job.progress;
    if (job.status === 'done') { render(job); $('run').disabled = false; }
    else timer = setTimeout(() => poll(id), 1000);
  } catch(e) { $('status').textContent = e.message; $('status').className='error'; $('run').disabled=false; }
}
$('search').addEventListener('submit', async e => {
  e.preventDefault(); clearTimeout(timer); $('run').disabled=true; $('status').className=''; $('status').textContent='準備中…';
  $('list').innerHTML=''; $('summary').textContent=''; $('unknown').hidden=true; $('export').hidden=true; $('errors').textContent=''; $('count').textContent='—';
  try {
    const response = await fetch('/api/run', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ threshold:Number($('threshold').value), pages:Number($('pages').value), limit:Number($('limit').value), mode:$('mode').value, sourceUrl:$('source').value }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error); poll(data.id);
  } catch(e) { $('status').textContent=e.message; $('status').className='error'; $('run').disabled=false; }
});
$('export').addEventListener('click', () => {
  const fields=[['名称','name'],['販売価格','price'],['表面利回り%','surfaceYield'],['実質利回り%','netYield'],['実質年間収入','netIncome'],['想定年間収入','annualIncome'],['管理費月額','managementFee'],['修繕積立金月額','repairReserve'],['住所','address'],['交通','station'],['築年月・築年数','built'],['広さ','area'],['URL','url']];
  const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g,'""') + '"';
  const csv='\uFEFF'+[fields.map(([name])=>cell(name)).join(','), ...shown.map(p=>fields.map(([,key])=>cell(p[key])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download='rakumachi-results.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
