// Excel / CSV column detection and PDF statement lines.
global.XLSX=require('xlsx');
const {src:html}=require('../scripts/build.js');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const cut=(a,b)=>{const i=js.indexOf(a),j=js.indexOf(b,i);if(i<0||j<0)throw new Error('cut '+a);return js.slice(i,j)};
var document={querySelector:()=>null};var S={tx:[],settings:{digits:'latn',currency:'SAR'},recur:[],goals:[]};
var sortTx=x=>x.slice().sort((p,q)=>q.date.localeCompare(p.date));
var renderImpList=()=>{};
eval((cut('/* ---------------- constants','function sample(){')+cut('/* value readers */','function renderImpList')+cut('function recsFromLines','async function openImport')).replace(/^const /gm,'var ').replace(/^let /gm,'var '));

let fails=0;
const ok=(c,m)=>{console.log((c?'  PASS ':'  FAIL ')+m);if(!c)fails++};
const same=(got,want)=>Object.entries(want).every(([k,v])=>got&&got[k]===v);
function load(aoa){
  const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(aoa,{cellDates:true}),'S');
  const wb=XLSX.read(XLSX.write(w,{type:'array',bookType:'xlsx'}),{type:'array',cellDates:true});
  IMP={wb,kind:'sheet'};IMP.rows=XLSX.utils.sheet_to_json(wb.Sheets.S,{header:1,raw:true,defval:''});
  Object.assign(IMP,detectSheet(IMP.rows));IMP.subs=IMP.map.date<0&&(IMP.map.amount>=0||IMP.map.credit>=0);
  buildRecs();return IMP;
}

console.log('# Excel layouts');
let r=load([['مصاريفي لشهر أكتوبر'],[],['التاريخ','البيان','المبلغ','الفئة'],[new Date(2026,9,1),'إيجار الشقة',3500,'سكن'],['2026/10/03','قهوة',15,''],['04/10/2026','بنزين','60 ريال','مواصلات'],['','المجموع',3575,'']]);
ok(r.hdr===2&&r.list.length===3&&r.bad===1,'title row skipped, total row ignored');
ok(same(r.list[0],{cat:'home',amount:3500,date:'2026-10-01'})&&same(r.list[2],{cat:'transport',amount:60,date:'2026-10-04'}),'Arabic sheet: dates, amounts and categories');
r=load([['اسم الاشتراك','القيمة','يوم الدفع'],['نتفلكس',45,12],['النادي الرياضي',250,1],['فاتورة STC','115.00',27]]);
ok(r.subs&&same(r.list[0],{cat:'fun',day:12})&&same(r.list[1],{cat:'health'})&&same(r.list[2],{cat:'phone',day:27,amount:115}),'subscription list becomes monthly items');
r=load([['Date','Description','Debit','Credit','Balance'],['2026-10-01','SALARY OCT','','12,000.00','15,200.00'],['2026-10-02','POS STARBUCKS RIYADH','23.50','','15,176.50']]);
ok(same(r.list[0],{type:'income',cat:'salary',amount:12000})&&same(r.list[1],{type:'expense',cat:'food',amount:23.5}),'bank Debit/Credit columns');
r=load([[new Date(2026,9,2),'Uber trip',-32.5],[new Date(2026,9,3),'Refund amazon',120]]);
ok(r.hdr===-1&&same(r.list[0],{type:'expense',cat:'transport'})&&same(r.list[1],{type:'income'}),'no headers, signed amounts');
r=load([['التاريخ','الوقت','النوع','التصنيف','الوصف','المبلغ','الصندوق','تلقائي'],[new Date(2026,9,5),'09:30','مصروف','طعام ومطاعم','قهوة',14,'',''],[new Date(2026,9,1),'','دخل','راتب','راتب الشهر',12000,'','نعم']]);
ok(same(r.list[0],{cat:'food',time:'09:30'})&&same(r.list[1],{type:'income',cat:'salary',time:null}),'the app\'s own Excel export imports back');

console.log('# PDF statement lines');
const p=recsFromLines(['Statement of account  Page 1','01/10/2026  SALARY TRANSFER CREDIT  12,000.00  15,200.00','02/10/2026 14:05  POS PURCHASE STARBUCKS  23.50  15,176.50','2026-10-03  شراء  النهدي للأدوية  48.75  15,127.75','Total 12,072.25']);
ok(p.length===3&&same(p[0],{type:'income',amount:12000})&&same(p[1],{cat:'food',amount:23.5,time:'14:05'})&&same(p[2],{cat:'health',amount:48.75}),'statement rows read, header and total skipped');

console.log(fails?`\n${fails} FAILED`:'\nALL PASSED');process.exit(fails?1:0);
