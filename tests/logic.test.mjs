function calcTotals(list){let i=0,e=0;for(const t of list){if(t.type==='income')i+=t.amount;else e+=t.amount;}return{income:i,expense:e,balance:i-e,count:list.length};}
function assert(c,m){if(!c){console.error('FAIL:',m);process.exit(1);}else console.log('PASS:',m);}
let txs=[
 {id:'1',type:'income',amount:10000000,title:'حقوق',category:'حقوق',date:'2026-09-01',time:'09:00',description:'',createdAt:'',updatedAt:''},
 {id:'2',type:'expense',amount:2500000,title:'اجاره',category:'مسکن',date:'2026-09-02',time:'10:00',description:'',createdAt:'',updatedAt:''},
];
let t=calcTotals(txs);
assert(t.income===10000000,'income 10M');
assert(t.expense===2500000,'expense 2.5M');
assert(t.balance===7500000,'balance 7.5M');
txs=[Object.assign({},txs[0],{amount:12000000}),txs[1]];
t=calcTotals(txs);assert(t.balance===9500000,'after edit 9.5M');
txs.push({id:'3',type:'expense',amount:500000,title:'x',category:'y',date:'2026-09-03',time:'12:00',description:'',createdAt:'',updatedAt:''});
t=calcTotals(txs);assert(t.balance===9000000,'after add');
txs=txs.filter(x=>x.id!=='3');t=calcTotals(txs);assert(t.balance===9500000,'after delete');
const b=JSON.stringify({version:1,transactions:txs});
assert(calcTotals(JSON.parse(b).transactions).balance===9500000,'restore ok');
console.log('ALL LOGIC TESTS PASSED');
