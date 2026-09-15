import { readFile, readdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split(/\r?\n/).filter(l=>l && !l.startsWith('#') && l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
let photos=[];
for(let start=0;;start+=1000){const {data,error}=await db.from('inventory_photos').select('id,item_id,exact_sha1').not('exact_sha1','is',null).order('id').range(start,start+999);if(error)throw error;photos.push(...data);if(data.length<1000)break;}
const groups=new Map();
for(const p of photos){const set=groups.get(p.exact_sha1)??new Set();set.add(p.item_id);groups.set(p.exact_sha1,set);}
const shared=[...groups.values()].filter(g=>g.size>1);
const {data:items,error}=await db.from('inventory_items').select('id,item_code,name,tags').overlaps('tags',['audit-duplicate-candidate','audit-bad-image','audit-ignore-duplicate-candidate']);
if(error)throw error;
console.log(JSON.stringify({fingerprinted_photos:photos.length,shared_groups:shared.length,shared_items:new Set(shared.flatMap(g=>[...g])).size,duplicate_candidates:items.filter(i=>i.tags.includes('audit-duplicate-candidate')).length,bad_images:items.filter(i=>i.tags.includes('audit-bad-image')).length,sample:items.filter(i=>i.tags.includes('audit-duplicate-candidate')).slice(0,3).map(({id,item_code,name})=>({id,item_code,name}))},null,2));
