// ==========================================
// KONEKSI DATABASE
// ==========================================
const supabaseUrl = 'https://gabdognjnvfhmqjfraaq.supabase.co';
const supabaseKey = 'sb_publishable_uAtPuuvMH2IpzmNwgSkUZg_sQhXAJTQ';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null; 
let activeProjectId = null; 

// VARIABEL GLOBAL & EDIT ID (WAJIB ADA)
let daftarProyekGlobal = []; 
let dataPlotGlobal = [];
let dataCharGlobal = [];
let dataRelGlobal = [];
let dataTimeGlobal = [];
let dataSceneGlobal = [];
let dataToolkitGlobal = [];

let editProjectId = null;
let editPlotId = null;
let editCharId = null;
let editRelId = null;
let editTimeId = null;
let editSceneId = null;
let editToolkitId = null;

// ==========================================
// AUTH & NAVIGASI
// ==========================================
async function loginGoogle() { await supabaseClient.auth.signInWithOAuth({ provider: 'google' }); }
async function logout() { await supabaseClient.auth.signOut(); cekSesi(); }

function bukaHalaman(halamanId) {
    document.getElementById('workspace').style.display = 'none';
    document.getElementById('profil-settings').style.display = 'none';
    document.getElementById('project-detail').style.display = 'none';
    
    document.getElementById(halamanId).style.display = 'block';
    const tombolMenu = document.querySelectorAll('.sidebar-menu');
    tombolMenu.forEach(btn => btn.classList.remove('active'));
    
    if (halamanId === 'workspace') tombolMenu[0].classList.add('active');
    else if (halamanId === 'profil-settings') tombolMenu[1].classList.add('active');
}

function bukaTabProyek(tabId, elemenTombol) {
    document.querySelectorAll('.project-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.project-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (elemenTombol) elemenTombol.classList.add('active');
    else document.querySelectorAll('.project-nav-btn')[0].classList.add('active');
}

async function cekSesi() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        const apakahBaruLogin = (currentUser === null); 
        currentUser = session.user;
        document.body.classList.add('app-logged-in'); 
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('sidebar-utama').style.display = 'flex';
        
        if (apakahBaruLogin) {
            bukaHalaman('workspace');
            muatProfil();
            tampilkanProyek();
        }
    } else {
        currentUser = null;
        document.body.classList.remove('app-logged-in');
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('sidebar-utama').style.display = 'none';
        document.getElementById('workspace').style.display = 'none';
        document.getElementById('project-detail').style.display = 'none';
        document.getElementById('profil-settings').style.display = 'none';
    }
}

async function muatProfil() {
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) {
        document.getElementById('sidebar-nama').innerText = data.global_pseudonym || currentUser.user_metadata.full_name;
        document.getElementById('sidebar-foto').src = data.avatar_url || currentUser.user_metadata.avatar_url || 'https://via.placeholder.com/150';
        document.getElementById('input-profil-nama').value = data.global_pseudonym || '';
        document.getElementById('input-profil-bio').value = data.bio || '';
    }
}

async function simpanProfil() {
    const nama = document.getElementById('input-profil-nama').value;
    const bio = document.getElementById('input-profil-bio').value;
    const fileFoto = document.getElementById('input-profil-foto').files[0];
    if (!nama) return alert("Nama pena tidak boleh kosong!");
    
    const btn = event.target; btn.innerText = "⏳ Mengunggah..."; btn.disabled = true;
    let finalUrl = document.getElementById('sidebar-foto').src; 
    
    if (fileFoto) {
        const n = `${currentUser.id}-${Date.now()}.${fileFoto.name.split('.').pop()}`;
        const { error: err } = await supabaseClient.storage.from('avatars').upload(n, fileFoto);
        if (err) { alert("Gagal: " + err.message); btn.innerText = "Simpan Perubahan Profil"; btn.disabled = false; return; }
        finalUrl = supabaseClient.storage.from('avatars').getPublicUrl(n).data.publicUrl; 
    }
    await supabaseClient.from('profiles').update({ global_pseudonym: nama, bio: bio, avatar_url: finalUrl }).eq('id', currentUser.id);
    alert("Profil diperbarui!"); document.getElementById('input-profil-foto').value = ""; muatProfil(); 
    btn.innerText = "Simpan Perubahan Profil"; btn.disabled = false;
}

// ==========================================
// MODUL 1: PROYEK (CREATE, EDIT, DELETE)
// ==========================================
async function simpanProyek() {
    const judul = document.getElementById('input-judul').value;
    const genre = document.getElementById('input-genre').value;
    if (!judul) return;

    if (editProjectId) {
        await supabaseClient.from('projects').update({ title: judul, genre: genre }).eq('id', editProjectId);
        if(activeProjectId === editProjectId) {
            document.getElementById('detail-judul').innerText = judul;
            document.getElementById('detail-genre').innerText = "Genre: " + genre;
        }
    } else {
        await supabaseClient.from('projects').insert([{ title: judul, genre: genre, user_id: currentUser.id }]);
    }
    
    document.getElementById('input-judul').value = ""; 
    document.getElementById('panel-buat-proyek').style.display = 'none';
    editProjectId = null;
    tampilkanProyek(); 
}

function siapkanEditProyek(id) {
    const p = daftarProyekGlobal.find(x => x.id === id);
    if (!p) return;
    editProjectId = id;
    document.getElementById('input-judul').value = p.title;
    document.getElementById('input-genre').value = p.genre;
    document.querySelector('#panel-buat-proyek .btn-primary').innerText = "Simpan Perubahan";
    document.getElementById('panel-buat-proyek').style.display = 'block';
}

function siapkanEditProyekDariDetail() {
    siapkanEditProyek(activeProjectId);
}

async function hapusProyek(id, event) {
    event.stopPropagation(); // Mencegah klik masuk ke proyek
    if (!confirm("Tindakan destruktif ekstrim: Yakin ingin menghapus seluruh proyek ini dan semua isinya?")) return;
    await supabaseClient.from('projects').delete().eq('id', id);
    if (activeProjectId === id) bukaHalaman('workspace');
    tampilkanProyek();
}

async function tampilkanProyek() {
    const { data, error } = await supabaseClient.from('projects').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    const wadah = document.getElementById('daftar-proyek');
    const cwWadah = document.getElementById('continue-working');

    if (error || !data || data.length === 0) { 
        wadah.innerHTML = "<p style='grid-column: 1 / -1; color: var(--text-muted);'>Belum ada karya. Klik + Proyek Baru untuk mulai!</p>"; 
        cwWadah.style.display = 'none'; return; 
    }
    daftarProyekGlobal = data; 
    
    const lastOpenedId = localStorage.getItem('lastOpenedProject_' + currentUser.id);
    let pLanjut = data.find(p => p.id === lastOpenedId) || data[0];
    document.getElementById('cw-title').innerText = pLanjut.title;
    document.getElementById('cw-genre').innerText = pLanjut.genre;
    cwWadah.style.display = 'block'; cwWadah.setAttribute('data-id', pLanjut.id);

    wadah.innerHTML = ""; 
    data.forEach(p => {
        const vis = p.visibility === 'public' ? '🌍 Publik' : '🔒 Privat';
        wadah.innerHTML += `
            <div class="card" style="margin-top: 0; transition: 0.2s; cursor: pointer; position: relative;" onclick="bukaProyekLewatId('${p.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="margin: 0 0 5px 0;">${p.title}</h4>
                    <div style="display: flex; gap: 5px;" onclick="event.stopPropagation()">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditProyek('${p.id}')" title="Edit Proyek">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusProyek('${p.id}', event)" title="Hapus Proyek">🗑️</button>
                    </div>
                </div>
                <p style="margin: 0; font-size: 13px; color: var(--text-muted);">${p.genre} · ${vis}</p>
            </div>`;
    });
}

function bukaProyekLanjutan() { const id = document.getElementById('continue-working').getAttribute('data-id'); if (id) bukaProyekLewatId(id); }
function bukaProyekLewatId(id) { const p = daftarProyekGlobal.find(x => x.id === id); if (p) bukaProyek(p.id, p.title, p.genre, p.google_docs_url, p.visibility); }

function bukaProyek(id, judul, genre, docsUrl, visibility) {
    activeProjectId = id;
    localStorage.setItem('lastOpenedProject_' + currentUser.id, id);
    bukaHalaman('project-detail'); bukaTabProyek('tab-overview', null); 
    document.getElementById('detail-judul').innerText = judul || "Tanpa Judul";
    document.getElementById('detail-genre').innerText = "Genre: " + (genre || "-");
    document.getElementById('input-visibilitas').value = visibility || 'private';
    
    tampilkanDocsViewer(docsUrl); 
    tampilkanBabak(); tampilkanKarakter(); muatDropdownKarakter();
    tampilkanRelasi(); tampilkanTimeline(); tampilkanScene();
    siapkanToolkitForm(genre); tampilkanToolkit();
    hitungProgress();
}

async function ubahVisibilitas() {
    const vis = document.getElementById('input-visibilitas').value;
    await supabaseClient.from('projects').update({ visibility: vis }).eq('id', activeProjectId);
    tampilkanProyek();
}

async function simpanDocsUrl() {
    const url = document.getElementById('input-docs-url').value;
    if (!url) return;
    await supabaseClient.from('projects').update({ google_docs_url: url }).eq('id', activeProjectId);
    tampilkanDocsViewer(url); tampilkanProyek(); hitungProgress();
}

async function hapusDocsUrl() {
    if (!confirm("Yakin ingin memutus tautan Google Docs ini?")) return;
    await supabaseClient.from('projects').update({ google_docs_url: null }).eq('id', activeProjectId);
    tampilkanDocsViewer(null); tampilkanProyek(); hitungProgress();
}

function tampilkanDocsViewer(url) {
    const viewer = document.getElementById('docs-viewer');
    if (url && url.length > 5 && url !== 'null') {
        document.getElementById('input-docs-url').value = url;
        document.getElementById('btn-buka-docs').href = url;
        document.getElementById('iframe-docs').src = url.includes('/edit') ? url.replace('/edit', '/preview') : url;
        viewer.style.display = 'block';
    } else {
        document.getElementById('input-docs-url').value = '';
        viewer.style.display = 'none';
    }
}

// ==========================================
// MODUL 2: PLOT ACTS (CREATE, EDIT, DELETE)
// ==========================================
async function simpanBabak() {
    const j = document.getElementById('input-babak-judul').value;
    const k = document.getElementById('input-babak-konten').value;
    if (!j) return;
    
    const btn = document.querySelector('#tab-plot .btn-primary'); btn.innerText = "⏳...";
    if (editPlotId) {
        await supabaseClient.from('plot_acts').update({ title: j, content: k }).eq('id', editPlotId);
        editPlotId = null; btn.innerText = "Simpan Babak Plot";
    } else {
        await supabaseClient.from('plot_acts').insert([{ project_id: activeProjectId, title: j, content: k, order_index: 1 }]);
        btn.innerText = "Simpan Babak Plot";
    }
    document.getElementById('input-babak-judul').value = ""; document.getElementById('input-babak-konten').value = "";
    tampilkanBabak(); hitungProgress();
}

function siapkanEditBabak(id) {
    const b = dataPlotGlobal.find(x => x.id === id); if(!b) return;
    editPlotId = id;
    document.getElementById('input-babak-judul').value = b.title;
    document.getElementById('input-babak-konten').value = b.content;
    document.querySelector('#tab-plot .btn-primary').innerText = "Simpan Perubahan";
}

async function hapusBabak(id) {
    if (!confirm("Yakin ingin menghapus babak plot ini?")) return;
    document.getElementById('plot-' + id).style.opacity = '0.5';
    await supabaseClient.from('plot_acts').delete().eq('id', id);
    tampilkanBabak(); hitungProgress();
}

async function tampilkanBabak() {
    const { data } = await supabaseClient.from('plot_acts').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
    const w = document.getElementById('daftar-babak');
    if (!data || data.length === 0) { w.innerHTML = "<p style='color: var(--text-muted);'>Belum ada struktur plot.</p>"; return; }
    dataPlotGlobal = data; w.innerHTML = "";
    data.forEach(b => {
        w.innerHTML += `
            <div class="plot-card" id="plot-${b.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="margin:0;">${b.title}</h4>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditBabak('${b.id}')">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusBabak('${b.id}')">🗑️</button>
                    </div>
                </div>
                <p style="margin:10px 0 0 0; font-size:14px; white-space: pre-wrap;">${b.content}</p>
            </div>`;
    });
}

// ==========================================
// MODUL 3: CHARACTERS (CREATE, EDIT, DELETE)
// ==========================================
async function simpanKarakter() {
    const n = document.getElementById('input-char-nama').value;
    const p = document.getElementById('input-char-peran').value;
    const m = document.getElementById('input-char-motivasi').value;
    if (!n) return;

    const btn = document.querySelector('#tab-char .btn-primary'); btn.innerText = "⏳...";
    if (editCharId) {
        await supabaseClient.from('characters').update({ name: n, role: p, motivation: m }).eq('id', editCharId);
        editCharId = null; btn.innerText = "Simpan Karakter";
    } else {
        await supabaseClient.from('characters').insert([{ project_id: activeProjectId, name: n, role: p, motivation: m }]);
        btn.innerText = "Simpan Karakter";
    }
    document.getElementById('input-char-nama').value = ""; document.getElementById('input-char-motivasi').value = "";
    tampilkanKarakter(); muatDropdownKarakter(); hitungProgress();
}

function siapkanEditKarakter(id) {
    const c = dataCharGlobal.find(x => x.id === id); if(!c) return;
    editCharId = id;
    document.getElementById('input-char-nama').value = c.name;
    document.getElementById('input-char-peran').value = c.role;
    document.getElementById('input-char-motivasi').value = c.motivation;
    document.querySelector('#tab-char .btn-primary').innerText = "Simpan Perubahan";
}

async function hapusKarakter(id) {
    if (!confirm("Yakin ingin menghapus karakter ini beserta relasinya?")) return;
    document.getElementById('char-' + id).style.opacity = '0.5';
    await supabaseClient.from('characters').delete().eq('id', id);
    tampilkanKarakter(); muatDropdownKarakter(); tampilkanRelasi(); hitungProgress();
}

async function tampilkanKarakter() {
    const { data } = await supabaseClient.from('characters').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
    const w = document.getElementById('daftar-karakter');
    if (!data || data.length === 0) { w.innerHTML = "<p style='color: var(--text-muted); grid-column: 1 / -1;'>Belum ada karakter.</p>"; return; }
    dataCharGlobal = data; w.innerHTML = "";
    data.forEach(c => {
        let label = c.role === 'protagonist' ? "Protagonis" : c.role === 'antagonist' ? "Antagonis" : "Pendukung";
        w.innerHTML += `
            <div class="char-card" id="char-${c.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="margin: 0;">${c.name}</h4>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditKarakter('${c.id}')">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusKarakter('${c.id}')">🗑️</button>
                    </div>
                </div>
                <span class="char-role" style="margin-top: 5px;">${label}</span>
                <p style="margin: 5px 0 0 0;"><strong>Motivasi:</strong><br>${c.motivation || '-'}</p>
            </div>`;
    });
}

async function muatDropdownKarakter() {
    const { data } = await supabaseClient.from('characters').select('id, name').eq('project_id', activeProjectId).order('name', { ascending: true });
    const dA = document.getElementById('input-rel-char-a'); const dB = document.getElementById('input-rel-char-b');
    let o = '<option value="">Pilih Karakter...</option>';
    if(data) data.forEach(c => o += `<option value="${c.id}">${c.name}</option>`);
    dA.innerHTML = o; dB.innerHTML = o;
}

// ==========================================
// MODUL 4: RELATIONSHIPS (CREATE, EDIT, DELETE)
// ==========================================
async function simpanRelasi() {
    const cA = document.getElementById('input-rel-char-a').value;
    const cB = document.getElementById('input-rel-char-b').value;
    const t = document.getElementById('input-rel-tipe').value;
    const i = document.getElementById('input-rel-intensitas').value;
    const n = document.getElementById('input-rel-notes').value;
    if (!cA || !cB || cA === cB || !t) return alert("Pilih dua karakter berbeda dan isi tipe!");

    const btn = document.querySelector('#tab-rel .btn-primary'); btn.innerText = "⏳...";
    if (editRelId) {
        await supabaseClient.from('relationships').update({ character_a_id: cA, character_b_id: cB, relationship_type: t, intensity: i, notes: n }).eq('id', editRelId);
        editRelId = null; btn.innerText = "Simpan Relasi";
    } else {
        await supabaseClient.from('relationships').insert([{ project_id: activeProjectId, user_id: currentUser.id, character_a_id: cA, character_b_id: cB, relationship_type: t, intensity: i, notes: n, status: 'Active' }]);
        btn.innerText = "Simpan Relasi";
    }
    document.getElementById('input-rel-tipe').value = ""; document.getElementById('input-rel-notes').value = "";
    tampilkanRelasi(); hitungProgress();
}

function siapkanEditRelasi(id) {
    const r = dataRelGlobal.find(x => x.id === id); if(!r) return;
    editRelId = id;
    document.getElementById('input-rel-char-a').value = r.character_a_id;
    document.getElementById('input-rel-char-b').value = r.character_b_id;
    document.getElementById('input-rel-tipe').value = r.relationship_type;
    document.getElementById('input-rel-intensitas').value = r.intensity;
    document.getElementById('input-rel-notes').value = r.notes;
    document.querySelector('#tab-rel .btn-primary').innerText = "Simpan Perubahan";
}

async function hapusRelasi(id) {
    if (!confirm("Yakin ingin menghapus relasi ini?")) return;
    document.getElementById('rel-' + id).style.opacity = '0.5';
    await supabaseClient.from('relationships').delete().eq('id', id);
    tampilkanRelasi(); hitungProgress();
}

async function tampilkanRelasi() {
    const { data } = await supabaseClient.from('relationships').select(`*, charA:character_a_id(name), charB:character_b_id(name)`).eq('project_id', activeProjectId).order('created_at', { ascending: false });
    const w = document.getElementById('daftar-relasi');
    if (!data || data.length === 0) { w.innerHTML = "<p style='color: var(--text-muted); grid-column: 1 / -1;'>Belum ada dinamika hubungan.</p>"; return; }
    dataRelGlobal = data; w.innerHTML = "";
    data.forEach(r => {
        w.innerHTML += `
            <div class="char-card" id="rel-${r.id}" style="border-color: var(--accent-purple); border-top-color: var(--accent-purple);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4 style="margin: 0 0 5px 0; color: var(--accent-purple);">${r.charA ? r.charA.name : '?'} × ${r.charB ? r.charB.name : '?'}</h4>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditRelasi('${r.id}')">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusRelasi('${r.id}')">🗑️</button>
                    </div>
                </div>
                <span class="char-role" style="background: var(--bg-body); border: 1px solid var(--border-color);">${r.relationship_type}</span>
                <p style="margin: 5px 0; font-size: 12px; color: var(--text-muted);"><strong>Intensitas:</strong> ${r.intensity}</p>
                <p style="margin: 0; font-size: 13px;">${r.notes || '-'}</p>
            </div>`;
    });
}

// ==========================================
// MODUL 5: TIMELINE (CREATE, EDIT, DELETE)
// ==========================================
async function simpanTimeline() {
    const n = document.getElementById('input-time-nama').value;
    const t = document.getElementById('input-time-tgl').value;
    const l = document.getElementById('input-time-lokasi').value;
    const k = document.getElementById('input-time-kronologis').value;
    const nar = document.getElementById('input-time-naratif').value;
    const d = document.getElementById('input-time-desc').value;
    if (!n) return;

    const btn = document.querySelector('#tab-timeline .btn-primary'); btn.innerText = "⏳...";
    if (editTimeId) {
        await supabaseClient.from('timeline').update({ event_name: n, event_date: t, location: l, chronological_order: k ? parseInt(k) : null, narrative_order: nar ? parseInt(nar) : null, description: d }).eq('id', editTimeId);
        editTimeId = null; btn.innerText = "Simpan Event Timeline";
    } else {
        await supabaseClient.from('timeline').insert([{ project_id: activeProjectId, user_id: currentUser.id, event_name: n, event_date: t, location: l, chronological_order: k ? parseInt(k) : null, narrative_order: nar ? parseInt(nar) : null, description: d }]);
        btn.innerText = "Simpan Event Timeline";
    }
    
    document.querySelectorAll('#tab-timeline input, #tab-timeline textarea').forEach(i => i.value = '');
    tampilkanTimeline(); hitungProgress();
}

function siapkanEditTimeline(id) {
    const t = dataTimeGlobal.find(x => x.id === id); if(!t) return;
    editTimeId = id;
    document.getElementById('input-time-nama').value = t.event_name;
    document.getElementById('input-time-tgl').value = t.event_date;
    document.getElementById('input-time-lokasi').value = t.location;
    document.getElementById('input-time-kronologis').value = t.chronological_order || '';
    document.getElementById('input-time-naratif').value = t.narrative_order || '';
    document.getElementById('input-time-desc').value = t.description;
    document.querySelector('#tab-timeline .btn-primary').innerText = "Simpan Perubahan";
}

async function hapusTimeline(id) {
    if (!confirm("Yakin ingin menghapus kejadian ini?")) return;
    document.getElementById('time-' + id).style.opacity = '0.5';
    await supabaseClient.from('timeline').delete().eq('id', id);
    tampilkanTimeline(); hitungProgress();
}

async function tampilkanTimeline() {
    const { data } = await supabaseClient.from('timeline').select('*').eq('project_id', activeProjectId).order('chronological_order', { ascending: true });
    const w = document.getElementById('daftar-timeline');
    if (!data || data.length === 0) { w.innerHTML = "<p style='color: var(--text-muted);'>Belum ada event linimasa.</p>"; return; }
    dataTimeGlobal = data; w.innerHTML = "";
    data.forEach(t => {
        w.innerHTML += `
            <div class="plot-card" id="time-${t.id}" style="border-left: 4px solid var(--accent-purple);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <h4 style="margin: 0; color: var(--accent-purple);">${t.event_name}</h4>
                        <span style="font-size: 11px; background: var(--bg-body); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color);">${t.event_date || '-'}</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditTimeline('${t.id}')">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusTimeline('${t.id}')">🗑️</button>
                    </div>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: var(--text-muted);"><strong>Lokasi:</strong> ${t.location || '-'} | <strong>Krono:</strong> #${t.chronological_order || '-'} | <strong>Naratif:</strong> #${t.narrative_order || '-'}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; white-space: pre-wrap;">${t.description || '-'}</p>
            </div>`;
    });
}

// ==========================================
// MODUL 6: SCENES (CREATE, EDIT, DELETE)
// ==========================================
async function simpanScene() {
    const b = document.getElementById('input-scene-bab').value;
    const j = document.getElementById('input-scene-judul').value;
    const p = document.getElementById('input-scene-pov').value;
    const s = document.getElementById('input-scene-status').value;
    const t = document.getElementById('input-scene-tujuan').value;
    const k = document.getElementById('input-scene-konflik').value;
    const h = document.getElementById('input-scene-hasil').value;
    if (!j) return;

    const btn = document.querySelector('#tab-scenes .btn-primary'); btn.innerText = "⏳...";
    if (editSceneId) {
        await supabaseClient.from('scenes').update({ chapter: b, scene_title: j, pov: p, status: s, goal: t, conflict: k, outcome: h }).eq('id', editSceneId);
        editSceneId = null; btn.innerText = "Simpan Scene";
    } else {
        await supabaseClient.from('scenes').insert([{ project_id: activeProjectId, user_id: currentUser.id, chapter: b, scene_title: j, pov: p, status: s, goal: t, conflict: k, outcome: h, order_index: 1 }]);
        btn.innerText = "Simpan Scene";
    }
    
    document.querySelectorAll('#tab-scenes input[type=text], #tab-scenes textarea').forEach(i => i.value = '');
    document.getElementById('input-scene-status').value = "Planned";
    tampilkanScene(); hitungProgress();
}

function siapkanEditScene(id) {
    const s = dataSceneGlobal.find(x => x.id === id); if(!s) return;
    editSceneId = id;
    document.getElementById('input-scene-bab').value = s.chapter;
    document.getElementById('input-scene-judul').value = s.scene_title;
    document.getElementById('input-scene-pov').value = s.pov;
    document.getElementById('input-scene-status').value = s.status;
    document.getElementById('input-scene-tujuan').value = s.goal;
    document.getElementById('input-scene-konflik').value = s.conflict;
    document.getElementById('input-scene-hasil').value = s.outcome;
    document.querySelector('#tab-scenes .btn-primary').innerText = "Simpan Perubahan";
}

async function hapusScene(id) {
    if (!confirm("Yakin ingin menghapus scene outline ini?")) return;
    document.getElementById('scene-' + id).style.opacity = '0.5';
    await supabaseClient.from('scenes').delete().eq('id', id);
    tampilkanScene(); hitungProgress();
}

async function tampilkanScene() {
    const { data } = await supabaseClient.from('scenes').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
    const w = document.getElementById('daftar-scenes');
    if (!data || data.length === 0) { w.innerHTML = "<p style='color: var(--text-muted);'>Belum ada scene.</p>"; return; }
    dataSceneGlobal = data; w.innerHTML = "";
    data.forEach(s => {
        let sc = "var(--text-main)";
        if(s.status === "Drafted") sc = "#4285F4"; if(s.status === "Revised") sc = "#fbbc05"; if(s.status === "Final") sc = "#34a853";
        w.innerHTML += `
            <div class="plot-card" id="scene-${s.id}" style="border-left: 4px solid var(--accent-purple);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <h4 style="margin: 0; color: var(--accent-purple);">${s.chapter ? s.chapter + ': ' : ''}${s.scene_title}</h4>
                        <span style="font-size: 11px; background: var(--bg-body); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color); color: ${sc}; font-weight: bold;">${s.status}</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditScene('${s.id}')">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusScene('${s.id}')">🗑️</button>
                    </div>
                </div>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: var(--text-muted);"><strong>POV:</strong> ${s.pov || '-'} | <strong>Goal:</strong> ${s.goal || '-'}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: var(--text-muted);"><strong>Conflict:</strong> ${s.conflict || '-'} | <strong>Outcome:</strong> ${s.outcome || '-'}</p>
            </div>`;
    });
}

// ==========================================
// MODUL 7: GENRE TOOLKIT (CREATE, EDIT, DELETE)
// ==========================================
const genreCategories = {
    "Fantasi": ["Magic System", "Worldbuilding", "Factions", "Creatures", "Myths"],
    "Sci-Fi": ["Technology", "Worldbuilding", "Factions", "Species", "Political System", "Planets"],
    "Romance": ["Relationship Arc", "Attraction", "Conflict", "Turning Point", "Resolution"],
    "Misteri / Thriller": ["Clues", "Red Herrings", "Suspects", "Evidence", "Reveals", "Motive"]
};
function siapkanToolkitForm(genre) {
    const d = document.getElementById('input-toolkit-kategori');
    let o = genreCategories[genre] || ["General Notes", "Worldbuilding", "Themes"];
    d.innerHTML = ""; o.forEach(opt => { d.innerHTML += `<option value="${opt}">${opt}</option>`; });
}

async function simpanToolkit() {
    const k = document.getElementById('input-toolkit-kategori').value;
    const c = document.getElementById('input-toolkit-konten').value;
    if (!c) return;

    const btn = document.querySelector('#tab-toolkit .btn-primary'); btn.innerText = "⏳...";
    if (editToolkitId) {
        await supabaseClient.from('genre_notes').update({ category: k, content: c }).eq('id', editToolkitId);
        editToolkitId = null; btn.innerText = "Simpan Konsep";
    } else {
        await supabaseClient.from('genre_notes').insert([{ project_id: activeProjectId, user_id: currentUser.id, category: k, content: c }]);
        btn.innerText = "Simpan Konsep";
    }
    document.getElementById('input-toolkit-konten').value = "";
    tampilkanToolkit(); hitungProgress();
}

function siapkanEditToolkit(id) {
    const t = dataToolkitGlobal.find(x => x.id === id); if(!t) return;
    editToolkitId = id;
    document.getElementById('input-toolkit-kategori').value = t.category;
    document.getElementById('input-toolkit-konten').value = t.content;
    document.querySelector('#tab-toolkit .btn-primary').innerText = "Simpan Perubahan";
}

async function hapusToolkit(id) {
    if (!confirm("Yakin ingin menghapus catatan toolkit ini?")) return;
    document.getElementById('tool-' + id).style.opacity = '0.5';
    await supabaseClient.from('genre_notes').delete().eq('id', id);
    tampilkanToolkit(); hitungProgress();
}

async function tampilkanToolkit() {
    const { data } = await supabaseClient.from('genre_notes').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
    const w = document.getElementById('daftar-toolkit');
    if (!data || data.length === 0) { w.innerHTML = "<p style='color: var(--text-muted);'>Belum ada konsep.</p>"; return; }
    dataToolkitGlobal = data; w.innerHTML = "";
    data.forEach(n => {
        w.innerHTML += `
            <div class="plot-card" id="tool-${n.id}" style="border-left: 4px solid var(--accent-pink);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span style="font-size: 11px; background: var(--bg-body); padding: 3px 10px; border-radius: 12px; border: 1px solid var(--accent-pink); color: var(--accent-pink); font-weight: bold; text-transform: uppercase;">${n.category}</span>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0;" onclick="siapkanEditToolkit('${n.id}')">✏️</button>
                        <button class="btn btn-back" style="padding: 3px 8px; font-size: 11px; margin: 0; color: #ff4d4d;" onclick="hapusToolkit('${n.id}')">🗑️</button>
                    </div>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 14px; white-space: pre-wrap; line-height: 1.5;">${n.content}</p>
            </div>`;
    });
}

// ==========================================
// HITUNG PROGRESS & EXPORT (TXT & PDF)
// ==========================================
async function hitungProgress() {
    let t = 0; const pid = activeProjectId;
    async function cek(tbl) { const { count } = await supabaseClient.from(tbl).select('*', { count: 'exact', head: true }).eq('project_id', pid); return count || 0; }
    
    const docs = document.getElementById('input-docs-url').value;
    const p = await cek('plot_acts'), c = await cek('characters'), r = await cek('relationships');
    const ti = await cek('timeline'), s = await cek('scenes'), tk = await cek('genre_notes');
    
    t = Math.min(p*5,15) + Math.min(c*5,15) + Math.min(r*5,15) + Math.min(ti*5,15) + Math.min(s*5,15) + Math.min(tk*5,15);
    if(docs && docs.length>5) t+=10;
    
    const pTxt = document.getElementById('overview-progress-text');
    const pMsg = document.getElementById('overview-progress-msg');
    if(pTxt) pTxt.innerText = t + "%";
    
    let w = document.getElementById('overview-breakdown');
    if(!w) {
        w = document.createElement('div'); w.id = 'overview-breakdown';
        w.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:20px; border-top:1px dashed var(--border-color); padding-top:20px;';
        document.getElementById('tab-overview').appendChild(w);
    }
    w.innerHTML = '';
    const b = [ {n:'Plot',v:Math.round((Math.min(p*5,15)/15)*100)}, {n:'Characters',v:Math.round((Math.min(c*5,15)/15)*100)}, {n:'Relationships',v:Math.round((Math.min(r*5,15)/15)*100)}, {n:'Timeline',v:Math.round((Math.min(ti*5,15)/15)*100)}, {n:'Scenes',v:Math.round((Math.min(s*5,15)/15)*100)}, {n:'Toolkit',v:Math.round((Math.min(tk*5,15)/15)*100)} ];
    b.forEach(x => { let d = document.createElement('div'); d.style.fontSize='13px'; d.style.color='var(--text-muted)'; d.innerHTML=`<strong>${x.n}:</strong> ${x.v}%`; w.appendChild(d); });
    
    let m = "Proyek baru saja dimulai. Mari bangun duniamu!";
    if (t >= 15) m = "Fondasi mulai terlihat. Terus kembangkan!";
    if (t >= 45) m = "Kerangka cerita makin solid. Lanjutkan kinerjamu!";
    if (t >= 85) m = "Blueprint hampir sempurna! Waktunya fokus mengeksekusi naskah.";
    if(pMsg) pMsg.innerText = m;
}

async function kumpulkanDataBlueprint() {
    const id = activeProjectId; const p = daftarProyekGlobal.find(x => x.id === id);
    const { data: plot } = await supabaseClient.from('plot_acts').select('*').eq('project_id', id).order('created_at', { ascending: true });
    const { data: char } = await supabaseClient.from('characters').select('*').eq('project_id', id).order('created_at', { ascending: true });
    const { data: rel } = await supabaseClient.from('relationships').select('*, charA:character_a_id(name), charB:character_b_id(name)').eq('project_id', id);
    const { data: time } = await supabaseClient.from('timeline').select('*').eq('project_id', id).order('chronological_order', { ascending: true });
    const { data: scenes } = await supabaseClient.from('scenes').select('*').eq('project_id', id).order('created_at', { ascending: true });
    const { data: toolkit } = await supabaseClient.from('genre_notes').select('*').eq('project_id', id).order('created_at', { ascending: true });
    return { p, plot, char, rel, time, scenes, toolkit };
}

async function exportTXT() {
    const btn = document.getElementById('btn-export-txt'); btn.innerText = "⏳...";
    const d = await kumpulkanDataBlueprint();
    let txt = `=== ${d.p.title ? d.p.title.toUpperCase() : 'TANPA JUDUL'} ===
Genre: ${d.p.genre || '-'}

`;
    txt += `[1. PLOT ACTS]
`;
    if(d.plot && d.plot.length > 0) d.plot.forEach(x => txt += `${x.title}
${x.content}

`); else txt += `Belum ada data.

`;
    txt += `[2. CHARACTERS]
`;
    if(d.char && d.char.length > 0) d.char.forEach(x => txt += `- ${x.name.toUpperCase()} (${x.role})
  Motivasi: ${x.motivation}
`); else txt += `Belum ada data.

`;
    txt += `[3. RELATIONSHIPS]
`;
    if(d.rel && d.rel.length > 0) d.rel.forEach(x => txt += `- ${x.charA ? x.charA.name : '?'} x ${x.charB ? x.charB.name : '?'} [${x.relationship_type.toUpperCase()}]
  Intensitas: ${x.intensity} | Catatan: ${x.notes}
`); else txt += `Belum ada data.

`;
    txt += `[4. TIMELINE]
`;
    if(d.time && d.time.length > 0) d.time.forEach(x => txt += `- [${x.event_date}] ${x.event_name} (Lokasi: ${x.location})
  Urutan: Kronologis #${x.chronological_order}, Naratif #${x.narrative_order}
  Deskripsi: ${x.description}
`); else txt += `Belum ada data.

`;
    txt += `[5. SCENE OUTLINE]
`;
    if(d.scenes && d.scenes.length > 0) d.scenes.forEach(x => txt += `--- ${x.chapter ? x.chapter+': ' : ''}${x.scene_title.toUpperCase()} [${x.status}] ---
  POV: ${x.pov}
  Goal: ${x.goal}
  Conflict: ${x.conflict}
  Outcome: ${x.outcome}

`); else txt += `Belum ada data.

`;
    txt += `[6. GENRE TOOLKIT]
`;
    if(d.toolkit && d.toolkit.length > 0) d.toolkit.forEach(x => txt += `[${x.category.toUpperCase()}]
${x.content}

`); else txt += `Belum ada data.

`;
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `${d.p.title ? d.p.title.replace(/\s+/g, '_') : 'Blueprint'}_Kepompong.txt`; a.click();
    btn.innerText = "⬇️ TXT";
}

async function exportPDF() {
    const btn = document.getElementById('btn-export-pdf'); btn.innerText = "⏳...";
    const d = await kumpulkanDataBlueprint();
    const pw = window.open('', '_blank');
    let h = `<html><head><title>${d.p.title} - Blueprint</title><style>body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; } h1 { color: #8A2BE2; border-bottom: 2px solid #FFB6C1; padding-bottom: 10px; margin-bottom: 5px; } h2 { color: #8A2BE2; margin-top: 40px; text-transform: uppercase; letter-spacing: 1px; font-size: 18px; } h3 { color: #4A4A4A; margin-bottom: 5px; } .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid #8A2BE2; page-break-inside: avoid; } .badge { background: #eee; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #ddd; } ul { padding-left: 20px; } li { margin-bottom: 10px; }</style></head><body><h1>${d.p.title}</h1><p><strong>Genre:</strong> ${d.p.genre} | <strong>Diekspor pada:</strong> ${new Date().toLocaleDateString()}</p><h2>1. Plot Acts</h2>`;
    if(d.plot && d.plot.length > 0) d.plot.forEach(x => h += `<div class="card"><h3>${x.title}</h3><p style="white-space: pre-wrap; margin:0;">${x.content}</p></div>`); else h += `<p>Belum ada data.</p>`;
    h += `<h2>2. Characters</h2>`;
    if(d.char && d.char.length > 0) d.char.forEach(x => h += `<ul><li><strong>${x.name}</strong> <span class="badge">${x.role}</span><br>Motivasi: ${x.motivation}</li></ul>`); else h += `<p>Belum ada data.</p>`;
    h += `<h2>3. Relationships</h2>`;
    if(d.rel && d.rel.length > 0) d.rel.forEach(x => h += `<ul><li><strong>${x.charA ? x.charA.name : '?'} &times; ${x.charB ? x.charB.name : '?'}</strong> <span class="badge">${x.relationship_type}</span> (Intensitas: ${x.intensity})<br>Catatan: ${x.notes}</li></ul>`); else h += `<p>Belum ada data.</p>`;
    h += `<h2>4. Timeline</h2>`;
    if(d.time && d.time.length > 0) d.time.forEach(x => h += `<div class="card"><h3>[${x.event_date}] ${x.event_name}</h3><p style="margin:5px 0; font-size:13px;"><strong>Lokasi:</strong> ${x.location} | <strong>Kronologis:</strong> #${x.chronological_order} | <strong>Naratif:</strong> #${x.narrative_order}</p><p style="margin:0; white-space: pre-wrap;">${x.description}</p></div>`); else h += `<p>Belum ada data.</p>`;
    h += `<h2>5. Scenes</h2>`;
    if(d.scenes && d.scenes.length > 0) d.scenes.forEach(x => h += `<div class="card" style="border-left-color: #FFB6C1;"><h3>${x.chapter ? x.chapter+': ' : ''}${x.scene_title} <span class="badge">${x.status}</span></h3><p style="margin:5px 0; font-size:13px;"><strong>POV:</strong> ${x.pov} | <strong>Goal:</strong> ${x.goal}<br><strong>Conflict:</strong> ${x.conflict} | <strong>Outcome:</strong> ${x.outcome}</p></div>`); else h += `<p>Belum ada data.</p>`;
    h += `<h2>6. Genre Toolkit</h2>`;
    if(d.toolkit && d.toolkit.length > 0) d.toolkit.forEach(x => h += `<div class="card"><h3><span class="badge">${x.category}</span></h3><p style="margin:0; white-space: pre-wrap;">${x.content}</p></div>`); else h += `<p>Belum ada data.</p></body></html>`;
    pw.document.write(h); pw.document.close(); setTimeout(() => { pw.print(); btn.innerText = "⬇️ PDF"; }, 500);
}

function toggleTheme() {
    const root = document.documentElement; const themeBtn = document.getElementById('btn-theme'); 
    root.classList.toggle('dark-theme');
    if (root.classList.contains('dark-theme')) { localStorage.setItem('temaKepompong', 'dark'); themeBtn.innerText = '☀️'; } 
    else { localStorage.setItem('temaKepompong', 'light'); themeBtn.innerText = '🌙'; }
}
if (localStorage.getItem('temaKepompong') === 'dark') { document.getElementById('btn-theme').innerText = '☀️'; }
cekSesi(); supabaseClient.auth.onAuthStateChange(() => cekSesi());
