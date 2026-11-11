(function(){
  "use strict";
  const TABS=["new","explore","applied","replies","dealers","playbook"];
  const AREAS=["Bedford","Luton","Northampton","Milton Keynes"];
  const REPLY_STATES=["replied","interview","offer","started"];
  const LABEL={new:"New",applied:"Applied",replied:"Replied",interview:"Interview",offer:"Offer",started:"Started",rejected:"Not this time",dismissed:"Not for me",closed:"Closed"};
  const KEY="plan.status.v1";
  let jobs=[], dealers=[], explore=[], meta=null, exFilter="All", loaded=false, failed=false;
  let local={}; try{local=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(_){local={};}
  const view=document.getElementById("view");

  function save(){try{localStorage.setItem(KEY,JSON.stringify(local));}catch(_){}}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function safeUrl(u){u=String(u||"");return /^https?:\/\//i.test(u)?u:"";}
  function safeId(s){return String(s||"").toLowerCase().replace(/[^a-z0-9-]/g,"");}
  function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),1900);}
  function fmtDate(s){if(!s)return"";const d=new Date(s);return isNaN(d)?esc(s):d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});}
  const STALE_MS=26*3600*1000;
  function ago(iso){const t=Date.parse(iso);if(!t)return"";const m=Math.max(0,Math.round((Date.now()-t)/60000));if(m<60)return m<=1?"just now":m+" min ago";const h=Math.round(m/60);return h<24?h+" hr ago":fmtDate(iso);}
  function fresh(i){if(i.type==="speculative")return true;return !!i.checked&&(Date.now()-Date.parse(i.checked))<STALE_MS;}
  function current(){const h=(location.hash||"").slice(1);return TABS.includes(h)?h:"new";}
  function st(j){return (local[j.id]&&local[j.id].status)||j.status||"new";}
  function mailto(j){
    const body=(j.cover||"")+(/cv is attached/i.test(j.cover||"")?"":"\n\nMy CV is attached.");
    return `mailto:${encodeURIComponent(j.applyEmail)}?subject=${encodeURIComponent("Application: "+j.title+" – Rougier Williams")}&body=${encodeURIComponent(body)}`;
  }

  function card(j){
    const s=st(j), id=esc(j.id);
    const kind=j.type==="speculative"?"spec":(REPLY_STATES.includes(s)?"replied":"vacancy");
    const chips=[];
    if(j.pay)chips.push(`<span class="chip pay">${esc(j.pay)}</span>`);
    if(j.type==="speculative")chips.push(`<span class="chip warn">Ask directly</span>`);
    if(j.noExperienceOk)chips.push(`<span class="chip good">No experience needed</span>`);
    if(j.driveMins)chips.push(`<span class="chip">${esc(j.driveMins)} min drive</span>`);
    if(j.found)chips.push(`<span class="chip">Found ${fmtDate(j.found)}</span>`);
    if(j.checked)chips.push(`<span class="chip good">✓ Live, checked ${ago(j.checked)}</span>`);
    if(s!=="new")chips.push(`<span class="chip ${s==="rejected"?"bad":(REPLY_STATES.includes(s)?"good":"")}">${esc(LABEL[s]||s)}</span>`);
    const link=safeUrl(j.link), apply=safeUrl(j.applyUrl)||(j.applyEmail?"":link);
    const email=/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(String(j.applyEmail||""));
    const cvHref=j.cv?`cvs/${safeId(j.id)}.pdf`:"cvs/base.pdf";
    const cvName=`Rougier_Williams_CV_${String(j.company).replace(/[^A-Za-z0-9]+/g,"_")}.pdf`;
    let a1="", a2="";
    if(s==="new"){
      a1=`${apply?`<a class="btn primary" href="${esc(apply)}" target="_blank" rel="noopener" data-applying="${id}">${j.type==="speculative"?"Open careers page":"Go to apply page"}</a>`:""}
        ${email?`<a class="btn primary" href="${esc(mailto(j))}" data-applying="${id}">Email my application</a>`:""}
        ${link&&link!==apply?`<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">View listing</a>`:""}
        ${j.cover?`<button class="btn" data-copy="${id}">Copy message</button>`:""}`;
      a2=`<button class="btn cv" data-cv="${esc(cvHref)}" data-name="${esc(cvName)}">${j.cv?"Save tailored CV to Files":"Save my CV to Files"}</button>
        <button class="btn" data-set="applied" data-id="${id}">I applied</button>
        <button class="btn" data-set="dismissed" data-id="${id}">Not for me</button>
        ${j.type==="vacancy"?`<button class="btn" data-set="closed" data-id="${id}">Job's closed</button>`:""}`;
    }else{
      const opts=["applied","replied","interview","offer","started","rejected","new"].map(o=>`<option value="${o}"${o===s?" selected":""}>${o==="new"?"Move back to New":LABEL[o]}</option>`).join("");
      a1=`<label class="meta" for="sel-${id}">Status</label><select id="sel-${id}" data-status="${id}">${opts}</select>
        ${link?`<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Open listing</a>`:""}`;
      a2=`<button class="btn cv" data-cv="${esc(cvHref)}" data-name="${esc(cvName)}">Save CV I sent</button>${j.prep?`<button class="btn" data-prep="${id}">Interview prep</button>`:""}`;
    }
    const applied=local[j.id]&&local[j.id].appliedOn;
    return `<article class="card ${kind}">
      <h3>${esc(j.title)}</h3>
      <div class="meta">${esc(j.company)}${j.town?" · "+esc(j.town):""}${applied?" · applied "+fmtDate(applied):""}</div>
      ${chips.length?`<div class="chips">${chips.join("")}</div>`:""}
      ${j.fit?`<div class="fit">${esc(j.fit)}</div>`:""}
      ${j.replyNote?`<div class="fit"><b>Reply:</b> ${esc(j.replyNote)}</div>`:""}
      ${j.contact?`<div class="meta">Contact: ${esc(j.contact)}</div>`:""}
      ${email?`<div class="meta">Apply by email: ${esc(j.applyEmail)}</div>`:""}
      <div class="actions">${a1}</div>
      <div class="actions">${a2}</div>
      ${j.cv&&j.cv.changes?`<details><summary>How your CV was tailored</summary><ul class="cover">${j.cv.changes.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></details>`:""}
      ${j.cover?`<details><summary>Cover message</summary><div class="cover">${esc(j.cover)}</div></details>`:""}
    </article>`;
  }
  function exCard(x){
    const link=safeUrl(x.link), s=st(x), id=esc(x.id);
    const statusChip=s!=="new"?`<span class="chip ${s==="rejected"?"bad":(REPLY_STATES.includes(s)?"good":"")}">${esc(LABEL[s]||s)}</span>`:"";
    const applied=local[x.id]&&local[x.id].appliedOn;
    let actions;
    if(s==="new"){
      actions=`<div class="actions">${link?`<a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener" data-applying="${id}">Open job &amp; apply</a>`:""}<button class="btn cv" data-cv="cvs/base.pdf" data-name="Rougier_Williams_CV.pdf">Save my CV to Files</button></div>
      <div class="actions"><button class="btn" data-set="applied" data-id="${id}">I applied</button><button class="btn" data-set="dismissed" data-id="${id}">Not for me</button><button class="btn" data-set="closed" data-id="${id}">Job's closed</button></div>`;
    }else{
      const opts=["applied","replied","interview","offer","started","rejected","new"].map(o=>`<option value="${o}"${o===s?" selected":""}>${o==="new"?"Move back to Explore":LABEL[o]}</option>`).join("");
      actions=`<div class="actions"><label class="meta" for="sel-${id}">Status</label><select id="sel-${id}" data-status="${id}">${opts}</select>${link?`<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Open listing</a>`:""}</div>`;
    }
    return `<article class="card ${x.category==="Digital marketing"?"spec":"vacancy"}">
      <h3>${esc(x.title)}</h3>
      <div class="meta">${esc(x.company)} · ${esc(x.town)}${applied?" · applied "+fmtDate(applied):""}</div>
      <div class="chips"><span class="chip pay">${esc(x.pay)}</span><span class="chip">${esc(x.category)}</span>${x.driveMins?`<span class="chip">${esc(x.driveMins)} min drive</span>`:""}${x.closes&&s==="new"?`<span class="chip warn">Closes ${fmtDate(x.closes)}</span>`:""}${x.checked?`<span class="chip good">✓ Live, checked ${ago(x.checked)}</span>`:""}${statusChip}</div>
      ${x.why?`<div class="fit">${esc(x.why)}</div>`:""}
      ${actions}
    </article>`;
  }
  function goneCard(g){
    const s=st(g), id=esc(g.id), applied=local[g.id]&&local[g.id].appliedOn;
    const opts=["applied","replied","interview","offer","started","rejected"].map(o=>`<option value="${o}"${o===s?" selected":""}>${LABEL[o]}</option>`).join("");
    const cv=g.cvHref||"cvs/base.pdf", nm=`Rougier_Williams_CV_${String(g.company||"").replace(/[^A-Za-z0-9]+/g,"_")}.pdf`;
    return `<article class="card gone">
      <h3>${esc(g.title)}</h3>
      <div class="meta">${esc(g.company)}${g.town?" · "+esc(g.town):""}${applied?" · applied "+fmtDate(applied):""}</div>
      <div class="chips">${g.pay?`<span class="chip">${esc(g.pay)}</span>`:""}<span class="chip">No longer advertised</span><span class="chip">${esc(LABEL[s]||s)}</span></div>
      <div class="fit">The advert has been taken down, but your application still counts. Keep updating its status if they get back to you.</div>
      <div class="actions"><label class="meta" for="sel-${id}">Status</label><select id="sel-${id}" data-status="${id}">${opts}</select><button class="btn" data-cv="${esc(cv)}" data-name="${esc(nm)}">Save CV I sent</button></div>
    </article>`;
  }
  function anyCard(i){return i._gone?goneCard(i):i.category?exCard(i):card(i);}
  function listAny(a,msg){return a.length?a.map(anyCard).join(""):`<div class="empty">${msg}</div>`;}
  function list(a,msg){return a.length?a.map(card).join(""):`<div class="empty">${msg}</div>`;}
  const byFound=(a,b)=>String(b.found||"").localeCompare(String(a.found||""));

  function render(){
    const tab=current();
    const back=document.getElementById("back");if(back)back.style.display=(tab==="new")?"none":"";
    TABS.forEach(t=>{const b=document.getElementById("tab-"+t);if(t===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
    const nw=jobs.filter(j=>st(j)==="new"&&fresh(j));
    const vac=nw.filter(j=>j.type!=="speculative").sort(byFound), spec=nw.filter(j=>j.type==="speculative").sort(byFound);
    // Applied and Replies come from your saved progress, so jobs stay even after the advert is taken down.
    const tracked=Object.keys(local).filter(id=>TRACKED.includes(local[id].status)).map(id=>{
      const it=jobs.find(x=>x.id===id)||explore.find(x=>x.id===id);
      if(it&&fresh(it))return it;
      return Object.assign({id},local[id].snap||{title:"Saved job",company:""},{_gone:true});
    }).sort((a,b)=>String((local[b.id]||{}).appliedOn||"").localeCompare(String((local[a.id]||{}).appliedOn||"")));
    const applied=tracked.filter(j=>st(j)==="applied");
    const replies=tracked.filter(j=>REPLY_STATES.includes(st(j))||st(j)==="rejected");
    const live=replies.filter(j=>st(j)!=="rejected").length;
    document.getElementById("s-new").textContent=nw.length;
    document.getElementById("s-applied").textContent=applied.length;
    document.getElementById("s-replies").textContent=live;
    document.getElementById("s-dealers").textContent=dealers.length;
    const bn=document.getElementById("b-new");bn.hidden=!nw.length;bn.textContent=nw.length;
    const br=document.getElementById("b-replies");br.hidden=!live;br.textContent=live;
    if(meta&&meta.lastScan)document.getElementById("scanline").textContent=`Last checked ${fmtDate(meta.lastScan)} · ${meta.lastSummary||""}`;
    if(failed&&!jobs.length){view.innerHTML=`<div class="notice">Can't load your jobs right now. Check your signal and pull down to refresh.</div>`;return;}
    if(!loaded)return;
    const hr=new Date().getHours(), hi=hr<12?"Morning":hr<18?"Afternoon":"Evening";
    const noExp=vac.filter(j=>j.noExperienceOk).length, iv=replies.filter(j=>st(j)==="interview").length;
    let b=`${hi}, Rougier. `;
    if(jobs.some(j=>st(j)==="started"))b+="You're in the new job. Nice work.";
    else if(iv)b+=`You have ${iv} interview${iv>1?"s":""} lined up. Open Replies for your prep.`;
    else if(vac.length)b+=`${vac.length} job${vac.length>1?"s are":" is"} ready${noExp?`, ${noExp} with no experience needed`:""}. Save the tailored CV, copy the message, then apply.`;
    else b+="Nothing new right now. I check again every hour.";
    document.getElementById("brief").textContent=b;
    let h="";
    if(tab==="new"){
      h+=`<div class="sectionhead"><h2>Apply now</h2><small>${vac.length} live</small></div>`+list(vac,"No new vacancies. Next check at 6:31am or 5:31pm.");
      h+=`<div class="sectionhead"><h2>Ask directly</h2><small>${spec.length}</small></div>`+list(spec,"No direct approaches waiting.");
    }else if(tab==="explore"){
      const today=new Date().toISOString().slice(0,10);
      const live=explore.filter(x=>(!x.closes||x.closes>=today)&&st(x)==="new"&&fresh(x));
      const cats=["All",...new Set(live.map(x=>x.category))];
      if(!cats.includes(exFilter))exFilter="All";
      const shown=live.filter(x=>exFilter==="All"||x.category===exFilter);
      h+=`<div class="sectionhead"><h2>Explore</h2><small>${shown.length} vacancies</small></div>
      <p class="meta">Other jobs near you in your pay range: sales trainee, digital marketing and other well-paid trainee roles. Every link is tested before each update.</p>
      <div class="chips">${cats.map(c=>`<button class="btn${c===exFilter?" primary":""}" data-filter="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
      h+=shown.length?shown.map(exCard).join(""):`<div class="empty">Nothing in this group right now.</div>`;
    }else if(tab==="applied"){
      h+=`<div class="sectionhead"><h2>Applied</h2><small>${applied.length}</small></div>`+listAny(applied,"Nothing yet. When you come back from an apply page, PLAN asks if you applied and moves the job here.");
    }else if(tab==="replies"){
      h+=`<div class="sectionhead"><h2>Replies &amp; interviews</h2><small>${live} active</small></div>`+listAny(replies,"No replies yet. When a dealer gets back to you, open the job in Applied and change its status.");
    }else if(tab==="dealers"){
      h+=`<div class="sectionhead"><h2>Dealers watched</h2><small>${dealers.length}</small></div><p class="meta">Every dealer PLAN checks for you. The green tag shows how many jobs that dealer is advertising right now that suit you. Those jobs are in your New tab. "No jobs right now" just means nothing suitable is advertised today; you can still approach them directly.</p>`;
      const g={};dealers.forEach(d=>{const a=AREAS.includes(d.area)?d.area:"Other";(g[a]=g[a]||[]).push(d);});
      [...AREAS,"Other"].forEach(a=>{const ds=g[a];if(!ds)return;ds.sort((x,y)=>(y.openRoles||0)-(x.openRoles||0)||String(x.name).localeCompare(String(y.name)));
        h+=`<div class="area"><h3>${esc(a)}</h3>`+ds.map(d=>{const u=safeUrl(d.careersUrl),n=d.openRoles||0;
          return `<div class="dealer"><span class="n">${esc(d.name)}</span><span class="chip ${n?"good":""}">${n?(n===1?"1 job for you":n+" jobs for you"):"No jobs right now"}</span>
          <span class="m">${esc(d.group||"Independent")}${d.lastChecked?" · checked "+fmtDate(d.lastChecked):""}${d.note?" · "+esc(d.note):""}</span>
          ${u?`<a href="${esc(u)}" target="_blank" rel="noopener">Careers page</a>`:""}</div>`;}).join("")+`</div>`;});
    }else h+=document.getElementById("playbook").innerHTML;
    view.innerHTML=h;
  }

  const TRACKED=["applied","replied","interview","offer","started","rejected"];
  function snapOf(it){if(!it)return null;const o={};["title","company","town","pay","link","applyUrl","category","type","driveMins"].forEach(k=>{if(it[k]!=null)o[k]=it[k];});
    o.cvHref=it.category?"cvs/base.pdf":(it.cv?`cvs/${safeId(it.id)}.pdf`:"cvs/base.pdf");return o;}
  function setStatus(id,s){
    const cur=local[id]||{};if(cur.status===s)return;
    cur.status=s;if(s==="applied"&&!cur.appliedOn)cur.appliedOn=new Date().toISOString().slice(0,10);
    if(TRACKED.includes(s)){const it=jobs.find(x=>x.id===id)||explore.find(x=>x.id===id);if(it)cur.snap=snapOf(it);}
    local[id]=cur;save();render();toast(s==="closed"?"Removed. Thanks, it won't show again":s==="dismissed"?"Hidden":s==="new"?"Moved back":"Moved to "+(LABEL[s]||s));
  }
  const sheet=document.getElementById("sheet");
  function openSheet(t,body){document.getElementById("sheet-title").textContent=t;document.getElementById("sheet-body").innerHTML=body;sheet.classList.add("open");document.getElementById("sheet-close").focus();}
  document.getElementById("sheet-close").addEventListener("click",()=>sheet.classList.remove("open"));
  sheet.addEventListener("click",e=>{if(e.target===sheet)sheet.classList.remove("open");});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")sheet.classList.remove("open");});

  // Save a CV without leaving the app: share sheet (Save to Files) on iPhone, normal download elsewhere.
  async function saveCv(href,name,btn){
    const label=btn.textContent;btn.disabled=true;btn.textContent="Preparing CV…";
    try{
      const r=await fetch(href+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error("missing");
      const blob=await r.blob();
      const file=new File([blob],name,{type:"application/pdf"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:name});toast("Saved. Find it in Files");}
        catch(err){if(err&&err.name!=="AbortError")throw err;}
      }else{
        const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(u),4000);toast("CV downloaded");
      }
    }catch(_){toast("Couldn't get the CV. Check your signal and try again.");}
    finally{btn.disabled=false;btn.textContent=label;}
  }

  // When you leave to apply, ask on return whether you applied, then move it to Applied.
  let pending=null;
  function findItem(id){return jobs.find(x=>x.id===id)||explore.find(x=>x.id===id);}
  function askApplied(){
    if(!pending)return;const it=findItem(pending);const id=pending;pending=null;
    if(!it||st(it)!=="new")return;
    openSheet("Did you apply?",`<p style="font-size:16px"><b>${esc(it.title)}</b><br>${esc(it.company)} · ${esc(it.town||"")}</p>
      <div class="actions"><button class="btn primary" data-set="applied" data-id="${esc(id)}">Yes, move to Applied</button><button class="btn" data-close="1">Not yet</button></div>`);
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&pending)setTimeout(askApplied,400);});
  window.addEventListener("focus",()=>{if(pending)setTimeout(askApplied,400);});
  document.getElementById("sheet-body").addEventListener("click",e=>{
    const b=e.target.closest("[data-set]");if(b){setStatus(b.dataset.id,b.dataset.set);sheet.classList.remove("open");return;}
    if(e.target.closest("[data-close]"))sheet.classList.remove("open");
  });

  view.addEventListener("click",e=>{
    const ap=e.target.closest("[data-applying]");if(ap){pending=ap.dataset.applying;}
    const cv=e.target.closest("[data-cv]");if(cv){saveCv(cv.dataset.cv,cv.dataset.name,cv);return;}
    const c=e.target.closest("[data-copy]");
    if(c){const j=jobs.find(x=>x.id===c.dataset.copy);if(!j)return;
      (navigator.clipboard?navigator.clipboard.writeText(j.cover):Promise.reject()).then(()=>toast("Message copied")).catch(()=>toast("Open “Cover message” and copy it"));return;}
    const f=e.target.closest("[data-filter]");if(f){exFilter=f.dataset.filter;render();return;}
    const p=e.target.closest("[data-prep]");if(p){const j=jobs.find(x=>x.id===p.dataset.prep);if(j)openSheet(`Prep: ${j.company}`,`<div class="prep">${esc(j.prep)}</div>`);return;}
    const s=e.target.closest("[data-set]");if(s)setStatus(s.dataset.id,s.dataset.set);
  });
  view.addEventListener("change",e=>{const s=e.target.closest("[data-status]");if(s)setStatus(s.dataset.status,s.value);});
  document.querySelector("nav").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(!b)return;location.hash=b.dataset.tab;window.scrollTo(0,0);});
  window.addEventListener("hashchange",render);

  let lastStamp="";
  async function load(manual){
    const v="?t="+Date.now();
    try{
      const [a,b,c,x]=await Promise.all(["data/jobs.json","data/dealers.json","data/meta.json","data/explore.json"].map(u=>fetch(u+v,{cache:"no-store"}).then(r=>{if(!r.ok)throw 0;return r.json();})));
      jobs=Array.isArray(a)?a:[];dealers=Array.isArray(b)?b:[];meta=c||null;explore=Array.isArray(x)?x:[];failed=false;
      const stamp=(meta&&meta.lastScan)||"";if(lastStamp&&stamp!==lastStamp&&!manual)toast("PLAN just updated");lastStamp=stamp;
    }catch(_){failed=true;}
    loaded=true;render();
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")load();});
  document.getElementById("refresh").addEventListener("click",()=>{load(true).then(()=>toast("Up to date"));});
  document.getElementById("back").addEventListener("click",()=>{if(history.length>1&&document.referrer.indexOf(location.host)>-1)history.back();else{location.hash="new";}window.scrollTo(0,0);});
  // Live updates: check for new data every 60 seconds while the app is open.
  setInterval(()=>{if(document.visibilityState==="visible")load(false);},60000);
  // Pull down from the top to refresh.
  (function(){
    const ind=document.getElementById("ptr");let startY=null,pull=0,busy=false;const MAX=90,TRIGGER=65;
    function set(px,txt){ind.style.height=px+"px";ind.textContent=txt;ind.classList.toggle("on",px>0);}
    window.addEventListener("touchstart",e=>{if(busy||window.scrollY>0||document.getElementById("sheet").classList.contains("open"))return;startY=e.touches[0].clientY;pull=0;},{passive:true});
    window.addEventListener("touchmove",e=>{if(startY===null)return;const dy=e.touches[0].clientY-startY;if(dy<=0||window.scrollY>0){pull=0;set(0,"");return;}
      pull=Math.min(MAX,dy*0.5);set(pull,pull>=TRIGGER?"Release to refresh":"Pull to refresh");},{passive:true});
    window.addEventListener("touchend",async()=>{if(startY===null)return;startY=null;
      if(pull>=TRIGGER){busy=true;set(44,"Checking for updates…");await load(true);set(44,"Up to date");setTimeout(()=>{set(0,"");busy=false;},700);}else set(0,"");pull=0;});
  })();

  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(_){}
  render();load();
})();
