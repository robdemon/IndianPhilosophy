'use strict';

// Colour palette
const C={
  purple:'#7F77DD',
  teal:'#1D9E75',
  coral:'#D85A30',
  pink:'#D4537E',
  blue:'#378ADD',
  amber:'#EF9F27',
  green:'#639922',
  red:'#E24B4A',
  gray:'#888780'
};

const colors = Object.values(C);

// ── Rendering helpers ─────────────────────────────────────────────────
function safeHtml(s){
  if(!s) return '';
  // Allow <em> tags; the content is trusted internal data
  return s;
}

function renderDetail(d, color, leafId){
  if(!d) return '';
  let h = `<div class="detail-panel" id="d${leafId}" style="--accent:${color}">`;
  if(d.c){
    h += `<div class="detail-section">
      <div class="detail-label">Concept &amp; Meaning</div>
      <div class="detail-text">${safeHtml(d.c)}</div>
    </div>`;
  }
  if(d.ex){
    h += `<div class="detail-section">
      <div class="detail-label">Example &amp; Application</div>
      <div class="detail-text">${safeHtml(d.ex)}</div>
    </div>`;
  }
  // COMS is defined per-file as a global
  const present = COMS.filter(c => d[c.key]);
  if(present.length){
    h += `<div class="detail-section">
      <div class="detail-label">Classical Commentaries</div>
      <div class="commentaries-wrap">`;
    present.forEach(c => {
      h += `<div class="detail-commentary">
        <div class="com-name">${c.name}</div>
        <div class="com-text">${safeHtml(d[c.key])}</div>
      </div>`;
    });
    h += `</div></div>`;
  }
  h += `</div>`;
  return h;
}

function renderLeaf(l, color){
  const id = 'l' + Math.random().toString(36).slice(2,8);
  const hasDet = !!l.det;
  const expandHint = hasDet
    ? `<div class="lf-expand">&#9654; tap for commentaries</div>`
    : '';
  const onclick = hasDet ? `onclick="toggleDetail('${id}',event)"` : '';
  return `<div class="leaf" ${onclick}>
    <div class="lf-dot" style="background:${color}"></div>
    <div class="leaf-content">
      <div>
        <span class="lf-name">${l.n}</span>
        <span class="lf-ref">${l.r}</span>
      </div>
      <div class="lf-desc">${l.d}</div>
      ${expandHint}
      ${hasDet ? renderDetail(l.det, color, id) : ''}
    </div>
  </div>`;
}

function renderBranch(b, i){
  const id = 'b' + i + '_' + Math.random().toString(36).slice(2,6);
  let body = '';
  if(b.sub){
    b.sub.forEach(s => {
      body += `<div class="sub-tree">`;
      if(s.label) body += `<div class="sub-label">${s.label}</div>`;
      s.children.forEach(c => { body += renderLeaf(c, b.color); });
      body += `</div>`;
    });
  }
  if(b.children){ b.children.forEach(c => { body += renderLeaf(c, b.color); }); }
  return `<div class="branch">
    <div class="branch-head" id="bh${id}" onclick="toggleBranch('bb${id}',this)">
      <div class="dot" style="background:${b.color}"></div>
      <div class="label">${b.name}</div>
      <div class="ref">${b.ref||''}</div>
      <div class="chev">&#9654;</div>
    </div>
    <div class="branch-body" id="bb${id}">${body}</div>
  </div>`;
}

function renderPada(idx){
  const p = data[idx];
  document.querySelectorAll('.section-bar button').forEach((b,i) => {
    b.classList.toggle('active', i === idx);
  });
  let h = '';
  h += `<div class="pada-title">${p.pada}</div>`;
  h += `<div class="pada-sub">${p.sub}</div>`;
  if(p.intro){
    h += `<div class="intro-card">${p.intro}</div>`;
  }
  h += `<div class="tree">`;
  p.branches.forEach((b,i) => { h += renderBranch(b, i); });
  h += `</div>`;
  document.getElementById('content').innerHTML = h;
}

function toggleBranch(id, el){
  const body = document.getElementById(id);
  const open = body.classList.toggle('open');
  el.classList.toggle('open', open);
}

function toggleDetail(id, ev){
  ev.stopPropagation();
  const panel = document.getElementById('d' + id);
  if(panel){ panel.classList.toggle('open'); }
}

// ── Initialise: requires COMS, LEGEND, data globals defined first ─────
function initMap() {
  let html = `<div class="legend">`;
  LEGEND.forEach(l => {
    html += `<span><div class="ld" style="background:${l.color}"></div>${l.label}</span>`;
  });
  html += `</div>`;
  
  html += `<div class="section-bar">`;
  data.forEach((p, i) => {
    const parts = p.pada.split(' ');
    html += `<button ${i===0?'class="active"':''} onclick="renderPada(${i})">${parts[0]}<br>${parts[1]||''}</button>`;
  });
  html += `</div>`;
  
  html += `<div id="content"></div>`;
  
  document.getElementById('app').innerHTML = html;
  renderPada(0);
}
