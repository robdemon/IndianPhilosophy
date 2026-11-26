'use strict';
// ─── Colour palette ───────────────────────────────────────────────────────────
const C={
  purple:'#7F77DD',teal:'#1D9E75',coral:'#D85A30',pink:'#D4537E',
  blue:'#378ADD',amber:'#EF9F27',green:'#639922',red:'#E24B4A',
  gray:'#888780',indigo:'#5B6FBB',rose:'#C25B7A',ochre:'#B87333',
  sage:'#6B8A6B',slate:'#5E7080',plum:'#8B5A8B',sienna:'#A05030'
};

const MAP_COMS=[
  {k:'vy', n:'Vyāsa · Yoga Bhāṣya'},
  {k:'vb', n:'Vijñānabhikṣu · Yoga-Vārttika'},
  {k:'vm', n:'Vācaspati Miśra · Tattva-Vaiśāradī'},
  {k:'sk', n:'Śaṅkara · Vivaraṇa'},
  {k:'gp', n:'Gauḍapāda · Bhāṣya'},
  {k:'tk', n:'Vācaspati Miśra · Tattvakaumudī'},
  {k:'mat',n:'Māṭhara · Māṭharāvṛtti'},
  {k:'vts',n:'Vātsyāyana · Nyāya Bhāṣya'},
  {k:'udd',n:'Uddyotakara · Nyāya Vārttika'},
  {k:'vmt',n:'Vācaspati Miśra · Tātparya-Ṭīkā'},
  {k:'uda',n:'Udayana · Nyāya-Pariśuddhi'},
  {k:'rgh',n:'Raghunātha Śiromaṇi · Bhāṣā-Pariccheda'},
  {k:'vis',n:'Viśvanātha · Nyāya-Sūtra-Vṛtti'},
  {k:'prs',n:'Praśastapāda · Padārthadharmasaṃgraha'},
  {k:'sbt',n:'Śabara · Mīmāṃsā Bhāṣya'},
  {k:'kum',n:'Kumārila Bhaṭṭa · Ślokavārttika'},
  {k:'prb',n:'Prabhākara · Bṛhatī'},
  {k:'shk',n:'Śaṅkara · Bhāṣya'},
  {k:'rmj',n:'Rāmānuja · Śrī-Bhāṣya'},
  {k:'mdv',n:'Madhva · Anuvyākhyāna'},
  {k:'nim',n:'Nimbārka · Vedānta-Pārijāta-Saurabha'},
  {k:'val',n:'Vallabha · Aṇubhāṣya'},
  {k:'syk',n:'Sāyaṇa · Commentary'},
  {k:'mhi',n:'Mahīdhara · Vedadīpa'},
  {k:'uvt',n:'Uvvaṭa · Commentary'},
  {k:'ksm',n:'Kṣemarāja · Śiva-Sūtra-Vimarśinī'},
  {k:'bhk',n:'Bhāskara · Vārttika'},
  {k:'abg',n:'Abhinavagupta · Tantrāloka & Tantric Corpus'},
  {k:'lkj',n:'Swami Lakshmanjoo · The Supreme Awakening'},
  {k:'jds',n:'Jaideva Singh · English Critical Edition'},
  {k:'jrv',n:'Jayaram V · Translation & Commentary'},
  {k:'asu',n:'Adi Suyash · Threads of Transcendence'},
];

// ─── Shared render helpers ────────────────────────────────────────────────────
function safeHtml(s){return s||'';}

function renderDetail(d,color,id){
  if(!d)return'';
  let h=`<div class="detail-panel" id="d${id}" style="--accent:${color}">`;
  if(d.skt){h+=`<div class="skt-block">${safeHtml(d.skt)}</div>`;}
  if(d.tr){h+=`<div class="detail-section"><div class="detail-label">Translation</div><div class="detail-text">${safeHtml(d.tr)}</div></div>`;}
  if(d.c){h+=`<div class="detail-section"><div class="detail-label">Concept &amp; Meaning</div><div class="detail-text">${safeHtml(d.c)}</div></div>`;}
  if(d.ex){h+=`<div class="detail-section"><div class="detail-label">Example &amp; Application</div><div class="detail-text">${safeHtml(d.ex)}</div></div>`;}
  const comDefs=MAP_COMS;
  const present=comDefs.filter(x=>d[x.k]);
  if(present.length){
    h+=`<div class="detail-section"><div class="detail-label">Classical Commentaries</div><div class="commentaries-wrap">`;
    present.forEach(x=>{
      h+=`<div class="detail-commentary"><div class="com-name">${x.n}</div><div class="com-text">${safeHtml(d[x.k])}</div></div>`;
    });
    h+=`</div></div>`;
  }
  h+=`</div>`;return h;
}

function renderLeaf(l,color){
  const id='L'+Math.random().toString(36).slice(2,9);
  const has=!!l.det;
  const hint=has?`<div class="lf-expand">&#9654; tap for commentaries</div>`:'';
  const oc=has?`onclick="toggleDetail('${id}',event)"`:'';
  return`<div class="leaf" ${oc}>
    <div class="lf-dot" style="background:${color}"></div>
    <div class="leaf-content">
      <div><span class="lf-name">${l.n}</span><span class="lf-ref">${l.r||''}</span></div>
      ${l.sk?`<span class="lf-skt">${l.sk}</span>`:''}
      <div class="lf-desc">${l.d}</div>
      ${hint}
      ${has?renderDetail(l.det,color,id):''}
    </div>
  </div>`;
}

function renderBranch(b,idx){
  const id='B'+idx+'_'+Math.random().toString(36).slice(2,6);
  let body='';
  if(b.sub){b.sub.forEach(s=>{
    body+=`<div class="sub-tree">`;
    if(s.label)body+=`<div class="sub-label">${s.label}</div>`;
    s.children.forEach(c=>{body+=renderLeaf(c,b.color);});
    body+=`</div>`;
  });}
  if(b.children){b.children.forEach(c=>{body+=renderLeaf(c,b.color);});}
  return`<div class="branch">
    <div class="branch-head" onclick="toggleBranch('BB${id}',this)">
      <div class="dot" style="background:${b.color}"></div>
      <div class="label">${b.name}</div>
      <div class="ref">${b.ref||''}</div>
      <div class="chev">&#9654;</div>
    </div>
    <div class="branch-body" id="BB${id}">${body}</div>
  </div>`;
}

// Map view: topic list on the left, the selected topic's full detail on the right (sticky),
// so a whole chapter and one passage's commentaries are visible together without expanding cards.
function mapDetailHTML(l,color){
  let h=`<div class="mx-dhead"><span class="mx-dref">${l.r||''}</span><h3>${l.n}</h3>${l.sk?`<div class="mx-dsk">${l.sk}</div>`:''}</div>`;
  if(l.d)h+=`<p class="mx-ddesc">${l.d}</p>`;
  const d=l.det;
  if(!d)return h;
  if(d.skt)h+=`<div class="mx-skt">${d.skt}</div>`;
  if(d.tr)h+=`<p class="mx-tr">${d.tr}</p>`;
  const blocks=[];
  if(d.c)blocks.push(['Concept &amp; meaning',d.c]);
  if(d.ex)blocks.push(['Example &amp; application',d.ex]);
  if(blocks.length)h+=`<div class="mx-blocks">${blocks.map(([t,x])=>`<section><div class="mx-label">${t}</div><div>${x}</div></section>`).join('')}</div>`;
  const coms=MAP_COMS.filter(x=>d[x.k]);
  if(coms.length){
    h+=`<div class="mx-label mx-comlabel">Commentaries <span>${coms.length}</span></div><div class="upr-coms">`;
    coms.forEach(x=>{h+=`<div class="upr-com" style="--ink:${window.readerInk?readerInk(x.n):'var(--accent)'}"><div class="upr-cname">${x.n}</div><div>${d[x.k]}</div></div>`;});
    h+=`</div>`;
  }
  return h;
}

function renderSection(sec,containerEl){
  const leaves=[];
  const leafBtn=(l,color)=>{
    const i=leaves.push({l,color})-1;
    return `<li><button class="mx-leaf" data-i="${i}" style="--bc:${color}">
      <span class="mx-lname">${l.n}</span><span class="mx-lref">${l.r||''}</span>
      ${l.d?`<span class="mx-ldesc">${l.d}</span>`:''}</button></li>`;
  };
  let list='';
  sec.branches.forEach(b=>{
    list+=`<section class="mx-branch" style="--bc:${b.color}"><h3><span class="mx-dot"></span>${b.name}<span class="mx-bref">${b.ref||''}</span></h3><ul>`;
    (b.sub||[]).forEach(s=>{
      if(s.label)list+=`<li class="mx-sublabel">${s.label}</li>`;
      s.children.forEach(c=>{list+=leafBtn(c,b.color);});
    });
    (b.children||[]).forEach(c=>{list+=leafBtn(c,b.color);});
    list+=`</ul></section>`;
  });
  let head=`<div class="mx-head"><div><div class="sec-title">${sec.title}</div><div class="sec-sub">${sec.sub||''}</div></div>`;
  if(sec.legend)head+=`<div class="legend">${sec.legend.map(l=>`<span><span class="ld" style="background:${l.c}"></span>${l.t}</span>`).join('')}</div>`;
  head+=`</div>`;
  if(sec.intro)head+=`<details class="intro-card"><summary>About this section</summary><div>${sec.intro}</div></details>`;
  containerEl.innerHTML=head+`<div class="mapx"><div class="mapx-list">${list}</div><aside class="mapx-detail" aria-live="polite"></aside></div>`;
  const pane=containerEl.querySelector('.mapx-detail');
  const narrow=()=>window.matchMedia('(max-width: 900px)').matches;
  function show(i,btn){
    containerEl.querySelectorAll('.mx-leaf').forEach(b=>b.classList.toggle('active',b===btn));
    pane.style.setProperty('--bc',leaves[i].color);
    pane.innerHTML=mapDetailHTML(leaves[i].l,leaves[i].color);
    if(narrow())btn.closest('li').after(pane);          // phones: detail opens under the tapped topic
    else if(pane.parentElement!==containerEl.querySelector('.mapx'))containerEl.querySelector('.mapx').appendChild(pane);
    if(!narrow())pane.scrollTop=0;
  }
  containerEl.querySelectorAll('.mx-leaf').forEach(b=>b.addEventListener('click',()=>show(+b.dataset.i,b)));
  const first=containerEl.querySelector('.mx-leaf');
  if(first&&!narrow())show(0,first);
}

function buildSubNav(sections,panelId,renderFn){
  const panel=document.getElementById(panelId);
  if(!sections||sections.length===0)return;
  let nav=`<div class="sub-nav" id="sn_${panelId}">`;
  sections.forEach((s,i)=>{
    nav+=`<button ${i===0?'class="active"':''} onclick="switchSub('${panelId}',${i})">${s.tab||s.title}</button>`;
  });
  nav+=`</div><div id="sc_${panelId}"></div>`;
  panel.innerHTML=nav;
  renderFn(sections[0],document.getElementById(`sc_${panelId}`));
  panel._sections=sections;
  panel._renderFn=renderFn;
}

function switchSub(panelId,idx){
  const panel=document.getElementById(panelId);
  document.querySelectorAll(`#sn_${panelId} button`).forEach((b,i)=>b.classList.toggle('active',i===idx));
  panel._renderFn(panel._sections[idx],document.getElementById(`sc_${panelId}`));
}

function showSystem(id){
  document.querySelectorAll('.system-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.top-nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const btns=document.querySelectorAll('.top-nav button');
  const map={yoga:0,samkhya:1,nyaya:2,vaisheshika:3,mimamsa:4,vedanta:5,vedas:6,shiva:7};
  btns[map[id]].classList.add('active');
  history.replaceState(null,'','#'+id); // keeps the URL shareable and back-button friendly
  if(!document.getElementById(id)._built){
    builders[id]();
    document.getElementById(id)._built=true;
  }
}

function toggleBranch(id,el){
  const body=document.getElementById(id);
  const open=body.classList.toggle('open');
  el.classList.toggle('open',open);
}
function toggleDetail(id,ev){
  ev.stopPropagation();
  const p=document.getElementById('d'+id);
  if(p)p.classList.toggle('open');
}

// ─── BUILDERS — each system builds itself lazily ──────────────────────────────

const builders={};

