const form=document.querySelector("#create-form");
const destination=document.querySelector("#destination");
const expiry=document.querySelector("#expiry");
const customExpiry=document.querySelector("#custom-expiry");
const startAt=document.querySelector("#start-at");
const limit=document.querySelector("#limit");
const customSlug=document.querySelector("#custom-slug");
const linkPassword=document.querySelector("#link-password");
const button=document.querySelector("#create-button");
const message=document.querySelector("#form-message");
const result=document.querySelector("#result");
const shortLink=document.querySelector("#short-link");
const expiryNote=document.querySelector("#expiry-note");
const copyButton=document.querySelector("#copy-button");
const qrButton=document.querySelector("#qr-button");
const qrDownload=document.querySelector("#qr-download");
const qrPanel=document.querySelector("#qr-panel");
const qrCanvas=document.querySelector("#qr-canvas");
const recentSection=document.querySelector("#recent-section");
const dashboardStorageLabel=document.querySelector("#dashboard-storage-label");
const recentList=document.querySelector("#recent-list");
const dashboardSummary=document.querySelector("#dashboard-summary");
const dashboardEmpty=document.querySelector("#dashboard-empty");
const linkSearch=document.querySelector("#link-search");
const linkFilter=document.querySelector("#link-filter");
const linkSort=document.querySelector("#link-sort");
const bulkUrls=document.querySelector("#bulk-urls");
const bulkExpiry=document.querySelector("#bulk-expiry");
const bulkCreate=document.querySelector("#bulk-create");
const bulkMessage=document.querySelector("#bulk-message");
const bulkResults=document.querySelector("#bulk-results");
const toast=document.querySelector("#toast");
const STORAGE_KEY="undolink.links.v1";
let activeLink=null;

const accountButton=document.querySelector("#account-button");
const accountLabel=document.querySelector("#account-label");
const accountModal=document.querySelector("#account-modal");
const accountBackdrop=document.querySelector("#account-backdrop");
const accountClose=document.querySelector("#account-close");
const accountForm=document.querySelector("#account-form");
const accountEmail=document.querySelector("#account-email");
const accountPassword=document.querySelector("#account-password");
const accountSubmit=document.querySelector("#account-submit");
const accountMessage=document.querySelector("#account-message");
const accountSwitch=document.querySelector("#account-switch");
const accountSwitchLabel=document.querySelector("#account-switch-label");
const accountTitle=document.querySelector("#account-title");
const accountCopy=document.querySelector("#account-copy");
let currentUser=null;
let accountMode="login";
let accountItems=[];


function notify(text){
  toast.textContent=text;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer=setTimeout(()=>toast.classList.remove("show"),2400);
}
function readLinks(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.slug==="string"&&typeof item.url==="string"):[];
  }catch{return []}
}
function saveLinks(items){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items));return true}
  catch{return false}
}
function niceDate(value){
  return new Date(value).toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
}
async function copy(text){
  try{
    if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(text);
    else{
      const field=document.createElement("textarea");
      field.value=text;
      field.setAttribute("readonly","");
      field.style.position="fixed";
      field.style.opacity="0";
      document.body.append(field);
      field.select();
      const copied=document.execCommand("copy");
      field.remove();
      if(!copied) throw new Error("Copy unavailable");
    }
    notify("Copied to clipboard");
  }catch{notify("Couldn't copy automatically. Select and copy the link instead.")}
}
function linkStatus(item){
  if(item.disabled)return "disabled";
  if(item.paused)return "paused";
  if(Number(item.expiresAt)<=Date.now())return "expired";
  if(item.scheduledAt&&Number(item.scheduledAt)>Date.now())return "scheduled";
  return "active";
}
function renderRecent(){
  const localItems=readLinks();
  const bySlug=new Map();
  for(const item of localItems)bySlug.set(item.slug,item);
  for(const item of accountItems){
    const local=bySlug.get(item.slug)||{};
    bySlug.set(item.slug,{...local,...item,manageKey:local.manageKey||null});
  }
  const items=[...bySlug.values()];
  recentSection.hidden=!items.length;
  dashboardStorageLabel.textContent=currentUser?"Synced to your account":"Saved on this device";
  recentList.replaceChildren();
  const counts={active:0,scheduled:0,paused:0,expired:0,disabled:0};
  for(const item of items)counts[linkStatus(item)]++;
  dashboardSummary.replaceChildren();
  for(const [label,value] of [["Total",items.length],["Active",counts.active],["Scheduled",counts.scheduled],["Paused",counts.paused],["Expired",counts.expired]]){
    const block=document.createElement("div");
    block.className="summary-item";
    const strong=document.createElement("strong");
    strong.textContent=String(value);
    const caption=document.createElement("span");
    caption.textContent=label;
    block.append(strong,caption);
    dashboardSummary.append(block);
  }
  const query=(linkSearch.value||"").trim().toLowerCase();
  const filter=linkFilter.value;
  const sort=linkSort.value;
  const visible=items.filter(item=>(!query||item.url.toLowerCase().includes(query)||item.slug.toLowerCase().includes(query))&&(filter==="all"||linkStatus(item)===filter));
  visible.sort((x,y)=>sort==="expiry"?Number(x.expiresAt)-Number(y.expiresAt):sort==="oldest"?Number(x.createdAt||0)-Number(y.createdAt||0):Number(y.createdAt||0)-Number(x.createdAt||0));
  dashboardEmpty.hidden=visible.length>0;
  for(const item of visible){
    const status=linkStatus(item);
    const row=document.createElement("div");
    row.className="recent-item";
    const main=document.createElement("div");
    main.className="recent-main";
    const a=document.createElement("a");
    a.href=item.url;
    a.textContent=item.url;
    a.target="_blank";
    a.rel="noopener noreferrer";
    const p=document.createElement("p");
    p.textContent=status==="disabled"?"Disabled":status==="paused"?"Paused":status==="scheduled"?"Starts "+niceDate(item.scheduledAt)+" · Expires "+niceDate(item.expiresAt):(status==="expired"?"Expired ":"Expires ")+niceDate(item.expiresAt);
    main.append(a,p);
    const actions=document.createElement("div");
    actions.className="recent-actions";
    const stats=document.createElement("button");
    stats.className="small-action";
    stats.type="button";
    stats.textContent="Stats";
    stats.addEventListener("click",()=>showStats(item,row,stats));
    actions.append(stats);
    const cp=document.createElement("button");
    cp.className="small-action";
    cp.type="button";
    cp.textContent="Copy";
    cp.addEventListener("click",()=>copy(item.url));
    actions.append(cp);
    if(status==="active"&&item.manageKey){
      const disable=document.createElement("button");
      disable.className="small-action";
      disable.type="button";
      disable.textContent="Disable";
      disable.addEventListener("click",()=>disableLink(item));
      actions.append(disable);
    }
    if(item.manageKey&&!item.disabled){
      if(status!=="expired"||item.paused){
        const pause=document.createElement("button");
        pause.className="small-action";
        pause.type="button";
        pause.textContent=item.paused?"Resume":"Pause";
        pause.addEventListener("click",()=>togglePause(item));
        actions.append(pause);
      }
      const extend=document.createElement("button");
      extend.className="small-action";
      extend.type="button";
      extend.textContent="Extend 24h";
      extend.addEventListener("click",()=>extendLink(item));
      actions.append(extend);
    }
    if(item.manageKey){
      const remove=document.createElement("button");
      remove.className="small-action";
      remove.type="button";
      remove.textContent="Delete";
      remove.addEventListener("click",()=>deleteLink(item));
      actions.append(remove);
    }
    row.append(main,actions);
    recentList.append(row);
  }
}
async function showStats(item,row,button){
  const existing=row.querySelector(".link-stats");
  if(existing){existing.remove();button.textContent="Stats";return}
  button.disabled=true;
  button.textContent="Loading…";
  try{
    const response=await fetch("/api/links/"+encodeURIComponent(item.slug),{
      method:"GET",
      headers:{"Authorization":"Bearer "+item.manageKey}
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Couldn't load analytics");
    const panel=document.createElement("div");
    panel.className="link-stats";
    const heading=document.createElement("strong");
    heading.textContent="Link activity";
    const summary=document.createElement("p");
    summary.textContent=data.clicks+" click"+(data.clicks===1?"":"s")+
      (data.maxClicks?" · limit "+data.maxClicks:" · no click limit")+
      " · "+(data.disabled?"disabled":data.paused?"paused":Number(data.expiresAt)<=Date.now()?"expired":data.scheduledAt&&Number(data.scheduledAt)>Date.now()?"scheduled":"active")+
      (data.passwordProtected?" · password protected":"")+
      (data.scheduledAt?" · starts "+niceDate(data.scheduledAt):"");
    panel.append(heading,summary);
    if(data.recentClicks&&data.recentClicks.length){
      const label=document.createElement("p");
      label.className="stats-label";
      label.textContent="Recent clicks";
      const list=document.createElement("ul");
      for(const timestamp of data.recentClicks){
        const li=document.createElement("li");
        li.textContent=niceDate(timestamp);
        list.append(li);
      }
      panel.append(label,list);
    }else{
      const empty=document.createElement("p");
      empty.textContent="No clicks recorded yet.";
      panel.append(empty);
    }
    row.append(panel);
    button.textContent="Hide stats";
  }catch(error){notify(error.message||"Couldn't load analytics");button.textContent="Stats"}
  finally{button.disabled=false}
}
async function disableLink(item){
  if(!confirm("Disable this temporary link now? Anyone using it afterward will no longer be redirected."))return;
  try{
    const response=await fetch("/api/links/"+encodeURIComponent(item.slug),{
      method:"PATCH",
      headers:{"Authorization":"Bearer "+item.manageKey,"Content-Type":"application/json"},
      body:JSON.stringify({disabled:true})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Could not disable link");
    saveLinks(readLinks().map(link=>link.slug===item.slug?{...link,disabled:true}:link));
    renderRecent();
    notify("Link disabled");
  }catch(error){notify(error.message||"Could not disable link")}
}
async function togglePause(item){
  const paused=!item.paused;
  try{
    const response=await fetch("/api/links/"+encodeURIComponent(item.slug),{
      method:"PATCH",
      headers:{"Authorization":"Bearer "+item.manageKey,"Content-Type":"application/json"},
      body:JSON.stringify({paused})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Could not update link");
    saveLinks(readLinks().map(link=>link.slug===item.slug?{...link,paused:data.paused}:link));
    renderRecent();
    notify(paused?"Link paused":"Link resumed");
  }catch(error){notify(error.message||"Could not update link")}
}
async function extendLink(item){
  try{
    const response=await fetch("/api/links/"+encodeURIComponent(item.slug),{
      method:"PATCH",
      headers:{"Authorization":"Bearer "+item.manageKey,"Content-Type":"application/json"},
      body:JSON.stringify({extendBy:86400})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Could not extend link");
    const items=readLinks().map(link=>link.slug===item.slug?{...link,expiresAt:data.expiresAt}:link);
    saveLinks(items);
    renderRecent();
    notify("Link extended by 24 hours");
  }catch(error){notify(error.message||"Could not extend link")}
}
async function deleteLink(item){
  if(!confirm("Permanently delete this UndoLink record? The original destination will not be affected."))return;
  try{
    const response=await fetch("/api/links/"+encodeURIComponent(item.slug),{
      method:"DELETE",
      headers:{"Authorization":"Bearer "+item.manageKey}
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Could not delete link");
    saveLinks(readLinks().filter(link=>link.slug!==item.slug));
    renderRecent();
    notify("Link record deleted");
  }catch(error){notify(error.message||"Could not delete link")}
}

async function createBulkLinks(){
  bulkMessage.textContent="";
  bulkResults.hidden=true;
  bulkResults.replaceChildren();
  const lines=bulkUrls.value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(!lines.length){bulkMessage.textContent="Paste at least one URL.";return}
  if(lines.length>10){bulkMessage.textContent="Create up to 10 links per batch.";return}
  const destinations=[];
  for(const line of lines){
    let url;
    try{url=new URL(line)}catch{bulkMessage.textContent="Invalid URL: "+line;return}
    if(!["http:","https:"].includes(url.protocol)||url.username||url.password){
      bulkMessage.textContent="Use public HTTP or HTTPS URLs without embedded login details.";
      return;
    }
    destinations.push(url.href);
  }
  if(new Set(destinations).size!==destinations.length){bulkMessage.textContent="Remove duplicate URLs before creating the batch.";return}
  bulkCreate.disabled=true;
  bulkCreate.querySelector("span").textContent="Creating…";
  const created=[];
  const failed=[];
  try{
    for(const destinationUrl of destinations){
      try{
        const response=await fetch("/api/links",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({destination:destinationUrl,expiresIn:Number(bulkExpiry.value)})
        });
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Creation failed");
        created.push({...data,createdAt:Date.now()});
      }catch(error){failed.push({url:destinationUrl,error:error.message||"Creation failed"});break}
    }
    if(created.length){
      const existing=readLinks();
      const records=created.map(item=>({slug:item.slug,url:item.url,expiresAt:item.expiresAt,createdAt:item.createdAt,manageKey:item.manageKey}));
      saveLinks([...records,...existing].slice(0,30));
      renderRecent();
    }
    bulkResults.hidden=false;
    for(const item of created){
      const row=document.createElement("div");
      row.className="bulk-result-row";
      const link=document.createElement("a");
      link.href=item.url;
      link.textContent=item.url;
      link.target="_blank";
      link.rel="noopener noreferrer";
      const copyButton=document.createElement("button");
      copyButton.className="small-action";
      copyButton.type="button";
      copyButton.textContent="Copy";
      copyButton.addEventListener("click",()=>copy(item.url));
      row.append(link,copyButton);
      bulkResults.append(row);
    }
    if(failed.length){
      bulkMessage.textContent=created.length+" created. Stopped after an error: "+failed[0].error;
    }else{
      bulkMessage.textContent=created.length+" temporary link"+(created.length===1?"":"s")+" created successfully.";
      bulkUrls.value="";
    }
  }finally{
    bulkCreate.disabled=false;
    bulkCreate.querySelector("span").textContent="Create links";
  }
}

function openAccountModal(mode="login"){
  accountMode=mode;
  accountMessage.textContent="";
  accountModal.hidden=false;
  updateAccountMode();
  accountEmail.focus();
}
function closeAccountModal(){accountModal.hidden=true}
function updateAccountMode(){
  const signup=accountMode==="signup";
  accountTitle.textContent=signup?"Create your account.":"Welcome back.";
  accountCopy.textContent=signup?"Save your links and manage them from any device.":"Log in to access your saved links on any device.";
  accountSubmit.querySelector("span").textContent=signup?"Create account":"Log in";
  accountPassword.autocomplete=signup?"new-password":"current-password";
  accountSwitchLabel.textContent=signup?"Already have an account?":"New to UndoLink?";
  accountSwitch.textContent=signup?"Log in":"Create an account";
}
async function syncAccountLinks(){
  if(!currentUser){accountItems=[];renderRecent();return}
  const local=readLinks();
  for(const item of local){
    if(!item.manageKey)continue;
    try{
      await fetch("/api/account/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:item.slug,manageKey:item.manageKey})});
    }catch{}
  }
  const response=await fetch("/api/account/links");
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"Couldn't load saved links.");
  accountItems=(data.links||[]).map(item=>{
    const saved=local.find(link=>link.slug===item.slug);
    return {...item,manageKey:saved?.manageKey||null};
  });
  renderRecent();
}
async function refreshAccount(){
  const response=await fetch("/api/auth/me");
  const data=await response.json();
  currentUser=data.user||null;
  accountButton.textContent=currentUser?"Log out":"Log in";
  accountLabel.textContent=currentUser?currentUser.email:"Guest mode";
  if(currentUser)await syncAccountLinks();
  else{accountItems=[];renderRecent()}
}
accountButton.addEventListener("click",async()=>{
  if(!currentUser){openAccountModal("login");return}
  if(!confirm("Log out of your UndoLink account?"))return;
  try{
    await fetch("/api/auth/logout",{method:"POST"});
    currentUser=null;
    accountItems=[];
    accountButton.textContent="Log in";
    accountLabel.textContent="Guest mode";
    renderRecent();
    notify("Logged out");
  }catch{notify("Couldn't log out. Please try again.")}
});
accountForm.addEventListener("submit",async event=>{
  event.preventDefault();
  accountMessage.textContent="";
  const email=accountEmail.value.trim();
  const password=accountPassword.value;
  if(password.length<10){accountMessage.textContent="Use a password with at least 10 characters.";return}
  accountSubmit.disabled=true;
  accountSubmit.querySelector("span").textContent=accountMode==="signup"?"Creating…":"Logging in…";
  try{
    const response=await fetch("/api/auth/"+accountMode,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Authentication failed.");
    currentUser=data.user;
    accountModal.hidden=true;
    accountPassword.value="";
    accountButton.textContent="Log out";
    accountLabel.textContent=currentUser.email;
    await syncAccountLinks();
    notify(accountMode==="signup"?"Account created":"Welcome back");
  }catch(error){accountMessage.textContent=error.message||"Please try again."}
  finally{accountSubmit.disabled=false;updateAccountMode()}
});
accountSwitch.addEventListener("click",()=>{
  accountMode=accountMode==="login"?"signup":"login";
  accountMessage.textContent="";
  updateAccountMode();
});
accountClose.addEventListener("click",closeAccountModal);
accountBackdrop.addEventListener("click",closeAccountModal);
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!accountModal.hidden)closeAccountModal();
});

form.addEventListener("submit",async event=>{
  event.preventDefault();
  message.textContent="";
  result.hidden=true;
  qrPanel.hidden=true;
  qrDownload.hidden=true;
  qrButton.textContent="Show QR code";
  let url;
  try{url=new URL(destination.value.trim())}
  catch{message.textContent="Enter a valid destination URL.";return}
  if(!["http:","https:"].includes(url.protocol)||url.username||url.password){
    message.textContent="Use a valid HTTP or HTTPS link without embedded login details.";
    return;
  }
  button.disabled=true;
  button.querySelector("span").textContent="Creating…";
  try{
    const startAtMs=startAt.value?Date.parse(startAt.value):null;
    if(startAt.value&&(!Number.isFinite(startAtMs)||startAtMs<=Date.now()||startAtMs>Date.now()+30*86400000)){
      message.textContent="Choose a future start time within the next 30 days.";
      return;
    }
    const customExpiryMs=expiry.value==="custom"?Date.parse(customExpiry.value):null;
    if(expiry.value==="custom"&&(!Number.isFinite(customExpiryMs)||customExpiryMs<=Date.now())){
      message.textContent="Choose a future expiry date and time.";
      return;
    }
    const effectiveExpiry=expiry.value==="custom"?customExpiryMs:(startAtMs||Date.now())+Number(expiry.value)*1000;
    if(startAtMs&&startAtMs>=effectiveExpiry){
      message.textContent="The expiry must be after the scheduled start time.";
      return;
    }
    const response=await fetch("/api/links",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        destination:url.href,
        expiresIn:expiry.value==="custom"?null:Number(expiry.value),
        expiresAt:customExpiryMs,
        startsAt:startAtMs,
        maxClicks:limit.value?Number(limit.value):null,
        customSlug:customSlug.value.trim().toLowerCase(),
        password:linkPassword.value
      })
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Something went wrong. Please try again.");
    activeLink=data;
    shortLink.href=data.url;
    shortLink.textContent=data.url;
    expiryNote.textContent="This link expires "+niceDate(data.expiresAt)+". After that, the UndoLink redirect will stop working.";
    result.hidden=false;
    const items=readLinks();
    items.unshift({slug:data.slug,url:data.url,expiresAt:data.expiresAt,scheduledAt:startAtMs,createdAt:Date.now(),manageKey:data.manageKey});
    const saved=saveLinks(items.slice(0,30));
    renderRecent();
    if(!saved){
      const note=result.querySelector(".manage-note");
      note.textContent="This browser couldn't save your private management key. Copy your link now; management may not be available after you leave this page.";
    }
    form.reset();
    expiry.value="3600";
    customExpiry.hidden=true;
    startAt.value="";
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(error){message.textContent=error.message||"Something went wrong. Please try again."}
  finally{
    button.disabled=false;
    button.querySelector("span").textContent="Create temporary link";
  }
});
expiry.addEventListener("change",()=>{
  customExpiry.hidden=expiry.value!=="custom";
  if(expiry.value==="custom")customExpiry.focus();
});
copyButton.addEventListener("click",()=>activeLink&&copy(activeLink.url));
qrButton.addEventListener("click",()=>{
  if(!activeLink)return;
  if(qrPanel.hidden){
    if(!window.QRCode){notify("QR code generator isn't available right now.");return}
    QRCode.toCanvas(qrCanvas,activeLink.url,{width:200,margin:2,color:{dark:"#252525",light:"#ffffff"}},error=>{
      if(error){notify("Couldn't generate the QR code.");return}
      qrPanel.hidden=false;
      qrDownload.hidden=false;
      qrButton.textContent="Hide QR code";
    });
  }else{
    qrPanel.hidden=true;
    qrDownload.hidden=true;
    qrButton.textContent="Show QR code";
  }
});
qrDownload.addEventListener("click",()=>{
  try{
    const link=document.createElement("a");
    link.download="undolink-qr.png";
    link.href=qrCanvas.toDataURL("image/png");
    link.click();
  }catch{notify("Couldn't download the QR code.")}
});
linkSearch.addEventListener("input",renderRecent);
linkFilter.addEventListener("change",renderRecent);
linkSort.addEventListener("change",renderRecent);
bulkCreate.addEventListener("click",createBulkLinks);
renderRecent();
refreshAccount().catch(()=>notify("Account status couldn’t be loaded."));
