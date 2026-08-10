/**
 * Login/signup screen and session bootstrapping.
 */

function showAuth(message='',isError=false){
  document.getElementById('app').innerHTML=`<div class="auth-shell"><div class="auth-card"><div class="eyebrow">Pantry to Plate</div><h1>Meal Builder</h1><div class="subtitle">Sign in to keep your meals, snacks and history in your SQLite database.</div><div class="auth-tabs"><button class="auth-tab active" id="loginTab">Log in</button><button class="auth-tab" id="signupTab">Sign up</button></div><form id="authForm"><div class="auth-field"><label>Username</label><input id="authUsername" type="text" autocomplete="username" required minlength="3" placeholder="Choose a username"></div><div class="auth-field"><label>Password</label><input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters"></div><button class="btn btn-primary auth-submit" type="submit" id="authSubmit">Log in</button></form><div class="auth-message ${isError?'error':'ok'}" id="authMessage">${escapeHtml(message)}</div><div class="auth-note">Your account and Meal Builder data are stored in the local SQLite database on the server.</div></div></div>`;
  let mode='login'; const loginTab=document.getElementById('loginTab'),signupTab=document.getElementById('signupTab'),submit=document.getElementById('authSubmit'),form=document.getElementById('authForm'),msg=document.getElementById('authMessage');
  function setMode(next){mode=next;loginTab.classList.toggle('active',mode==='login');signupTab.classList.toggle('active',mode==='signup');submit.textContent=mode==='login'?'Log in':'Create account';document.getElementById('authPassword').setAttribute('autocomplete',mode==='login'?'current-password':'new-password');msg.textContent='';msg.className='auth-message';}
  loginTab.onclick=()=>setMode('login'); signupTab.onclick=()=>setMode('signup');
  form.onsubmit=async e=>{
    e.preventDefault(); submit.disabled=true; msg.textContent=mode==='login'?'Signing in…':'Creating account…'; msg.className='auth-message';
    const username=document.getElementById('authUsername').value.trim(), password=document.getElementById('authPassword').value;
    try{
      const result=await api(mode==='login'?'/api/login':'/api/signup',{method:'POST',body:JSON.stringify({username,password})});
      currentUser=result.user; await loadData();
    }catch(err){console.error(err);msg.textContent=err.message||'Authentication failed.';msg.className='auth-message error';submit.disabled=false;}
  };
}


async function signOut(){try{await api('/api/logout',{method:'POST',body:'{}'});}catch(e){} currentUser=null;dataLoaded=false;showAuth('You have been signed out.');}

async function initAuth(){
  try{ const result=await api('/api/me'); currentUser=result.user||null; }catch(e){ currentUser=null; }
  if(currentUser) await loadData(); else showAuth();
}
