import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {openDb,migrate} from '../src/db.mjs';
import {exportSnapshot} from './export-snapshot.mjs';
import {seed} from './seed.mjs';
const protectedTables=['users','roles','user_roles','groups','group_members','journal_sources','journal_observations','hypotheses','artifacts','artifact_revisions','attempts','code_runs','simulator_runs','comparisons','reviews','evidence','grade_entries','learning_events','mastery_snapshots','trajectory_decisions','appeals','notifications','research_consents','llm_interactions'];
async function fingerprints(db){const out={};for(const table of protectedTables){const rows=await db.rows('SELECT * FROM '+table);const text=rows.map(x=>JSON.stringify(x)).sort().join('\n');out[table]={count:rows.length,sha256:createHash('sha256').update(text).digest('hex')};}return out;}
const db=await openDb(),folder=resolve(process.argv[2]||'private/program-upgrade-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 await mkdir(folder,{recursive:true});
 const before=await fingerprints(db),snapshot=await exportSnapshot(db,{allowLegacySchema:true});
 await writeFile(resolve(folder,'before.sql'),snapshot.sql,{mode:0o600});await writeFile(resolve(folder,'before.json'),JSON.stringify({counts:snapshot.counts,protected:before},null,2),{mode:0o600});
 // Check the backup independently in a new embedded PostgreSQL, before touching the original schema.
 const restored=await openDb({memory:true});try{await migrate(restored);await restored.exec(snapshot.sql);const restoredHashes=await fingerprints(restored);if(JSON.stringify(restoredHashes)!==JSON.stringify(before))throw Error('Backup restore did not preserve protected records');}finally{await restored.close();}
 await migrate(db);const seeded=await seed(db),after=await fingerprints(db);
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Upgrade changed protected identities, marks or historical records. Restore from before.sql and investigate.');
 const result={date:'2026-10-29',seeded,backupRestored:true,protectedRecordsUnchanged:true,protectedCounts:Object.fromEntries(Object.entries(after).map(([k,v])=>[k,v.count])),cohorts:await db.rows("SELECT g.year,count(DISTINCT m.user_id)::int students FROM groups g JOIN group_members m ON m.group_id=g.id GROUP BY g.year ORDER BY g.year"),schemaVersions:(await db.rows('SELECT version FROM schema_migrations ORDER BY version')).map(x=>x.version)};
 await db.query("INSERT INTO audit_log(id,action,object_id,detail) VALUES($1,'curriculum.local_upgrade',$2,$3)",[crypto.randomUUID(),'pmo-program-2026-10-29',JSON.stringify({backupRestored:true,protectedRecordsUnchanged:true,counts:seeded})]);
 await writeFile(resolve(folder,'after.json'),JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify({folder,...result},null,2));
}finally{await db.close();}
