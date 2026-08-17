// ==========================================
// KONEKSI DATABASE 
// ==========================================
const supabaseUrl = 'https://gabdognjnvfhmqjfraaq.supabase.co';
const supabaseKey = 'sb_publishable_uAtPuuvMH2IpzmNwgSkUZg_sQhXAJTQ';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// MESIN JELAJAH KARYA
// ==========================================
async function muatKaryaPublik() {
    const genreFilter = document.getElementById('filter-genre').value;
    const sortOrder = document.getElementById('sort-order').value;
    const wadah = document.getElementById('public-feed');
    
    wadah.innerHTML = "<p style='grid-column: 1 / -1; color: var(--text-muted);'>Memuat...</p>";

    let query = supabaseClient.from('projects').select('*, profiles:user_id(global_pseudonym)').eq('visibility', 'public');
    if (genreFilter !== 'Semua') query = query.eq('genre', genreFilter);
    if (sortOrder === 'terbaru') query = query.order('created_at', { ascending: false });
    else query = query.order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
        wadah.innerHTML = "<p style='grid-column: 1 / -1; color: var(--text-muted);'>Belum ada karya publik yang sesuai kriteria di etalase ini.</p>";
        return;
    }

    wadah.innerHTML = "";
    data.forEach(p => {
        const namaPenulis = (p.profiles && p.profiles.global_pseudonym) ? p.profiles.global_pseudonym : 'Penulis Anonim';
        
        wadah.innerHTML += `
            <div class="card" style="margin-top: 0; transition: 0.2s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; font-size: 18px;">${p.title}</h3>
                        <p style="margin: 0 0 10px 0; font-size: 13px; color: var(--text-muted);">Oleh: <strong>${namaPenulis}</strong></p>
                        <span style="font-size: 12px; background: var(--bg-body); padding: 3px 8px; border-radius: 10px; border: 1px solid var(--accent-purple); color: var(--accent-purple);">${p.genre}</span>
                    </div>
                </div>
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 15px;">
                    Blueprint tersedia untuk diintip dan dipelajari.
                </p>
                <div style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 15px; display: flex; gap: 10px;">
                    <button class="btn" style="padding: 5px 15px; font-size: 12px; width: auto; background-color: var(--accent-pink); color: white;" onclick="window.location.href='viewer.html?id=${p.id}'">📖 Intip Blueprint</button>
                    <button class="btn" style="padding: 5px 15px; font-size: 12px; width: auto; background-color: var(--bg-btn-back); color: var(--text-main);" onclick="alert('Fitur Apresiasi / Bookmark segera hadir!')">🔖 Simpan</button>
                </div>
            </div>
        `;
    });
}

function toggleThemeExplore() {
    const root = document.documentElement; const themeBtn = document.getElementById('btn-theme'); 
    root.classList.toggle('dark-theme');
    if (root.classList.contains('dark-theme')) { localStorage.setItem('temaKepompong', 'dark'); themeBtn.innerText = '☀️'; } 
    else { localStorage.setItem('temaKepompong', 'light'); themeBtn.innerText = '🌙'; }
}

if (localStorage.getItem('temaKepompong') === 'dark') { document.getElementById('btn-theme').innerText = '☀️'; }
muatKaryaPublik();
