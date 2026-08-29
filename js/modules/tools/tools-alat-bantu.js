// js/modules/tools/tools-alat-bantu.js
import supabase from '../../supabase.js';

let daftarSiswaAcak = [];
let timerInterval = null;
let sisaDetikTimer = 0;
let antreanGiliran = [];
let riwayatSudahMaju = [];

// ================= INISIALISASI DROPDOWN KELAS =================
window.initToolsAlatBantu = function() {
    window.loadDropdownKelasTools();
};

window.bukaTool = function(toolId) {
    window.tutupSemuaTools();
    const box = document.getElementById(`box-tool-${toolId}`);
    if (box) box.style.display = 'block';
};

window.tutupSemuaTools = function() {
    document.querySelectorAll('.tool-box-area').forEach(el => el.style.display = 'none');
};

window.loadDropdownKelasTools = async function() {
    const selAcak = document.getElementById('pilih-kelas-acak');
    const selKelompok = document.getElementById('pilih-kelas-kelompok');

    try {
        const { data, error } = await supabase
            .from('kelas')
            .select('id, nama_kelas, tingkat')
            .eq('status_kelas', true)
            .order('tingkat')
            .order('nama_kelas');
            
        if (error) throw error;

        let opt = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(k => { 
            opt += `<option value="${k.id}">${k.nama_kelas} (Tingkat ${k.tingkat})</option>`; 
        });
        
        if (selAcak) selAcak.innerHTML = opt;
        if (selKelompok) selKelompok.innerHTML = opt;
    } catch (e) {
        console.error("Gagal load kelas tools:", e);
    }
};

// ================= 1. FITUR ACAK SISWA =================
window.loadSiswaUntukAcak = async function() {
    const idKelas = document.getElementById('pilih-kelas-acak').value;
    if (!idKelas) {
        daftarSiswaAcak = [];
        return;
    }

    try {
        const { data, error } = await supabase
            .from('anggota_kelas')
            .select('siswa(nama_siswa)')
            .eq('id_kelas', idKelas);
            
        if (error) throw error;
        daftarSiswaAcak = data.map(d => d.siswa ? d.siswa.nama_siswa : '').filter(n => n !== '');
    } catch (e) {
        console.error("Gagal memuat siswa acak:", e);
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

// ================= 2. FITUR TIMER PEMBELAJARAN =================
window.setTimerMenit = function(menit) {
    sisaDetikTimer = menit * 60;
    updateDisplayTimer();
};

window.setTimerKustom = function() {
    const val = parseInt(document.getElementById('input-kustom-menit').value);
    if (!val || val <= 0) {
        alert("Masukkan angka menit yang valid!");
        return;
    }
    sisaDetikTimer = val * 60;
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
    if (sisaDetikTimer <= 0) {
        alert("Atur waktu terlebih dahulu!");
        return;
    }

    timerInterval = setInterval(() => {
        if (sisaDetikTimer > 0) {
            sisaDetikTimer--;
            updateDisplayTimer();
        } else {
            clearInterval(timerInterval);
            alert("⏰ Waktu pembelajaran selesai!");
        }
    }, 1000);
};

window.stopTimer = function() {
    if (timerInterval) clearInterval(timerInterval);
    sisaDetikTimer = 0;
    updateDisplayTimer();
};

// ================= 3. FITUR SPIN KELOMPOK MAJU =================
window.putarUndianMaju = function() {
    const txtArea = document.getElementById('input-list-giliran');
    const displayBox = document.getElementById('display-spin-pemenang');
    const boxSudah = document.getElementById('daftar-sudah-maju-box');
    const textSudah = document.getElementById('text-sudah-maju');

    if (antreanGiliran.length === 0) {
        const raw = txtArea.value.trim();
        if (!raw) {
            alert("Masukkan daftar kelompok / nama terlebih dahulu!");
            return;
        }
        antreanGiliran = raw.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
        riwayatSudahMaju = [];
    }

    if (antreanGiliran.length === 0) {
        displayBox.innerText = "Semua kelompok sudah maju! 🎉";
        return;
    }

    let putaran = 0;
    const interval = setInterval(() => {
        const randomItem = antreanGiliran[Math.floor(Math.random() * antreanGiliran.length)];
        displayBox.innerText = randomItem;
        putaran++;

        if (putaran > 15) {
            clearInterval(interval);
            const terpilihIndex = Math.floor(Math.random() * antreanGiliran.length);
            const pemenang = antreanGiliran.splice(terpilihIndex, 1)[0];
            riwayatSudahMaju.push(pemenang);

            displayBox.innerText = `🎯 ${pemenang} 🎯`;

            if (boxSudah && textSudah) {
                boxSudah.style.display = 'block';
                textSudah.innerText = riwayatSudahMaju.join(' ➔ ');
            }

            if (antreanGiliran.length === 0) {
                setTimeout(() => { alert("Semua kelompok telah terpilih maju!"); }, 500);
            }
        }
    }, 100);
};

window.resetUndianMaju = function() {
    antreanGiliran = [];
    riwayatSudahMaju = [];
    const displayBox = document.getElementById('display-spin-pemenang');
    const boxSudah = document.getElementById('daftar-sudah-maju-box');
    if (displayBox) displayBox.innerText = "Siap untuk diundi";
    if (boxSudah) boxSudah.style.display = 'none';
};

// ================= 4. FITUR BAGI KELOMPOK =================
window.prosesBagiKelompok = async function() {
    const idKelas = document.getElementById('pilih-kelas-kelompok').value;
    const jmlKelompok = parseInt(document.getElementById('input-jumlah-kelompok').value) || 2;
    const container = document.getElementById('hasil-pembagian-kelompok');

    if (!idKelas) {
        alert("Pilih kelas terlebih dahulu!");
        return;
    }
    if (jmlKelompok < 2) {
        alert("Jumlah kelompok minimal 2!");
        return;
    }

    container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:15px; color:var(--neon-green);"><i class="fa-solid fa-spinner fa-spin"></i> Membentuk kelompok seimbang...</div>';

    try {
        const { data, error } = await supabase
            .from('anggota_kelas')
            .select(`siswa(nama_siswa, jenis_kelamin)`)
            .eq('id_kelas', idKelas);

        if (error) throw error;

        const siswaList = (data || []).map(d => d.siswa).filter(s => s && s.nama_siswa);
        if (siswaList.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:10px; color:var(--text-abu);">Tidak ada data siswa di kelas ini.</div>';
            return;
        }

        if (jmlKelompok > siswaList.length) {
            alert(`Jumlah kelompok (${jmlKelompok}) tidak boleh lebih banyak dari jumlah siswa (${siswaList.length})!`);
            container.innerHTML = '';
            return;
        }

        const arrLaki = siswaList.filter(s => s.jenis_kelamin === 'L');
        const arrPerempuan = siswaList.filter(s => s.jenis_kelamin !== 'L');

        const acakArray = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        };
        acakArray(arrLaki);
        acakArray(arrPerempuan);

        const kelompokHasil = Array.from({ length: jmlKelompok }, () => []);
        const [kategori1, kategori2] = arrLaki.length >= arrPerempuan.length 
            ? [arrLaki, arrPerempuan] 
            : [arrPerempuan, arrLaki];

        let indexKelompok = 0;

        kategori1.forEach(siswa => {
            kelompokHasil[indexKelompok].push({ nama: siswa.nama_siswa, jk: siswa.jenis_kelamin });
            indexKelompok = (indexKelompok + 1) % jmlKelompok;
        });

        kategori2.forEach(siswa => {
            kelompokHasil[indexKelompok].push({ nama: siswa.nama_siswa, jk: siswa.jenis_kelamin });
            indexKelompok = (indexKelompok + 1) % jmlKelompok;
        });

        let html = '';
        const listNamaKelompok = [];
        kelompokHasil.forEach((anggota, i) => {
            const namaKlp = `Kelompok ${i + 1}`;
            listNamaKelompok.push(namaKlp);

            const jmlL = anggota.filter(a => a.jk === 'L').length;
            const jmlP = anggota.filter(a => a.jk !== 'L').length;

            html += `
                <div class="box-kelompok-item">
                    <h4>
                        <span>${namaKlp}</span> 
                        <span style="font-size:10px; font-weight:600; color:var(--text-abu);">(${anggota.length} Siswa | ${jmlL}L ${jmlP}P)</span>
                    </h4>
                    <ol>
                        ${anggota.map(a => `<li>${a.nama} ${a.jk === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue); font-size:9px;"></i>' : '<i class="fa-solid fa-venus" style="color:var(--neon-red); font-size:9px;"></i>'}</li>`).join('')}
                    </ol>
                </div>
            `;
        });
        container.innerHTML = html;

        const txtSpin = document.getElementById('input-list-giliran');
        if (txtSpin) txtSpin.value = listNamaKelompok.join(', ');

    } catch (e) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:10px; color:var(--neon-red);">Gagal: ${e.message}</div>`;
    }
};