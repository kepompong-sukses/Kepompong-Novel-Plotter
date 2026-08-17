const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = 3000;

// Alat bantu agar server bisa membaca data dari frontend
app.use(cors());
app.use(express.json());

// Menyajikan file tampilan (HTML/CSS/JS) dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// KONEKSI SUPABASE
// Ganti bagian di dalam tanda kutip dengan milikmu!
// ==========================================
const supabaseUrl = 'https://gabdognjnvfhmqjfraaq.supabase.co';
const supabaseKey = 'sb_publishable_uAtPuuvMH2IpzmNwgSkUZg_sQhXAJTQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// RUTE SERVER (API)
// ==========================================

// Rute untuk mengecek apakah server hidup
app.get('/api/status', (req, res) => {
    res.json({ pesan: 'Halo Penulis! Server Kepompong Novel Plotter siap digunakan.' });
});

// Menyalakan server
app.listen(port, () => {
    console.log(`Server Kepompong menyala di http://localhost:${port}`);
});