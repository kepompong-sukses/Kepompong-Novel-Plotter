// ==========================================
// KONEKSI SUPABASE
// ==========================================
const supabaseUrl = 'URL_SUPABASE_KAMU_DISINI';
const supabaseKey = 'KEY_SUPABASE_KAMU_DISINI';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Mengambil ID Penulis dari URL (misal: profil.html?id=12345)
const urlParams = new URLSearchParams(window.location.search);
const authorId = urlParams.get('id');

async function muatHalamanProfil() {
    if (!authorId) {
        document.getElementById('profil-nama').innerText = "Penulis Tidak Ditemukan";
        document.getElementById('profil-bio').innerText = "URL tidak lengkap.";
        document.getElementById('profil-karya').innerHTML = "";
        return;
    }

    // 1. Ambil Data Profil
    const { data: profil, error: errProfil } = await supabaseClient.from('profiles').select('*').eq('id', authorId).single();
    
    if (profil) {
        document.getElementById('profil-nama').innerText = profil.global_pseudonym || 'Penulis Anonim';
        document.getElementById('profil-bio').innerText = profil.bio || 'Penulis ini belum menuliskan bio.';
    }

    // 2. Ambil Karya Publik milik Penulis ini
    const wadahKarya = document.getElementById('profil-karya');
    const { data: karya, error: errKarya } = await supabaseClient.from('projects').select('*').eq('user_id', authorId).eq('visibility', 'public').order('created_at', { ascending: false });

    if (karya && karya.length > 0) {
        wadahKarya.innerHTML = "";
        karya.forEach(p => {
            const tautanDocs = p.google_docs_url 
                ? `📄 Baca Eksekusi Naskah` 
                : `📄 Naskah belum ditautkan`;

            wadahKarya.innerHTML += `
                
                    ${p.title}
                    Genre: ${p.genre}
                    ${tautanDocs}
                `;
        });
    } else {
        wadahKarya.innerHTML = "Penulis ini belum memiliki karya publik.";
    }
}

muatHalamanProfil();

// Sistem Tema
function toggleTheme() {
    const root = document.documentElement; const themeBtn = document.getElementById('btn-theme'); root.classList.toggle('dark-theme');
    if (root.classList.contains('dark-theme')) { localStorage.setItem('temaKepompong', 'dark'); themeBtn.innerText = '☀️'; } 
    else { localStorage.setItem('temaKepompong', 'light'); themeBtn.innerText = '🌙'; }
}
if (localStorage.getItem('temaKepompong') === 'dark') { document.getElementById('btn-theme').innerText = '☀️'; }