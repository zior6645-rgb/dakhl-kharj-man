// CSV restore verification
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
const utils=read('src/utils.ts');
const types=read('src/types.ts');
const css=read('src/styles.css');
const i18n=read('src/i18n.ts');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const androidManifest=read('android/app/src/main/AndroidManifest.xml');
const mainActivity=read('android/app/src/main/java/com/dakhlkharj/man/MainActivity.java');
const fileSaver=read('android/app/src/main/java/com/dakhlkharj/man/FileSaverPlugin.java');
const androidBuild=read('android/app/build.gradle');
const releaseWorkflow=read('.github/workflows/release.yml');

for(const token of ['HomeInsightId','homeInsightOrder','home-insights','home-card','balanceCard','monthIncomeCard','monthExpenseCard','latestTransactionCard']) {
  assert(!app.includes(token), 'home card code removed: '+token);
  assert(!types.includes(token), 'home card type removed: '+token);
  assert(!css.includes(token), 'home card css removed: '+token);
  assert(!i18n.includes(token), 'home card translation removed: '+token);
}

assert(app.includes('const categoryName ='), 'custom category label resolver exists');
assert(app.includes("Capacitor.getPlatform() === 'android'"), 'Android-specific export path is used');
assert(app.includes("registerPlugin<FileSaverPlugin>('FileSaver')"), 'native FileSaver plugin is registered');
assert(app.includes('utf8ToBase64'), 'UTF-8 content is converted to base64 for Android');
assert(app.includes('await FileSaver.saveFile'), 'Android export calls native file saver');
assert(app.includes("t(lang,'fileExportFailed')"), 'file export failure is reported instead of claiming success');
assert(app.includes("await deliverFile('dakhl-kharj-backup-v2.json'"), 'JSON backup uses the file delivery helper');
assert(app.includes("await deliverFile('dakhl-kharj.csv'"), 'CSV export uses the file delivery helper');
assert(app.includes("name.endsWith('.csv')"), 'CSV files are accepted for restore');
assert(app.includes('parseCSV(text)'), 'CSV restore uses the shared CSV parser');
assert(app.includes('categoryId'), 'CSV restore supports stable category IDs');
assert(app.includes('accept="application/json,.json,text/csv,.csv"'), 'file picker accepts JSON and CSV');
assert(utils.includes("categoryId,category"), 'CSV export includes both stable category ID and readable category label');
assert(utils.includes('export function parseCSV'), 'CSV parser exists');
assert(utils.includes('Unclosed CSV quote'), 'CSV parser rejects malformed quoted files');

assert(app.includes('categoryName(t.category)'), 'custom category search uses display labels');
assert(fs.existsSync(path.join(ROOT,'public','manifest.webmanifest')), 'web manifest exists');
assert(fs.existsSync(path.join(ROOT,'public','sw.js')), 'offline service worker exists');
assert(androidManifest.includes('android:allowBackup="false"'), 'Android backup disabled');
assert(androidManifest.includes('android:dataExtractionRules="@xml/backup_rules"'), 'Android 12+ backup rules configured');
assert(androidManifest.includes('android:fullBackupContent="@xml/backup_rules_legacy"'), 'legacy backup rules configured');
assert(androidManifest.includes('android:usesCleartextTraffic="false"'), 'cleartext traffic disabled');
assert(pkg.version==='1.6.0', 'package version is 1.6.0');
assert(lock.version==='1.6.0' && lock.packages?.['']?.version==='1.6.0', 'lockfile version matches package');
assert(mainActivity.includes('registerPlugin(FileSaverPlugin.class)'), 'Android FileSaver plugin is registered');
assert(fileSaver.includes('@CapacitorPlugin(name = "FileSaver")'), 'native FileSaver plugin declaration exists');
assert(fileSaver.includes('Intent.ACTION_CREATE_DOCUMENT'), 'native saver opens the Android save-file dialog');
assert(fileSaver.includes('Intent.CATEGORY_OPENABLE'), 'native saver requests a user-selectable file destination');
assert(fileSaver.includes('startActivityForResult(call, intent, SAVE_CALLBACK)'), 'native saver returns through a Capacitor activity callback');
assert(fileSaver.includes('@ActivityCallback'), 'native saver handles the Android activity result');
assert(fileSaver.includes('openOutputStream(uri)'), 'native saver writes to the location selected by the user');
assert(fileSaver.includes('ACTION_OPEN_DOCUMENT'), 'Android import opens the system file picker');
assert(fileSaver.includes('getPendingFile'), 'Android import can consume a directly opened file');
assert(fileSaver.includes('handleOnNewIntent'), 'Android receives file-open intents while Cashio is already running');
assert(fileSaver.includes('notifyListeners("fileOpen"'), 'Android file-open intent is delivered to the web app');
assert(androidManifest.includes('android.intent.action.VIEW'), 'Android manifest accepts file-open intents');
assert(androidManifest.includes('android.intent.action.SEND'), 'Android manifest accepts shared files');
assert(app.includes('FileSaver.pickFile'), 'Android import button uses the native file picker');
assert(app.includes('FileSaver.getPendingFile'), 'App checks for a directly opened file on startup');
assert(app.includes("FileSaver.addListener('fileOpen'"), 'App handles direct file-open events');
assert(app.includes('financialIndicators'), 'report UI includes focused financial indicators');
assert(app.includes('incomeExpenseLine'), 'report UI includes a line chart');
assert(app.includes('balanceTrend'), 'report UI includes a balance trend chart');
assert(app.includes('categoryChart'), 'report UI includes a category chart');
assert(app.includes('savingsRate'), 'report calculations include savings rate');
assert(app.includes('expenseRatio'), 'report calculations include expense ratio');
assert(app.includes('FileSaver.savePdf'), 'PDF export uses native PDF saving');
assert(fileSaver.includes('new PdfDocument'), 'PDF export creates a native Android PDF');
assert(fileSaver.includes('drawCategoryChart'), 'PDF includes category chart');
assert(fileSaver.includes('drawTrendChart'), 'PDF includes trend chart');
assert(!app.includes('cashflowCandles'), 'technical cash-flow candles are not shown in the app');
assert(!app.includes('cashflowMovingAverage'), 'technical moving-average chart is not shown in the app');
assert(!fileSaver.includes('drawCashCandleChart'), 'native PDF does not include misleading cash-flow candles');
assert(!fileSaver.includes('drawMovingAverageChart'), 'native PDF does not include unnecessary moving-average chart');
assert(fileSaver.includes('indicators'), 'PDF includes calculated indicators');
assert(fileSaver.includes('protected void handleOnNewIntent'), 'FileSaver handles Android new intents');
assert(androidBuild.includes('versionCode 16'), 'Android update code is incremented for the balance trend fix');
assert(app.includes('cloudAuthSetupHint'), 'Cloud setup message explains email and Supabase requirements');
assert(app.includes('fetchCloudData(session)'), 'Cloud mode validates backend connectivity before enabling');

assert(app.includes('exportPdf'), 'PDF export function exists');
assert(app.includes('FileSaver.savePdf'), 'Android PDF export uses native FileSaver');
assert(app.includes('pdfReportTitle'), 'PDF report has a localized title');
assert(fileSaver.includes('public void savePdf(PluginCall call)'), 'native PDF save method exists');
assert(fileSaver.includes('application/pdf'), 'native PDF exporter uses PDF MIME type');
assert(fileSaver.includes('new PdfDocument'), 'native PDF report is generated');
assert(fileSaver.includes('transactions'), 'native PDF report includes transactions');
assert(utils.includes('semicolonCount'), 'CSV parser detects semicolon-delimited files');
assert(androidBuild.includes('versionName "1.6.0"'), 'visible Android version remains 1.6.0');
assert(releaseWorkflow.includes('Run project tests'), 'release workflow runs project tests');


assert(read('src/cloud.ts').includes("type:'email'"), 'Cloud email OTP uses the current email verification type');
assert(read('src/cloud.ts').includes("authFetch('signup'"), 'Cloud account creation uses Supabase signup');
assert(read('src/cloud.ts').includes("authFetch('otp'"), 'Cloud signup explicitly sends email OTP');
assert(app.includes("if (!result?.saved)"), 'Android export checks the native saved confirmation instead of a nonexistent path');
assert(!app.includes("result?.path"), 'Android export does not require a nonexistent native path field');
assert(read('src/cloud.ts').includes('create_user:false'), 'Cloud OTP does not create an account during verification');
assert(fileSaver.includes('extractSharedUri'), 'Android import accepts shared content URIs');
assert(fileSaver.includes('getClipData'), 'Android import accepts ClipData shares');
assert(fileSaver.includes('detectMimeType'), 'Android import normalizes generic file MIME types by extension');
assert(androidManifest.includes('android:mimeType="application/octet-stream"'), 'Android manifest accepts generic downloaded files');
assert(androidManifest.includes('android:mimeType="text/plain"'), 'Android manifest accepts text/plain CSV downloads');
assert(androidManifest.includes('android:mimeType="application/vnd.ms-excel"'), 'Android manifest accepts spreadsheet MIME downloads');
assert(androidManifest.includes('android:mimeType="text/comma-separated-values"'), 'Android manifest accepts generic CSV sharing');
assert(app.includes("result?.error"), 'Native import errors are surfaced to the user');
assert(app.includes("result.session"), 'Cloud signup can immediately continue when Supabase returns a session');
assert(!read('FINAL_RELEASE_AUDIT_PROMPT.md').includes('Home should have a carousel'), 'Final audit no longer requires removed home carousel cards');
assert(read('FINAL_RELEASE_AUDIT_PROMPT.md').includes('OHLC'), 'Final audit avoids market/OHLC indicators for cashflow data');
assert(i18n.includes('cloudDataNote'), 'Cloud storage note exists for the cloud mode UI');
assert(app.includes("settings.storageMode==='cloud' ? t(lang,'cloudDataNote')"), 'Backup note matches the selected storage mode');

console.log('ALL LOGIC AND SOURCE-INTEGRITY TESTS PASSED');

assert(app.includes('className="report-page"'), 'report page wrapper exists');
assert(app.includes('className="report-kpi-grid"'), 'report KPI grid uses responsive layout');
assert(app.includes('className="report-chart-grid"'), 'report chart grid uses responsive layout');
assert(css.includes('.report-page .report-chart-grid'), 'report chart CSS exists');
assert(css.includes('@media (orientation:portrait)'), 'portrait orientation CSS exists');
assert(css.includes('@media (orientation:landscape)'), 'landscape orientation CSS exists');
assert(css.includes('.report-chart-svg'), 'report SVG sizing CSS exists');
assert(css.includes('.report-periods'), 'report period controls wrap');
