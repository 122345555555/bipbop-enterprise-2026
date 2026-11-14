// Esegue la stessa suite della Preview senza browser, cloud o Supabase.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tests/amazon-smoke.html'),'utf8');
const output={textContent:''};
const sandbox={console,document:{getElementById(id){if(id!=='results')throw Error('Unexpected DOM id '+id);return output;}}};
vm.createContext(sandbox);
for(const name of ['utils','parser','reconcile','analytics']){
  const filename=path.join(root,'src',name+'.js');
  vm.runInContext(fs.readFileSync(filename,'utf8'),sandbox,{filename,timeout:15000});
}
const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)];
if(scripts.length!==1)throw Error('Expected one inline test script; found '+scripts.length);
vm.runInContext(scripts[0][1],sandbox,{filename:'tests/amazon-smoke.html',timeout:15000});
const result=output.textContent;
console.log(result);
const match=result.match(/^(\\d+)\\/(\\d+) test superati/);
if(!match || Number(match[2])<38 || match[1]!==match[2] || result.includes('FAIL') || result.includes('ERRORE')){
  console.error('Amazon smoke suite failed or fewer than 38 checks executed.');
  process.exitCode=1;
}
