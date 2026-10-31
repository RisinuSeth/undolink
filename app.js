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
function notify(text){toast.textContent=text;toast.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove("show"),2200)}
function readLinks(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}}
function saveLinks(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}
function niceDate(value){return new Date(value).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}
async function copy(text){try{await navigator.clipboard.writeText(text);notify("Copied to clipboard")}catch{notify("Copy isn't available in this browser")}}
function renderRecent(){const items=readLinks();recentSection.hidden=!items.length;recentList.replaceChildren();for(const item of items){const row=document.createElement("div");row.className="recent-item";const main=document.createElement("div");main.className="recent-main";const a=document.createElement("a");a.href=item.url;a.textContent=item.url;a.target="_blank";a.rel="noopener";const p=document.createElement("p");p.textContent="Expires "+niceDate(item.expiresAt);main.append(a,p);const actions=document.createElement("div");actions.className="recent-actions";const cp=document.createElement("button");cp.className="small-action";cp.textContent="Copy";cp.addEventListener("click",()=>copy(item.url));const disable=document.createElement("button");disable.className="small-action";disable.textContent="Disable";disable.addEventListener("click",()=>disableLink(item));actions.append(cp,disable);row.append(main,actions);recentList.append(row)}}
async function disableLink(item){if(!confirm("Disable this temporary link now?"))return;try{const response=await fetch("/api/links/"+encodeURIComponent(item.slug),{method:"PATCH",headers:{"Authorization":"Bearer "+item.manageKey,"Content-Type":"application/json"},body:JSON.stringify({disabled:true})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not disable link");saveLinks(readLinks().filter(x=>x.slug!==item.slug));renderRecent();notify("Link disabled")}catch(e){notify(e.message)}}
form.addEventListener("submit",async event=>{event.preventDefault();message.textContent="";result.hidden=true;let url;try{url=new URL(destination.value.trim())}catch{message.textContent="Enter a valid destination URL.";return}if(!["http:","https:"].includes(url.protocol)){message.textContent="Only http:// and https:// links are supported.";return}button.disabled=true;button.querySelector("span").textContent="Creating…";try{const response=await fetch("/api/links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({destination:url.href,expiresIn:Number(expiry.value),maxClicks:limit.value?Number(limit.value):null})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Something went wrong. Please try again.");activeLink=data;shortLink.href=data.url;shortLink.textContent=data.url;expiryNote.textContent="This link expires "+niceDate(data.expiresAt)+". After that, the UndoLink redirect will stop working.";result.hidden=false;const items=readLinks();items.unshift({slug:data.slug,url:data.url,expiresAt:data.expiresAt,manageKey:data.manageKey});saveLinks(items.slice(0,20));renderRecent();form.reset();expiry.value="3600";result.scrollIntoView({behavior:"smooth",block:"nearest"})}catch(e){message.textContent=e.message}finally{button.disabled=false;button.querySelector("span").textContent="Create temporary link"}});
copyButton.addEventListener("click",()=>activeLink&&copy(activeLink.url));
renderRecent();
