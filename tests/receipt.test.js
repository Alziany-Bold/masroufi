// Receipt photo: a simulated Claude reading fills the entry form for review.
const {JSDOM}=require('jsdom');
const {src:page}=require('../scripts/build.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let prompt='',fails=0;
  const ok=(c,m)=>{console.log((c?'  PASS ':'  FAIL ')+m);if(!c)fails++};
  const sample=Object.assign(async()=>({text:''}),{
    limits:async()=>({maxPromptBytes:262144,images:{maxCount:5,maxInputBytes:5e6,mediaTypes:['image/jpeg','image/png']}}),
    json:async p=>{prompt=p;return {amount:'86.25',merchant:'Panda Hypermarket',date:new Date(Date.now()-864e5).toISOString().slice(0,10),time:'18:42',category:'grocery'}}});
  const dom=new JSDOM('<!doctype html><html><body>'+page+'</body></html>',{url:'https://example.org/',runScripts:'dangerously',
    beforeParse(w){w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
      w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};
      w.claude={use:async n=>n==='sample'?sample:null};w.addEventListener('error',e=>{console.log('  PAGE ERROR',e.message);fails++})}});
  await wait(200);
  const $=s=>dom.window.document.querySelector(s);
  console.log('# Receipt photo');
  ok(!$('#rc-btn').hidden,'the receipt button appears when photo reading is available');
  const inp=$('#rc-file');Object.defineProperty(inp,'files',{value:[new dom.window.File([new Uint8Array(1000)],'r.jpg',{type:'image/jpeg'})],configurable:true});
  inp.dispatchEvent(new dom.window.Event('change'));await wait(100);
  ok($('#sheet-tx').open,'the entry form opens for review');
  ok($('#tx-amount').value==='86.25'&&$('#tx-note').value==='Panda Hypermarket','amount and shop filled in');
  ok(($('#tx-form [name=cat]:checked')||{}).value==='grocery','category filled in');
  ok(($('#tx-form [name=when]:checked')||{}).value==='y1','date read as yesterday');
  ok(prompt.includes('grocery')&&prompt.includes('Today is'),'the prompt lists categories and today\'s date');
  console.log(fails?`\n${fails} FAILED`:'\nALL PASSED');process.exit(fails?1:0);
})();
