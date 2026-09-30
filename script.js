// ===== Konfigurasi (backend Apps Script tetap sama) =====
const API='https://script.google.com/macros/s/AKfycbwlgWApIgKIRvXAq2aH0cw8GSwfJuNcV48gfGZzJpziyS7lJorxhbuAb3_TjN5Lg9_K/exec';
const SHEET='https://docs.google.com/spreadsheets/d/11ODy-lYmlxIX0ixOTiFmTpxvNBtzha2paOZduY4tfZE/edit?gid=0#gid=0';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const ini=n=>(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const iso=(d=new Date())=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const hm=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':');
const S={stu:ld('pk_stu',[]),log:ld('pk_log',{}),cfg:{start:'08:00',grace:10,sound:true,...ld('pk_cfg',{})},f:'all',qr:null,run:false,torch:false,lastTxt:'',lastAt:0,resT:0,timer:null};
const KEY='pk_auth',tk=()=>sessionStorage.getItem(KEY)||'';
const day=(k=iso())=>S.log[k]||{};
const isLate=()=>{const[h,m]=S.cfg.start.split(':').map(Number),n=new Date();return n.getHours()*60+n.getMinutes()>h*60+m+Number(S.cfg.grace)};
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;$('#toasts').append(e);setTimeout(()=>e.remove(),2600)}

// ===== Presensi =====
function mark(m,manual){
  const d=iso();S.log[d]=S.log[d]||{};
  if(S.log[d][m.nim])return null;
  const rec={t:hm(),s:isLate()?'Terlambat':'Hadir',n:m.nama,k:m.kelas,j:m.jurusan,m:!!manual};
  S.log[d][m.nim]=rec;sv('pk_log',S.log);
  fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:tk(),action:'presensi',nim:m.nim,nama:m.nama||'',kelas:m.kelas||'',jurusan:m.jurusan||'',mataKuliah:'Presensi Kelas',status:rec.s,waktu:new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})})}).catch(()=>{});
  render();return rec;
}
async function sync(){
  try{const a=await(await fetch(API+'?action=get_presensi_hari_ini&token='+encodeURIComponent(tk()))).json();if(a&&a.error==='unauthorized')return forceOut();if(!Array.isArray(a))return;
    const d=iso();S.log[d]=S.log[d]||{};
    a.forEach(i=>{if(!S.log[d][i.nim])S.log[d][i.nim]={t:i.waktu||'',s:i.status==='Terlambat'?'Terlambat':'Hadir',n:i.nama,k:i.kelas,j:i.jurusan}});
    sv('pk_log',S.log);render()}catch{}
}
async function loadStudents(){
  const dot=$('#dot'),lab=$('#conn');
  try{const r=await fetch(API+'?action=get_all&token='+encodeURIComponent(tk()),{signal:AbortSignal.timeout(15000)});const a=await r.json();if(a&&a.error==='unauthorized')return forceOut();
    if(Array.isArray(a)&&a.length){S.stu=a;sv('pk_stu',a)}dot.className='ok';lab.textContent='Online'}
  catch{dot.className='off';lab.textContent=S.stu.length?'Offline · cache':'Offline'}
  render();
}

// ===== Render =====
const row=(m,rec,tap)=>`<button class="item" ${tap?`data-nim="${esc(m.nim)}"`:''}><div class="av">${ini(m.nama)}</div><div class="in"><b>${esc(m.nama||m.nim)}</b><small>${esc(m.nim)} · ${esc(m.kelas||'-')}</small></div>${rec?`<span class="tag ${rec.s==='Terlambat'?'late':'ok'}">${esc(rec.t)}${rec.s==='Terlambat'?' · Terlambat':''}</span>`:`<span class="tag">Belum</span>`}</button>`;
const byTime=l=>Object.entries(l).map(([nim,r])=>({nim,nama:r.n,kelas:r.k,rec:r})).sort((a,b)=>b.rec.t.localeCompare(a.rec.t));
function render(){
  const t=S.stu.length,tl=day(),n=Object.keys(tl).length,p=t?Math.round(n/t*100):0,late=Object.values(tl).filter(r=>r.s==='Terlambat').length;
  const now=new Date(),h=now.getHours();
  $('#hi').textContent=h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  $('#today').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#hRing').style.setProperty('--p',p);$('#hPct').textContent=p+'%';
  $('#hHadir').textContent=n;$('#hTotal').textContent=t;$('#sHadir').textContent=n;$('#sTotal').textContent=t;
  $('#hLate').textContent=late?`${late} di antaranya terlambat.`:(n?'Semua tepat waktu.':'Belum ada yang scan.');
  // grafik 7 hari
  $('#bars').innerHTML=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5),c=Object.keys(day(iso(d))).length,ph=t?Math.round(c/t*100):0;
    return`<div class="${i===6?'t':''}" title="${c} hadir"><i style="height:${Math.max(ph,3)}%"></i>${d.toLocaleDateString('id-ID',{weekday:'short'})}</div>`}).join('');
  const out=S.stu.filter(m=>!tl[m.nim]);
  $('#absent').innerHTML=out.length?out.slice(0,14).map(m=>`<button data-nim="${esc(m.nim)}">${esc(String(m.nama||m.nim).trim().split(/\s+/)[0])}</button>`).join('')+(out.length>14?`<p>+${out.length-14} lainnya</p>`:''):'<p>Semua sudah hadir 🎉</p>';
  const rc=byTime(tl).slice(0,6).map(x=>row(x,x.rec,1)).join('')||'<p class="empty">Belum ada presensi hari ini.</p>';
  $('#recent').innerHTML=rc;$('#scanList').innerHTML=byTime(tl).slice(0,5).map(x=>row(x,x.rec,1)).join('')||'<p class="empty">Hasil scan muncul di sini.</p>';
  renderStudents();renderHistory();
}
function renderStudents(){
  const q=$('#q').value.trim().toLowerCase(),tl=day();
  const r=S.stu.filter(m=>(!q||(m.nama||'').toLowerCase().includes(q)||String(m.nim).toLowerCase().includes(q))&&(S.f==='all'||(S.f==='in')===!!tl[m.nim]));
  $('#stuList').innerHTML=r.map(m=>row(m,tl[m.nim],1)).join('')||'<p class="empty">Tidak ada mahasiswa yang cocok.</p>';
}
function renderHistory(){
  const d=$('#hDate').value||iso(),l=day(d),v=Object.values(l),t=S.stu.length;
  $('#xLate').textContent=v.filter(r=>r.s==='Terlambat').length;$('#xHadir').textContent=v.length-$('#xLate').textContent;$('#xAbsen').textContent=Math.max(t-v.length,0);
  $('#hisList').innerHTML=byTime(l).map(x=>row(x,x.rec,1)).join('')||'<p class="empty">Tidak ada data untuk tanggal ini di perangkat ini.</p>';
}

// ===== Sheet mahasiswa (QR + presensi manual) =====
function openSheet(nim){
  const m=S.stu.find(x=>String(x.nim)===String(nim));if(!m)return;
  const days=Object.keys(S.log).filter(k=>Object.keys(S.log[k]).length),att=days.filter(k=>S.log[k][m.nim]).length,rec=day()[m.nim];
  $('#shAv').textContent=ini(m.nama);$('#shName').textContent=m.nama||m.nim;$('#shMeta').textContent=`${m.nim} · ${m.kelas||'-'} · ${m.jurusan||'-'}`;
  $('#shQr').src='https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=4&data='+encodeURIComponent(JSON.stringify({nim:m.nim,nama:m.nama,kelas:m.kelas,jurusan:m.jurusan}));
  $('#shStat').textContent=days.length?`Hadir ${att} dari ${days.length} hari tercatat di perangkat ini.`:'Belum ada riwayat.';
  const b=$('#shMark');b.disabled=!!rec;b.dataset.nim=m.nim;b.innerHTML=rec?`<i class="fa-solid fa-check"></i>Sudah hadir ${esc(rec.t)}`:'<i class="fa-solid fa-user-check"></i>Tandai hadir';
  $('#shDl').dataset.nim=m.nim;$('#sheet').showModal();
}
async function dlQR(nim){
  try{const r=await fetch($('#shQr').src),u=URL.createObjectURL(await r.blob()),a=Object.assign(document.createElement('a'),{href:u,download:`qr-${nim}.png`});a.click();URL.revokeObjectURL(u)}
  catch{window.open($('#shQr').src,'_blank')}
}

// ===== Scanner kiosk: berjalan terus, tanpa berhenti tiap scan =====
function beep(ok){if(!S.cfg.sound)return;navigator.vibrate?.(ok?60:[80,60,80]);try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.frequency.value=ok?880:220;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.1,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.25);o.start();o.stop(c.currentTime+.26)}catch{}}
function flash(type,title,sub){const s=$('.scan');s.className='scan show '+type;$('#resT').textContent=title;$('#resS').textContent=sub;clearTimeout(S.resT);S.resT=setTimeout(()=>s.classList.remove('show','ok','late','bad'),2400)}
function onScan(txt){
  const now=Date.now();if(txt===S.lastTxt&&now-S.lastAt<3500)return;S.lastTxt=txt;S.lastAt=now;
  let nim;try{nim=JSON.parse(txt).nim}catch{nim=txt.trim()}
  const m=S.stu.find(x=>String(x.nim)===String(nim));
  if(!m){beep(0);return flash('bad','QR tidak dikenal',`NPM ${nim||'-'} tidak terdaftar`)}
  const r=mark(m);
  if(!r){beep(0);const o=day()[m.nim];return flash('bad',m.nama,`Sudah presensi pukul ${o.t}`)}
  beep(1);flash(r.s==='Terlambat'?'late':'ok',m.nama,r.s==='Terlambat'?`Terlambat · ${r.t}`:`Hadir tepat waktu · ${r.t}`);
}
async function startScan(){
  if(S.run)return;
  S.qr=new Html5Qrcode('reader',{verbose:false,formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE]});
  const cfg={fps:15,qrbox:{width:240,height:240},aspectRatio:1};
  try{await S.qr.start({facingMode:'environment'},cfg,onScan,()=>{})}
  catch{try{await S.qr.start({facingMode:'user'},cfg,onScan,()=>{})}catch(e){S.qr=null;return toast('Kamera tidak bisa diakses')}}
  S.run=true;$('#scanBtn').textContent='Hentikan scan';
}
async function stopScan(){
  if(!S.run)return;S.run=false;$('#scanBtn').textContent='Mulai scan';
  try{await S.qr.stop();S.qr.clear()}catch{}S.qr=null;S.torch=false;$('#torchBtn').classList.remove('on');
}

// ===== Sesi presensi mandiri =====
function sesiUI(s){const on=!!(s&&s.open);S.sesi=s;$('#kode').hidden=!on;$('#kode').textContent=on?s.kode:'';$('#sesiBtn').textContent=on?'Tutup sesi':'Buka sesi';
  $('#sesiTxt').textContent=on?'Sesi terbuka. Bagikan kode ini dan tautannya ke kelas.':'Sesi belum dibuka. Buka supaya mahasiswa bisa absen dari HP mereka.'}
async function sesiLoad(){try{const s=await(await fetch(API+'?action=sesi_info&token='+encodeURIComponent(tk()))).json();if(s.error==='unauthorized')return forceOut();sesiUI(s)}catch{}}
async function sesiToggle(){
  const on=S.sesi&&S.sesi.open,b=$('#sesiBtn'),prev=b.textContent;
  b.disabled=true;b.textContent=on?'Menutup…':'Membuka…';
  try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:tk(),...(on?{action:'sesi_tutup'}:{action:'sesi_buka',mulai:S.cfg.start,grace:S.cfg.grace})})});
    const s=await r.json();if(s.error==='unauthorized')return forceOut();sesiUI(s);toast(on?'Sesi ditutup':'Sesi dibuka')}
  catch{b.textContent=prev;toast('Gagal menghubungi server')}
  b.disabled=false;
}

// ===== Rekap =====
function rekap(k=iso()){
  const l=day(k),t=S.stu.length,n=Object.keys(l).length,late=Object.values(l).filter(r=>r.s==='Terlambat').length,out=S.stu.filter(m=>!l[m.nim]).map(m=>m.nama);
  return`Presensi ${new Date(k+'T00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}\nHadir ${n}/${t} (${t?Math.round(n/t*100):0}%), terlambat ${late}.\n`+(out.length?`Belum hadir: ${out.join(', ')}`:'Semua hadir.');
}
function csv(){
  const k=$('#hDate').value||iso(),l=day(k),rows=[['NPM','Nama','Kelas','Jurusan','Status','Waktu']];
  S.stu.forEach(m=>{const r=l[m.nim];rows.push([m.nim,m.nama,m.kelas,m.jurusan,r?r.s:'Tidak hadir',r?r.t:''])});
  const b=new Blob(['\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const u=URL.createObjectURL(b);Object.assign(document.createElement('a'),{href:u,download:`presensi-${k}.csv`}).click();URL.revokeObjectURL(u);toast('CSV diunduh');
}

// ===== Navigasi & palette (Ctrl/⌘+K) =====
function go(v){
  $$('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));$$('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  v==='scan'?startScan():stopScan();scrollTo(0,0);
}
const MENU=[['Beranda','home'],['Scan presensi','scan'],['Data mahasiswa','students'],['Riwayat','history'],['Pengaturan','settings']];
function palette(){
  const q=$('#cmdIn').value.trim().toLowerCase(),tl=day();
  const nav=MENU.filter(x=>x[0].toLowerCase().includes(q)).map(x=>`<button class="item" data-go="${x[1]}"><div class="av"><i class="fa-solid fa-arrow-right"></i></div><div class="in"><b>${x[0]}</b></div></button>`);
  const st=q?S.stu.filter(m=>(m.nama||'').toLowerCase().includes(q)||String(m.nim).includes(q)).slice(0,6).map(m=>row(m,tl[m.nim],1)):[];
  $('#cmdList').innerHTML=st.concat(nav).join('')||'<p class="empty">Tidak ditemukan.</p>';
}
function openCmd(){$('#cmdIn').value='';palette();$('#cmd').showModal();$('#cmdIn').focus()}

// ===== Auth =====
function showApp(){$('#auth').hidden=true;$('#app').hidden=false;if(!S.started){S.started=true;render();loadStudents().then(sync);sesiLoad();setInterval(loadStudents,3e4);setInterval(sync,15e3)}}
function forceOut(){stopScan();localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);location.reload()}
function theme(t){document.documentElement.dataset.theme=t;localStorage.setItem('pk_theme',t)}

document.addEventListener('DOMContentLoaded',()=>{
  theme(localStorage.getItem('pk_theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
  $('#cStart').value=S.cfg.start;$('#cGrace').value=S.cfg.grace;$('#cSound').checked=S.cfg.sound;$('#hDate').value=iso();$('#sheetLink').href=SHEET;
  if(tk())showApp();

  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();
    const f=e.target,b=$('#lBtn'),er=$('#lerr');b.disabled=true;b.textContent='Memeriksa…';er.textContent='';
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'login',username:$('#lu').value.trim(),password:$('#lp').value})});
      const d=await r.json();
      if(d.ok&&d.token){sessionStorage.setItem(KEY,d.token);$('#lp').value='';showApp();toast('Halo, Admin')}
      else{er.textContent=d.locked?'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.':'Nama pengguna atau kata sandinya belum pas.';f.classList.remove('shake');requestAnimationFrame(()=>f.classList.add('shake'))}
    }catch{er.textContent='Tidak bisa menghubungi server. Cek koneksi lalu coba lagi.'}
    b.disabled=false;b.textContent='Lanjut';
  });
  $('#outBtn').onclick=()=>{if(confirm('Keluar dari akun admin?'))forceOut()};

  document.addEventListener('click',e=>{
    const n=e.target.closest('[data-nim]');if(n){$('#cmd').close();return openSheet(n.dataset.nim)}
    const g=e.target.closest('[data-go]');if(g){$('#cmd').close();return go(g.dataset.go)}
  });
  $$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
  $('#scanBtn').onclick=()=>S.run?stopScan():startScan();
  $('#torchBtn').onclick=async()=>{if(!S.run)return;try{S.torch=!S.torch;await S.qr.applyVideoConstraints({advanced:[{torch:S.torch}]});$('#torchBtn').classList.toggle('on',S.torch)}catch{S.torch=false;toast('Senter tidak didukung perangkat ini')}};
  $('#q').oninput=renderStudents;$('#hDate').onchange=renderHistory;
  $$('#seg button').forEach(b=>b.onclick=()=>{S.f=b.dataset.f;$$('#seg button').forEach(x=>x.classList.toggle('on',x===b));renderStudents()});
  $('#copyBtn').onclick=()=>navigator.clipboard.writeText(rekap()).then(()=>toast('Rekap disalin, siap ditempel ke WhatsApp'),()=>toast('Gagal menyalin'));
  $('#csvBtn').onclick=csv;
  $('#sesiBtn').onclick=sesiToggle;
  $('#linkBtn').onclick=()=>navigator.clipboard.writeText(new URL('mahasiswa.html',location.href).href).then(()=>toast('Tautan mahasiswa disalin'),()=>toast('Gagal menyalin'));
  $('#shX').onclick=()=>$('#sheet').close();$('#shDl').onclick=e=>dlQR(e.currentTarget.dataset.nim);
  $('#shMark').onclick=e=>{const m=S.stu.find(x=>String(x.nim)===e.currentTarget.dataset.nim);const r=m&&mark(m,1);if(r){toast(`${m.nama} ditandai ${r.s.toLowerCase()}`);openSheet(m.nim)}};
  $('#kBtn').onclick=openCmd;$('#cmdIn').oninput=palette;$('#themeBtn').onclick=()=>theme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  $('#cmdIn').onkeydown=e=>{if(e.key==='Enter')$('#cmdList .item')?.click()};
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
  addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!$('#app').hidden){e.preventDefault();openCmd()}});
  const saveCfg=()=>{S.cfg={start:$('#cStart').value||'08:00',grace:$('#cGrace').value||0,sound:$('#cSound').checked};sv('pk_cfg',S.cfg);toast('Pengaturan tersimpan')};
  ['#cStart','#cGrace','#cSound'].forEach(s=>$(s).onchange=saveCfg);
  $('#syncBtn').onclick=async()=>{await loadStudents();await sync();toast('Data disinkronkan')};
  $('#clearBtn').onclick=()=>{if(!confirm('Hapus presensi lokal hari ini?'))return;delete S.log[iso()];sv('pk_log',S.log);render();toast('Presensi lokal hari ini dihapus')};
});
addEventListener('beforeunload',()=>{try{S.qr?.stop()}catch{}});
