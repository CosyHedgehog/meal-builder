/**
 * Talks to the SQLite-backed server API and keeps local state in sync
 * with it (load/save).
 */

/* ===================== SQLite backend ===================== */
let currentUser = null;

async function api(path, options={}){
  const res = await fetch(path, {headers:{"Content-Type":"application/json", ...(options.headers||{})}, ...options});
  let body=null; try{ body=await res.json(); }catch(e){}
  if(!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

function setSaveStatus(state){
  // Save status is no longer shown in the header.
}

async function loadData(){
  if(!currentUser) return;
  try{
    const result=await api('/api/data');
    const parsed=result.data || {};
    ingredients=Array.isArray(parsed.ingredients)?parsed.ingredients:[];
    meals=Array.isArray(parsed.meals)?parsed.meals:[];
    snacks=Array.isArray(parsed.snacks)?parsed.snacks:DEFAULT_SNACKS.map(s=>({...s}));
    logs=(parsed.logs&&typeof parsed.logs==='object')?parsed.logs:{};
    maintenanceCal=parsed.maintenanceCal||DEFAULT_MAINTENANCE;
  }catch(e){
    console.error('Load failed',e);
    ingredients=[]; meals=[]; snacks=DEFAULT_SNACKS.map(s=>({...s})); logs={}; maintenanceCal=DEFAULT_MAINTENANCE;
  }
  dataLoaded=true; renderApp();
}

async function saveData(){
  if(!dataLoaded||!currentUser) return;
  setSaveStatus('saving');
  try{
    await api('/api/data',{method:'PUT',body:JSON.stringify({ingredients,meals,snacks,logs,maintenanceCal})});
    setSaveStatus('ok');
  }catch(e){console.error('Save failed',e);setSaveStatus('error');}
}
