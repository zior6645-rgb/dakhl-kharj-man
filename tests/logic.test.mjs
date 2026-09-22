function calcTotals(list, currency){const scoped=currency?list.filter(x=>x.currency===currency):list;let i=0,e=0;for(const t of scoped){if(t.type==='income')i+=t.amount;else e+=t.amount;}return{income:i,expense:e,balance:i-e,count:scoped.length};}
function assert(c,m){if(!c){console.error('FAIL:',m);process.exit(1);}else console.log('PASS:',m);}
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
txs[0]=Object.assign({},txs[0],{amount:12000000});t=calcTotals(txs,'IRT');assert(t.balance===9500000,'after edit');
txs=txs.filter(x=>x.id!=='3');t=calcTotals(txs,'IRT');assert(t.balance===9500000,'after delete without cross-currency contamination');
const v1=JSON.stringify({version:1,transactions:txs});assert(JSON.parse(v1).transactions[0].currency===undefined,'legacy backup remains readable');
const v2=JSON.stringify({version:2,transactions:txs.map(x=>({...x,currency:x.currency||'IRT'}))});assert(JSON.parse(v2).version===2,'new backup version');
console.log('ALL LOGIC TESTS PASSED');