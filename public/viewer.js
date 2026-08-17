// ==========================================
// KONEKSI DATABASE
// ==========================================
const supabaseUrl = 'https://gabdognjnvfhmqjfraaq.supabase.co';
const supabaseKey = 'sb_publishable_uAtPuuvMH2IpzmNwgSkUZg_sQhXAJTQ';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Ambil ID Proyek dari URL (contoh: viewer.html?id=12345)
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

function bukaTabViewer(tabId, elemenTombol) {
    document.querySelectorAll('.project-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.project-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (elemenTombol) elemenTombol.classList.add('active');
} // <--- TANDA KURUNG INI YANG SEBELUMNYA HILANG!

function toggleTheme() {
    const root = document.documentElement; const themeBtn = document.getElementById('btn-theme'); 
    root.classList.toggle('dark-theme');
    if (root.classList.contains('dark-theme')) { localStorage.setItem('temaKepompong', 'dark'); themeBtn.innerText = '☀️'; } 
    else { localStorage.setItem('temaKepompong', 'light'); themeBtn.innerText = '🌙'; }
}
if (localStorage.getItem('temaKepompong') === 'dark') { document.getElementById('btn-theme').innerText = '☀️'; }

// ==========================================
// MESIN PEMUAT DATA (READ-ONLY)
// ==========================================
async function muatDataPublik() {
    if (!projectId) {
        document.getElementById('view-judul').innerText = "Proyek Tidak Ditemukan";
        return;
    }

    // 1. Ambil Data Proyek & Penulis
    const { data: p } = await supabaseClient.from('projects').select('*, profiles:user_id(global_pseudonym)').eq('id', projectId).single();
    if (!p || p.visibility !== 'public') {
        document.getElementById('view-judul').innerText = "Akses Ditolak / Proyek Privat";
        document.getElementById('view-genre').innerText = "Penulis menyembunyikan proyek ini.";
        return;
    }

    const namaPenulis = (p.profiles && p.profiles.global_pseudonym) ? p.profiles.global_pseudonym : 'Penulis Anonim';
    document.getElementById('view-judul').innerText = p.title;
    document.getElementById('view-genre').innerText = `${p.genre} · Oleh: ${namaPenulis}`;

    // 2. Tautkan Naskah (Jika ada)
    if (p.google_docs_url && p.google_docs_url.length > 5) {
        document.getElementById('docs-empty').style.display = 'none';
        document.getElementById('docs-viewer').style.display = 'block';
        document.getElementById('btn-buka-docs').href = p.google_docs_url;
        document.getElementById('iframe-docs').src = p.google_docs_url.includes('/edit') ? p.google_docs_url.replace('/edit', '/preview') : p.google_docs_url;
    }

    // 3. Tarik Semua Blueprint
    const { data: plot } = await supabaseClient.from('plot_acts').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    const { data: char } = await supabaseClient.from('characters').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    const { data: rel } = await supabaseClient.from('relationships').select('*, charA:character_a_id(name), charB:character_b_id(name)').eq('project_id', projectId).order('created_at', { ascending: false });
    const { data: time } = await supabaseClient.from('timeline').select('*').eq('project_id', projectId).order('chronological_order', { ascending: true });
    const { data: scenes } = await supabaseClient.from('scenes').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    const { data: toolkit } = await supabaseClient.from('genre_notes').select('*').eq('project_id', projectId).order('created_at', { ascending: true });

    // Render Plot
    const wPlot = document.getElementById('view-babak');
    if (!plot || plot.length === 0) wPlot.innerHTML = "<p style='color: var(--text-muted);'>Belum ada struktur plot.</p>";
    else {
        wPlot.innerHTML = "";
        plot.forEach(b => wPlot.innerHTML += `<div class="plot-card"><h4 style="margin:0; color: var(--accent-purple);">${b.title}</h4><p style="margin:10px 0 0 0; font-size:14px; white-space: pre-wrap;">${b.content}</p></div>`);
    }

    // Render Characters
    const wChar = document.getElementById('view-karakter');
    if (!char || char.length === 0) wChar.innerHTML = "<p style='color: var(--text-muted); grid-column: 1/-1;'>Belum ada karakter.</p>";
    else {
        wChar.innerHTML = "";
        char.forEach(c => {
            let label = c.role === 'protagonist' ? "Protagonis" : c.role === 'antagonist' ? "Antagonis" : "Pendukung";
            wChar.innerHTML += `<div class="char-card"><h4 style="margin: 0;">${c.name}</h4><span class="char-role" style="margin-top: 5px;">${label}</span><p style="margin: 5px 0 0 0;"><strong>Motivasi:</strong><br>${c.motivation || '-'}</p></div>`;
        });
    }

    // Render Relationships
    const wRel = document.getElementById('view-relasi');
    if (!rel || rel.length === 0) wRel.innerHTML = "<p style='color: var(--text-muted); grid-column: 1/-1;'>Belum ada dinamika hubungan.</p>";
    else {
        wRel.innerHTML = "";
        rel.forEach(r => {
            wRel.innerHTML += `<div class="char-card" style="border-color: var(--accent-purple); border-top-color: var(--accent-purple);"><h4 style="margin: 0 0 5px 0; color: var(--accent-purple);">${r.charA ? r.charA.name : '?'} × ${r.charB ? r.charB.name : '?'}</h4><span class="char-role" style="background: var(--bg-body); border: 1px solid var(--border-color);">${r.relationship_type}</span><p style="margin: 5px 0; font-size: 12px; color: var(--text-muted);"><strong>Intensitas:</strong> ${r.intensity}</p><p style="margin: 0; font-size: 13px;">${r.notes || '-'}</p></div>`;
        });
    }

    // Render Timeline
    const wTime = document.getElementById('view-timeline');
    if (!time || time.length === 0) wTime.innerHTML = "<p style='color: var(--text-muted);'>Belum ada event linimasa.</p>";
    else {
        wTime.innerHTML = "";
        time.forEach(t => {
            wTime.innerHTML += `<div class="plot-card" style="border-left: 4px solid var(--accent-purple);"><div style="display: flex; gap: 10px; align-items: center;"><h4 style="margin: 0; color: var(--accent-purple);">${t.event_name}</h4><span style="font-size: 11px; background: var(--bg-body); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color);">${t.event_date || '-'}</span></div><p style="margin: 5px 0 0 0; font-size: 13px; color: var(--text-muted);"><strong>Lokasi:</strong> ${t.location || '-'} | <strong>Krono:</strong> #${t.chronological_order || '-'} | <strong>Naratif:</strong> #${t.narrative_order || '-'}</p><p style="margin: 8px 0 0 0; font-size: 14px; white-space: pre-wrap;">${t.description || '-'}</p></div>`;
        });
    }

    // Render Scenes
    const wScenes = document.getElementById('view-scenes');
    if (!scenes || scenes.length === 0) wScenes.innerHTML = "<p style='color: var(--text-muted);'>Belum ada scene.</p>";
    else {
        wScenes.innerHTML = "";
        scenes.forEach(s => {
            let sc = "var(--text-main)";
            if(s.status === "Drafted") sc = "#4285F4"; if(s.status === "Revised") sc = "#fbbc05"; if(s.status === "Final") sc = "#34a853";
            wScenes.innerHTML += `<div class="plot-card" style="border-left: 4px solid var(--accent-purple);"><div style="display: flex; gap: 10px; align-items: center;"><h4 style="margin: 0; color: var(--accent-purple);">${s.chapter ? s.chapter + ': ' : ''}${s.scene_title}</h4><span style="font-size: 11px; background: var(--bg-body); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color); color: ${sc}; font-weight: bold;">${s.status}</span></div><p style="margin: 5px 0 0 0; font-size: 13px; color: var(--text-muted);"><strong>POV:</strong> ${s.pov || '-'} | <strong>Goal:</strong> ${s.goal || '-'}</p><p style="margin: 5px 0 0 0; font-size: 13px; color: var(--text-muted);"><strong>Conflict:</strong> ${s.conflict || '-'} | <strong>Outcome:</strong> ${s.outcome || '-'}</p></div>`;
        });
    }

    // Render Toolkit
    const wTool = document.getElementById('view-toolkit');
    if (!toolkit || toolkit.length === 0) wTool.innerHTML = "<p style='color: var(--text-muted);'>Belum ada konsep.</p>";
    else {
        wTool.innerHTML = "";
        toolkit.forEach(n => {
            wTool.innerHTML += `<div class="plot-card" style="border-left: 4px solid var(--accent-pink);"><span style="font-size: 11px; background: var(--bg-body); padding: 3px 10px; border-radius: 12px; border: 1px solid var(--accent-pink); color: var(--accent-pink); font-weight: bold; text-transform: uppercase;">${n.category}</span><p style="margin: 10px 0 0 0; font-size: 14px; white-space: pre-wrap; line-height: 1.5;">${n.content}</p></div>`;
        });
    }

    // Hitung Progress
    const lenP = plot?plot.length:0, lenC = char?char.length:0, lenR = rel?rel.length:0, lenT = time?time.length:0, lenS = scenes?scenes.length:0, lenTk = toolkit?toolkit.length:0;
    let total = Math.min(lenP*5,15) + Math.min(lenC*5,15) + Math.min(lenR*5,15) + Math.min(lenT*5,15) + Math.min(lenS*5,15) + Math.min(lenTk*5,15);
    if(p.google_docs_url && p.google_docs_url.length>5) total+=10;
    
    document.getElementById('view-progress-text').innerText = total + "%";
    document.getElementById('view-progress-msg').innerText = "Rangkuman kesiapan blueprint dari penulis ini.";
    
    const w = document.getElementById('view-breakdown');
    const b = [ {n:'Plot',v:Math.round((Math.min(lenP*5,15)/15)*100)}, {n:'Characters',v:Math.round((Math.min(lenC*5,15)/15)*100)}, {n:'Relationships',v:Math.round((Math.min(lenR*5,15)/15)*100)}, {n:'Timeline',v:Math.round((Math.min(lenT*5,15)/15)*100)}, {n:'Scenes',v:Math.round((Math.min(lenS*5,15)/15)*100)}, {n:'Toolkit',v:Math.round((Math.min(lenTk*5,15)/15)*100)} ];
    w.innerHTML = "";
    b.forEach(x => { let d = document.createElement('div'); d.style.fontSize='13px'; d.style.color='var(--text-muted)'; d.innerHTML=`<strong>${x.n}:</strong> ${x.v}%`; w.appendChild(d); });
}

muatDataPublik();