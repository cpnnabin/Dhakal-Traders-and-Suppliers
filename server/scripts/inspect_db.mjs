import sqlite3 from 'sqlite3';
import path from 'path';
const dbFile = path.join(process.cwd(), 'admin.sqlite');
const db = new sqlite3.Database(dbFile);
function all(sql){return new Promise((res,rej)=>db.all(sql,(e,r)=>e?rej(e):res(r)));}
(async ()=>{
  try{
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('Tables:', tables.map(t=>t.name).join(', '));
    for (const t of tables) {
      try{
        const cnt = await all(`SELECT COUNT(*) as c FROM ${t.name}`);
        console.log(t.name, 'rows=', cnt[0].c);
      }catch(e){console.log('Could not count', t.name, e.message)}
    }
    db.close();
  }catch(e){console.error(e); db.close(); process.exit(1)}
})();
