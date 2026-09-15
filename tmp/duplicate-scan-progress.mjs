import { readFile, readdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split(/\r?\n/).filter(l=>l && !l.startsWith('#') && l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
let photos=[];
for(let start=0;;start+=1000){const {data,error}=await db.from('inventory_photos').select('id,item_id,sort_order,created_at').order('id').range(start,start+999);if(error)throw error;photos.push(...data);if(data.length<1000)break;}
photos.sort((a,b)=>a.item_id.localeCompare(b.item_id)||a.sort_order-b.sort_order||a.created_at.localeCompare(b.created_at));
const files=await readdir('/var/folders/_d/y1nn030d3djc6pxdth4sn6tw0000gn/T/stagekit-inventory-audit-ZXwWYb');
console.log(JSON.stringify({total_photos:photos.length,active_positions:files.map(f=>photos.findIndex(p=>f.startsWith(p.id))+1)}));
