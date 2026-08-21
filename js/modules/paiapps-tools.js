// js/modules/paiapps-tools.js
import supabase from '../supabase.js';

let daftarSiswaAcak = [];
let timerInterval = null;
let sisaDetikTimer = 0;

const listHadis = [
    '"Menuntut ilmu itu wajib atas setiap muslim." (HR. Ibnu Majah)',
    '"Sebaik-baik kalian adalah orang yang belajar Al-Qur\'an dan mengajarkannya." (HR. Bukhari)',
    '"Sesungguhnya amal itu tergantung pada niatnya." (HR. Bukhari & Muslim)',
    '"Kebersihan itu sebagian dari iman." (HR. Muslim)',
    '"Tersenyum di hadapan saudaramu adalah sedekah." (HR. Tirmidzi)'
];

// ================= KONTROL SUB-TAB INDUK =================
window.initPaiApps = function() {
    window.bukaSubTabPaiApps('dashboard');
};

window.bukaSubTabPaiApps = async function(subTab) {
    const btnDash = document.getElementById('btn-subtab-dashboard');
    const btnTools = document.getElementById('btn-subtab-tools');
    const container = document.getElementById('paiapps-sub-content');

    if (!container) return;

    if (btnDash) btnDash.classList.remove('active');
    if (btnTools) btnTools.classList.remove('active');

    const activeBtn = document.getElementById(`btn-subtab-${subTab}`);
    if (activeBtn) activeBtn.classList.add('active');

    container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--neon-green);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat halaman...</div>';

    try {
        const response = await fetch(`pages/paiapps-${subTab}.html`);
        if (!response.ok) throw new Error('Halaman tidak ditemukan');
        const html = await response.text();
        container.innerHTML = html;

        if (subTab === 'dashboard' && typeof window.loadDashboardPaiApps === 'function') {
            window.loadDashboardPaiApps();
        } else if (subTab === 'tools') {
            window.loadKelasAcakSiswa();
        }
    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--neon-red);">Gagal memuat sub-tab: ${e.message}</div>`;
    }
};

// ================= FITUR TOOLS =================
window.bukaTool = function(toolId) {
    window.tutupSemuaTools();
    const box = document.getElementById(`box-tool-${toolId}`);
    if (box) box.style.display = 'block';
};

window.tutupSemuaTools = function() {
    document.querySelectorAll('.tool-box-area').forEach(el => el.style.display = 'none');
};

// 1. Acak Siswa
window.loadKelasAcakSiswa = async function() {
    const sel = document.getElementById('pilih-kelas-acak');
    if (!sel) return;

    try {
        const { data, error } = await supabase.from('kelas').select('id, nama_kelas').eq('status_kelas', true).order('nama_kelas');
        if (error) throw error;

        let opt = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(k => { opt += `<option value="${k.id}">${k.nama_kelas}</option>`; });
        sel.innerHTML = opt;
    } catch (e) {
        console.error("Gagal load kelas acak:", e);
    }
};

window.loadSiswaUntukAcak = async function() {
    const idKelas = document.getElementById('pilih-kelas-acak').value;
    if (!idKelas) {
        daftarSiswaAcak = [];
        return;
    }

    try {
        const { data, error } = await supabase.from('anggota_kelas').select('siswa(nama_siswa)').eq('id_kelas', idKelas);
        if (error) throw error;
        daftarSiswaAcak = data.map(d => d.siswa ? d.siswa.nama_siswa : '').filter(n => n !== '');
    } catch (e) {
        console.error("Gagal memuat siswa:", e);
    }
};

window.putarAcakSiswa = function() {
    const box = document.getElementById('hasil-acak-siswa');
    if (daftarSiswaAcak.length === 0) {
        alert("Pilih kelas yang memiliki data siswa terlebih dahulu!");
        return;
    }

    let putaran = 0;
    const interval = setInterval(() => {
        const randomName = daftarSiswaAcak[Math.floor(Math.random() * daftarSiswaAcak.length)];
        box.innerText = randomName;
        putaran++;
        if (putaran > 15) {
            clearInterval(interval);
            box.innerText = `🎉 ${randomName} 🎉`;
        }
    }, 100);
};

// 2. Timer
window.setTimerMenit = function(menit) {
    sisaDetikTimer = menit * 60;
    updateDisplayTimer();
};

function updateDisplayTimer() {
    const el = document.getElementById('display-timer');
    if (!el) return;
    const m = Math.floor(sisaDetikTimer / 60).toString().padStart(2, '0');
    const s = (sisaDetikTimer % 60).toString().padStart(2, '0');
    el.innerText = `${m}:${s}`;
}

window.mulaiTimer = function() {
    if (timerInterval) clearInterval(timerInterval);
    if (sisaDetikTimer <= 0) return;

    timerInterval = setInterval(() => {
        if (sisaDetikTimer > 0) {
            sisaDetikTimer--;
            updateDisplayTimer();
        } else {
            clearInterval(timerInterval);
            alert("⏰ Waktu belajar selesai!");
        }
    }, 1000);
};

window.stopTimer = function() {
    if (timerInterval) clearInterval(timerInterval);
    sisaDetikTimer = 0;
    updateDisplayTimer();
};

// 3. Bank Hadis
window.gantiHadisAcak = function() {
    const el = document.getElementById('isi-kutipan-hadis');
    if (!el) return;
    const hadis = listHadis[Math.floor(Math.random() * listHadis.length)];
    el.innerText = hadis;
};

// 4. Kalkulator Nilai
window.hitungNilaiCepat = function() {
    const b = parseFloat(document.getElementById('calc-benar').value) || 0;
    const t = parseFloat(document.getElementById('calc-total').value) || 0;
    const out = document.getElementById('hasil-kalkulator');
    if (t > 0) {
        const hasil = Math.round((b / t) * 100);
        out.innerText = `Nilai: ${hasil}`;
    } else {
        out.innerText = 'Nilai: 0';
    }
};