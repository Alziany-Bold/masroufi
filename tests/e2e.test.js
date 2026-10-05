const fs=require('fs');const {JSDOM}=require('jsdom');
const {src:page}=require('../scripts/build.js');
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+page+'</body></html>';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const ok=(c,m)=>{console.log((c?'  PASS ':'  FAIL ')+m);if(!c)fails++};

function makeDB(){
  const docs=new Map(),subs=[];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const deep=(a,b)=>{const o={...a};for(const [k,v] of Object.entries(b))o[k]=(v&&typeof v==='object'&&!Array.isArray(v)&&o[k]&&typeof o[k]==='object')?deep(o[k],v):v;return o};
  const snapFor=col=>{const depth=col.split('/').length+1;return [...docs].filter(([p])=>p.startsWith(col+'/')&&p.split('/').length===depth).map(([p,d])=>({id:p.split('/').pop(),exists:true,data:()=>Object.freeze(clone(d))}))};
  const notify=()=>{for(const s of subs)setTimeout(()=>s.cb({docs:snapFor(s.col),metadata:{fromCache:false,hasPendingWrites:false}}),5)};
  const docRef=path=>({id:path.split('/').pop(),path,
    async get(){const d=docs.get(path);return {id:path.split('/').pop(),exists:!!d,data:()=>d&&clone(d)}},
    async set(d){docs.set(path,clone(d));notify()},
    async update(d){if(!docs.has(path))throw {code:'invalid_argument',message:'missing'};docs.set(path,deep(docs.get(path),clone(d)));notify()},
    async delete(){docs.delete(path);notify()},
    collection:sub=>colRef(path+'/'+sub)});
  const colRef=path=>{const q={_f:null,_d:'asc',
    doc:id=>docRef(path+'/'+id),limit(){return q},orderBy(f,d){q._f=f;q._d=d||'asc';return q},where(){return q},
    async get(){let l=snapFor(path);if(q._f)l.sort((a,b)=>(a.data()[q._f]>b.data()[q._f]?1:-1)*(q._d==='desc'?-1:1));return {docs:l,size:l.length,empty:!l.length}},
    onSnapshot(cb){subs.push({col:path,cb});setTimeout(()=>cb({docs:snapFor(path),metadata:{fromCache:false,hasPendingWrites:false}}),5);return ()=>{}}};return q};
  return {docs,api:{doc:docRef,collection:colRef}};
}
async function boot(db,uid,ls){
  const dom=new JSDOM(html,{url:'https://example.org/',runScripts:'dangerously',pretendToBeVisual:true,
    beforeParse(w){
      w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
      w.HTMLDialogElement.prototype.close=function(){this.open=false};
      w.matchMedia=()=>({matches:false,addEventListener(){}});
      w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
      if(ls)for(const [k,v] of Object.entries(ls))w.localStorage.setItem(k,v);
      if(db)w.claude={use:async n=>n==='db'?db.api:n==='user'?{id:async()=>uid}:null};
      w.addEventListener('error',e=>{console.log('  PAGE ERROR',e.message);fails++});
    }});
  await wait(120);return dom;
}
const $=(d,s)=>d.window.document.querySelector(s);
const click=(d,el)=>el.dispatchEvent(new d.window.MouseEvent('click',{bubbles:true}));
async function quick(d,text){const i=$(d,'#q-input');i.value=text;i.dispatchEvent(new d.window.Event('input',{bubbles:true}));$(d,'#q-form').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));await wait(30)}
const txt=(d,s)=>($(d,s)||{}).textContent||'';

(async()=>{
  console.log('# Local mode (no Claude account)');
  let d=await boot(null);
  ok(txt(d,'#book-pill').includes('شخصي'),'starts on the personal notebook');
  ok($(d,'#sync-btn').title.includes('هذا الجهاز'),'sync shows "this device only"');
  ok(txt(d,'#home-body').includes('مصروف'),'home renders the spending hero');
  ok(txt(d,'#home-body').includes('آخر ستة أشهر'),'six-month chart renders');
  ok(d.window.document.querySelectorAll('#trend .bar').length>0,'chart has bars');
  ok(txt(d,'#home-body').includes('أكبر مصروف'),'plain-words summary renders');
  await quick(d,'قهوة 15');
  ok(txt(d,'#toast').includes('قهوة'),'quick entry logs and toasts');
  // limits: sample has food limit 800
  ok(txt(d,'#home-body').includes('من الحد'),'category rows show limit progress');
  // business notebook
  click(d,$(d,'[data-act="books"]'));click(d,$(d,'[data-act="book-new"]'));
  $(d,'#bk-name').value='المحل';$(d,'#book-form').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));await wait(30);
  ok(txt(d,'#book-pill').includes('المحل'),'new business notebook becomes active');
  ok(txt(d,'#home-body').includes('صافي الربح'),'business home shows net profit');
  await quick(d,'مبيعات 1200');await quick(d,'بضاعة 800');await quick(d,'مسحوبات 100');
  const hero=txt(d,'.hero');
  ok(/٤٠٠/.test(hero),'profit = 1200 − 800 = 400 (owner draw excluded): '+hero.replace(/\s+/g,' ').slice(0,80));
  ok(txt(d,'#home-body').includes('سحبت لنفسك'),'summary mentions owner withdrawals separately');
  // switch back
  click(d,$(d,'[data-act="books"]'));click(d,[...d.window.document.querySelectorAll('[data-act="book-use"]')].find(b=>b.textContent.includes('شخصي')));await wait(20);
  ok(txt(d,'#book-pill').includes('شخصي')&&txt(d,'.hero').includes('مصروف'),'switching back restores the personal notebook');
  ok(!txt(d,'#home-body').includes('مبيعات 1200'),'business entries do not leak into personal');
  // settings: payday + privacy + PIN
  click(d,$(d,'[data-view="settings"]'));await wait(20);
  ok($(d,'#s-payday').options.length===28,'payday selector has 28 days');
  const ps=$(d,'#s-payday');ps.value='27';ps.dispatchEvent(new d.window.Event('change',{bubbles:true}));await wait(20);
  click(d,$(d,'[data-view="home"]'));await wait(20);
  ok(/–/.test(txt(d,'.eyebrow')),'with payday 27 the period shows a date range: '+txt(d,'.eyebrow'));
  click(d,$(d,'[data-act="privacy"]'));ok(d.window.document.body.classList.contains('privacy'),'eye button hides amounts');
  click(d,$(d,'[data-view="settings"]'));click(d,$(d,'[data-act="pin-set"]'));
  const press=async k=>{click(d,$(d,`#keypad [data-k="${k}"]`));await wait(5)};
  for(const k of '1234')await press(k);await wait(250);for(const k of '1234')await press(k);await wait(300);
  ok($(d,'#lock').hidden&&d.window.localStorage.getItem('masroufi:preview:v3:pin'),'PIN set after entering it twice');
  console.log('  local notebooks:',JSON.parse(d.window.localStorage.getItem('masroufi:preview:v3:books')).list.map(b=>b.name+'/'+b.type).join(', '));
  const ls1=Object.fromEntries(Object.keys(d.window.localStorage).map(k=>[k,d.window.localStorage.getItem(k)]));
  d.window.close();

  console.log('# Lock on next open');
  d=await boot(null,null,ls1);
  ok(!$(d,'#lock').hidden,'app opens locked when a PIN is set');
  for(const k of '9999'){click(d,$(d,`#keypad [data-k="${k}"]`));await wait(5)}await wait(300);
  ok(!$(d,'#lock').hidden&&txt(d,'#lock-err').includes('غير صحيح'),'wrong PIN is refused');
  for(const k of '1234'){click(d,$(d,`#keypad [data-k="${k}"]`));await wait(5)}await wait(300);
  ok($(d,'#lock').hidden,'right PIN unlocks');
  d.window.close();

  console.log('# Sync across two devices (same Claude account)');
  const db=makeDB();
  const A=await boot(db,'u_1',ls1);await wait(300);
  ok($(A,'#sync-btn').title.includes('متزامن'),'device A shows synced: '+$(A,'#sync-btn').title);
  const docIds=[...db.docs.keys()].map(p=>p.split('/').pop());
  ok(docIds.includes('books')&&docIds.includes('main.meta')&&docIds.some(x=>x.startsWith('main.m-')),'first sync uploads notebooks and months: '+docIds.slice(0,6).join(' '));
  ok(docIds.some(x=>x.endsWith('.meta')&&x!=='main.meta'),'business notebook uploaded too');
  const B=await boot(db,'u_1',{});await wait(400);
  ok(txt(B,'#book-pill').length>0,'device B opens');
  click(B,$(B,'[data-act="books"]'));
  ok(txt(B,'#books-list').includes('المحل'),'device B sees the business notebook from device A');
  click(B,$(B,'#sheet-books [data-close]'));
  const nA=JSON.parse(A.window.localStorage.getItem('masroufi:preview:v3:cloud:main')).tx.length;
  await quick(B,'غداء 33');await wait(400);
  const nA2=JSON.parse(A.window.localStorage.getItem('masroufi:preview:v3:cloud:main')).tx.length;
  ok(nA2===nA+1,'an entry added on device B appears on device A ('+nA+' → '+nA2+')');
  await quick(A,'عصير 9');await quick(B,'خبز 4');await wait(500);
  const ta=JSON.parse(A.window.localStorage.getItem('masroufi:preview:v3:cloud:main')).tx.map(t=>t.note);
  const tb=JSON.parse(B.window.localStorage.getItem('masroufi:preview:v3:cloud:main')).tx.map(t=>t.note);
  ok(ta.includes('عصير')&&ta.includes('خبز')&&tb.includes('عصير')&&tb.includes('خبز'),'entries added on both devices at once both survive');
  // delete on B propagates
  click(B,$(B,'[data-view="log"]'));await wait(20);
  const row=[...B.window.document.querySelectorAll('#log-list .tx')].find(r=>r.textContent.includes('خبز'));click(B,row);
  click(B,$(B,'#tx-del'));click(B,$(B,'#tx-del'));await wait(500);
  ok(!JSON.parse(A.window.localStorage.getItem('masroufi:preview:v3:cloud:main')).tx.some(t=>t.note==='خبز'),'a delete on device B reaches device A');
  // backups
  click(A,$(A,'[data-act="bk-now"]'));await wait(200);
  ok([...db.docs.keys()].some(p=>p.includes('/backups/')),'backup saved to the account');
  console.log(fails?`\n${fails} FAILED`:'\nALL PASSED');
  process.exit(fails?1:0);
})();
