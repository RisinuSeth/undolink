const form=document.querySelector("#create-form");
const destination=document.querySelector("#destination");
const expiry=document.querySelector("#expiry");
const limit=document.querySelector("#limit");
const button=document.querySelector("#create-button");
const message=document.querySelector("#form-message");
const result=document.querySelector("#result");
const shortLink=document.querySelector("#short-link");
const expiryNote=document.querySelector("#expiry-note");
const copyButton=document.querySelector("#copy-button");
const recentSection=document.querySelector("#recent-section");
const recentList=document.querySelector("#recent-list");
const toast=document.querySelector("#toast");
const STORAGE_KEY="undolink.links.v1";
let activeLink=null;

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
function renderRecent(){
  const items=readLinks();
  recentSection.hidden=!items.length;
  recentList.replaceChildren();
  for(const item of items){
    const expired=Number(item.expiresAt)<=Date.now();
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
    p.textContent=(expired?"Expired ":"Expires ")+niceDate(item.expiresAt);
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
    if(!expired&&item.manageKey){
      const disable=document.createElement("button");
      disable.className="small-action";
      disable.type="button";
      disable.textContent="Disable";
      disable.addEventListener("click",()=>disableLink(item));
      actions.append(disable);
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
      " · "+(data.disabled?"disabled":Number(data.expiresAt)<=Date.now()?"expired":"active");
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
    saveLinks(readLinks().filter(link=>link.slug!==item.slug));
    renderRecent();
    notify("Link disabled");
  }catch(error){notify(error.message||"Could not disable link")}
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

form.addEventListener("submit",async event=>{
  event.preventDefault();
  message.textContent="";
  result.hidden=true;
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
    const response=await fetch("/api/links",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        destination:url.href,
        expiresIn:Number(expiry.value),
        maxClicks:limit.value?Number(limit.value):null
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
    items.unshift({slug:data.slug,url:data.url,expiresAt:data.expiresAt,manageKey:data.manageKey});
    const saved=saveLinks(items.slice(0,30));
    renderRecent();
    if(!saved){
      const note=result.querySelector(".manage-note");
      note.textContent="This browser couldn't save your private management key. Copy your link now; management may not be available after you leave this page.";
    }
    form.reset();
    expiry.value="3600";
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(error){message.textContent=error.message||"Something went wrong. Please try again."}
  finally{
    button.disabled=false;
    button.querySelector("span").textContent="Create temporary link";
  }
});
copyButton.addEventListener("click",()=>activeLink&&copy(activeLink.url));
renderRecent();
