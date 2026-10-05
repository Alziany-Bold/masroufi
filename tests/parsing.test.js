// Quick entry ("قهوة 15") and bank SMS reading.
const {src:html}=require('../scripts/build.js');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const cut=(a,b)=>{const i=js.indexOf(a),j=js.indexOf(b,i);if(i<0||j<0)throw new Error('cut '+a);return js.slice(i,j)};
var document={querySelector:()=>null};var S={tx:[],settings:{digits:'latn',currency:'SAR'}};
var sortTx=x=>x.slice().sort((p,q)=>q.date.localeCompare(p.date));
eval(cut('/* ---------------- constants','function sample(){').replace(/^const /gm,'var ').replace(/^let /gm,'var '));

let fails=0;
const check=(name,got,want)=>{const bad=Object.entries(want).filter(([k,v])=>got[k]!==v);console.log((bad.length?'  FAIL ':'  PASS ')+name+(bad.length?'  got '+JSON.stringify(got):''));fails+=bad.length?1:0};
const t=iso(today()),y=iso(addDays(today(),-1));

console.log('# Quick entry');
check('قهوة 15',parseQuick('قهوة 15'),{amount:15,note:'قهوة',cat:'food',type:'expense',date:t});
check('بنزين ٦٠ أمس',parseQuick('بنزين ٦٠ أمس'),{amount:60,cat:'transport',date:y});
check('صرفت 50 على بنزين',parseQuick('صرفت 50 على بنزين'),{amount:50,note:'بنزين',cat:'transport'});
check('راتب 12000',parseQuick('راتب 12000'),{amount:12000,type:'income',cat:'salary'});
check('غداء مع الشباب 45.5',parseQuick('غداء مع الشباب 45.5'),{amount:45.5,cat:'food'});
check('unknown word',parseQuick('شي غريب 7'),{amount:7,cat:'other'});

console.log('# Bank SMS');
check('Arabic POS',parseSMS('شراء عبر نقاط البيع\nبطاقة: مدى *4821\nمبلغ: SAR 23.50\nلدى: STARBUCKS\nفي: '+t+' 14:32\nالرصيد: SAR 8,140.25'),{amount:23.5,note:'STARBUCKS',cat:'food',time:'14:32'});
check('English POS',parseSMS('PoS Purchase\nCard: *4821\nAmount: SAR 60.00\nAt: ALDREES 4512\nOn: '+y+' 21:10'),{amount:60,note:'ALDREES',cat:'transport',date:y});
check('balance ignored',parseSMS('Purchase of SAR 1,250.00 at IKEA RIYADH on 03/10/26. Avail Bal SAR 2,000'),{amount:1250,cat:'home'});
check('salary deposit',parseSMS('إيداع راتب\nمبلغ: 12,000.00 ر.س\nالرصيد 20,000'),{amount:12000,type:'income',cat:'salary'});
check('merchant after من',parseSMS('شراء انترنت بمبلغ 86.25 ريال من بنده'),{amount:86.25,note:'بنده',cat:'grocery'});

console.log(fails?`\n${fails} FAILED`:'\nALL PASSED');process.exit(fails?1:0);
