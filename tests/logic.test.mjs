import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function assert(c,m){if(!c){console.error('FAIL:',m);process.exit(1);}else console.log('PASS:',m);}

function calcTotals(list, currency){
  const scoped=currency?list.filter(x=>x.currency===currency):list;
  let i=0,e=0;
  for(const t of scoped){if(t.type==='income')i+=t.amount;else e+=t.amount;}
  return{income:i,expense:e,balance:i-e,count:scoped.length};
}

let txs=[
 {id:'1',type:'income',amount:10000000,currency:'IRT',title:'حقوق',category:'c1',date:'2026-09-01',time:'09:00',description:'',createdAt:'',updatedAt:''},
 {id:'2',type:'expense',amount:2500000,currency:'IRT',title:'اجاره',category:'c7',date:'2026-09-02',time:'10:00',description:'',createdAt:'',updatedAt:''},
 {id:'3',type:'income',amount:100,currency:'USD',title:'Test',category:'c1',date:'2026-09-03',time:'12:00',description:'',createdAt:'',updatedAt:''}
];
let t=calcTotals(txs,'IRT');
assert(t.balance===7500000,'IRT balance');
t=calcTotals(txs,'USD');
assert(t.balance===100,'USD balance is isolated');
t=calcTotals(txs);
assert(t.count===3,'all transaction count');
txs[0]=Object.assign({},txs[0],{amount:12000000});
t=calcTotals(txs,'IRT');
assert(t.balance===9500000,'after edit');
txs=txs.filter(x=>x.id!=='3');
t=calcTotals(txs,'IRT');
assert(t.balance===9500000,'after delete without cross-currency contamination');

const legacyTxs=txs.map(({currency,...rest})=>rest);
const v1=JSON.stringify({version:1,transactions:legacyTxs});
assert(JSON.parse(v1).transactions[0].currency===undefined,'legacy backup remains readable');
const v2=JSON.stringify({version:2,transactions:txs.map(x=>({...x,currency:x.currency||'IRT'}))});
assert(JSON.parse(v2).version===2,'new backup version');

const app=read('src/App.tsx');
const types=read('src/types.ts');
const css=read('src/styles.css');
const i18n=read('src/i18n.ts');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const androidManifest=read('android/app/src/main/AndroidManifest.xml');
const releaseWorkflow=read('.github/workflows/release.yml');

for(const token of ['HomeInsightId','homeInsightOrder','home-insights','home-card','balanceCard','monthIncomeCard','monthExpenseCard','latestTransactionCard']) {
  assert(!app.includes(token), 'home card code removed: '+token);
  assert(!types.includes(token), 'home card type removed: '+token);
  assert(!css.includes(token), 'home card css removed: '+token);
  assert(!i18n.includes(token), 'home card translation removed: '+token);
}

assert(app.includes('const categoryName ='), 'custom category label resolver exists');
assert(app.includes('categoryName(t.category)'), 'custom category search uses display labels');
assert(fs.existsSync(path.join(ROOT,'public','manifest.webmanifest')), 'web manifest exists');
assert(fs.existsSync(path.join(ROOT,'public','sw.js')), 'offline service worker exists');
assert(androidManifest.includes('android:allowBackup="false"'), 'Android backup disabled');
assert(androidManifest.includes('android:dataExtractionRules="@xml/backup_rules"'), 'Android 12+ backup rules configured');
assert(androidManifest.includes('android:fullBackupContent="@xml/backup_rules_legacy"'), 'legacy backup rules configured');
assert(androidManifest.includes('android:usesCleartextTraffic="false"'), 'cleartext traffic disabled');
assert(!androidManifest.includes('android.permission.INTERNET'), 'Android internet permission removed');
assert(!app.includes('storageMode'), 'cloud storage mode removed from UI logic');
assert(!app.includes('CloudAuthModal'), 'cloud authentication UI removed');
assert(!app.includes('supabase'), 'Supabase app integration removed');
assert(!releaseWorkflow.includes('VITE_SUPABASE_'), 'cloud build secrets removed');
assert(!fs.existsSync(path.join(ROOT,'src','cloud.ts')), 'cloud source file removed');
assert(pkg.version==='1.7.0', 'package version is 1.7.0');
assert(lock.version==='1.7.0' && lock.packages?.['']?.version==='1.7.0', 'lockfile version matches package');
assert(releaseWorkflow.includes('Run project tests'), 'release workflow runs project tests');

console.log('ALL LOGIC AND SOURCE-INTEGRITY TESTS PASSED');
