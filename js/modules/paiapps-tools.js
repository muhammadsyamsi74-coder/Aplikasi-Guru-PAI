// js/modules/paiapps-tools.js
import supabase from '../supabase.js';

let daftarSiswaAcak = [];
let timerInterval = null;
let sisaDetikTimer = 0;

let antreanGiliran = [];
let riwayatSudahMaju = [];

// Data Cache & Status Ekspansi Dokumen
let cacheMateriAjar = [];
let cachePerangkatAjar = [];
let cacheKonsepCeramah = []; 
let isExpandedMateri = false;
let isExpandedPerangkat = false;
let isExpandedCeramah = false; 

// Status Cache Load untuk Accordion (Menghindari reload berulang)
let isPerangkatLoaded = false;
let isWaLoaded = false;
let isCeramahLoaded = false;

// Cache Siswa Kelas Aktif untuk Konfigurasi WhatsApp
let cacheSiswaPerKelasMap = new Map();

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
            isPerangkatLoaded = false;
            isWaLoaded = false;
            isCeramahLoaded = false;
            window.loadDropdownKelasTools();
            window.loadCardsMateriAjar();
            window.setTahunAjaranOtomatis();
        }
    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--neon-red);">Gagal memuat sub-tab: ${e.message}</div>`;
    }
};

// ================= KONTROL MODAL ALAT BANTU =================
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
        const { data, error } = await supabase.from('kelas').select('id, nama_kelas, tingkat').eq('status_kelas', true).order('tingkat').order('nama_kelas');
        if (error) throw error;

        let opt = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(k => { opt += `<option value="${k.id}">${k.nama_kelas} (Tingkat ${k.tingkat})</option>`; });
        
        if (selAcak) selAcak.innerHTML = opt;
        if (selKelompok) selKelompok.innerHTML = opt;
    } catch (e) {
        console.error("Gagal load kelas tools:", e);
    }
};

// ================= TOGGLE OPSI LAINNYA =================
window.toggleInputLainnyaMateri = function(el) {
    const inp = document.getElementById('mat-jenis-kustom');
    if (el.value === 'Lainnya') {
        inp.style.display = 'block';
        inp.required = true;
        inp.focus();
    } else {
        inp.style.display = 'none';
        inp.required = false;
        inp.value = '';
    }
};

window.toggleInputLainnyaPerangkat = function(el) {
    const inp = document.getElementById('per-jenis-kustom');
    if (el.value === 'Lainnya') {
        inp.style.display = 'block';
        inp.required = true;
        inp.focus();
    } else {
        inp.style.display = 'none';
        inp.required = false;
        inp.value = '';
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

// ================= 5. FITUR MATERI AJAR =================
window.toggleFormMateriAjar = function() {
    const wrap = document.getElementById('form-wrap-materi');
    wrap.style.display = (wrap.style.display === 'none') ? 'block' : 'none';
};

window.simpanMateriAjar = async function(event) {
    event.preventDefault();
    let jenis = document.getElementById('mat-jenis').value;
    if (jenis === 'Lainnya') {
        jenis = document.getElementById('mat-jenis-kustom').value.trim();
    }

    const semester = document.getElementById('mat-semester').value;
    const judul = document.getElementById('mat-judul').value.trim();
    const deskripsi = document.getElementById('mat-deskripsi').value.trim();
    const tahun = document.getElementById('mat-tahun').value.trim();
    const isPinned = document.getElementById('mat-pin').checked;
    const link = document.getElementById('mat-link').value.trim();

    if (!jenis) {
        alert("Jenis materi ajar wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-simpan-materi');
    const txtAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        if (isPinned) {
            const { count, error: errCount } = await supabase
                .from('materiajar')
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) {
                alert("Batas maksimal 25 Pin tercapai!");
                return;
            }
        }

        const { error } = await supabase.from('materiajar').insert([{
            jenis_materi: jenis,
            judul_materi: judul,
            deskripsi_singkat: deskripsi || null,
            tahun_ajaran: tahun,
            semester: semester,
            is_pinned: isPinned,
            link_materi: link
        }]);

        if (error) throw error;

        alert("Materi ajar berhasil disimpan!");
        event.target.reset();
        document.getElementById('mat-jenis-kustom').style.display = 'none';
        window.setTahunAjaranOtomatis();
        document.getElementById('form-wrap-materi').style.display = 'none';
        window.loadCardsMateriAjar();

    } catch (e) {
        alert("Gagal menyimpan materi: " + e.message);
    } finally {
        btn.innerHTML = txtAsli;
        btn.disabled = false;
    }
};

window.loadCardsMateriAjar = async function() {
    const container = document.getElementById('list-cards-materi');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('materiajar')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        cacheMateriAjar = data || [];
        renderMateriAjarUI();

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal: ${e.message}</div>`;
    }
};

function renderMateriAjarUI() {
    const container = document.getElementById('list-cards-materi');
    const btnExpand = document.getElementById('btn-expand-materi');
    if (!container) return;

    if (cacheMateriAjar.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada materi ajar yang diunggah.</div>';
        if (btnExpand) btnExpand.style.display = 'none';
        return;
    }

    const dataTampil = isExpandedMateri ? cacheMateriAjar : cacheMateriAjar.slice(0, 9);

    let html = '';
    dataTampil.forEach(item => {
        const pinClass = item.is_pinned ? 'pinned' : '';
        const iconPinBtn = item.is_pinned 
            ? '<i class="fa-solid fa-thumbtack" style="color:var(--neon-yellow);"></i>' 
            : '<i class="fa-regular fa-thumbtack" style="color:var(--text-abu);"></i>';

        html += `
            <div class="item-doc-row ${pinClass}">
                <div class="doc-left-area">
                    <button onclick="togglePinDoc('materiajar', '${item.id}', ${item.is_pinned})" class="btn-icon-doc" title="Pin ke atas">${iconPinBtn}</button>
                    <div class="doc-text-wrap">
                        <span class="badge-doc-tag">${item.jenis_materi}</span>
                        <b style="font-size:11px; color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.judul_materi}">
                            ${item.judul_materi}
                        </b>
                    </div>
                </div>
                <div class="doc-actions-wrap">
                    <button onclick="window.open('${item.link_materi}', '_blank')" class="btn-icon-doc" style="color:var(--neon-green); border-color:rgba(5,213,138,0.3);" title="Buka Link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button onclick="copyLinkDoc('${item.link_materi}')" class="btn-icon-doc" style="color:var(--neon-blue); border-color:rgba(59,130,246,0.3);" title="Salin Link">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="hapusDocItem('materiajar', '${item.id}', '${item.judul_materi}')" class="btn-icon-doc" style="color:var(--neon-red); border-color:rgba(239,68,68,0.3);" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (btnExpand) {
        if (cacheMateriAjar.length > 9) {
            btnExpand.style.display = 'flex';
            btnExpand.innerHTML = isExpandedMateri 
                ? '<i class="fa-solid fa-chevron-up"></i> Tampilkan Lebih Sedikit' 
                : `<i class="fa-solid fa-chevron-down"></i> Tampilkan Semua (${cacheMateriAjar.length})`;
        } else {
            btnExpand.style.display = 'none';
        }
    }
}

window.toggleExpandMateri = function() {
    isExpandedMateri = !isExpandedMateri;
    renderMateriAjarUI();
};

// ================= FITUR BANK KONSEP CERAMAH & KHUTBAH (COLLAPSIBLE) =================
window.toggleSectionCeramah = function() {
    const content = document.getElementById('section-ceramah-content');
    const icon = document.getElementById('icon-chevron-ceramah');
    const btn = document.getElementById('btn-toggle-ceramah-section');

    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-ceramah"></i> Tutup';

        if (!isCeramahLoaded) {
            window.loadCardsKonsepCeramah();
            isCeramahLoaded = true;
        }
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-ceramah"></i> Buka Konsep';
    }
};

window.toggleFormKonsepCeramah = function() {
    const wrap = document.getElementById('form-wrap-ceramah');
    if (!wrap) return;
    wrap.style.display = (wrap.style.display === 'none') ? 'block' : 'none';
};

window.simpanKonsepCeramah = async function(event) {
    event.preventDefault();
    const judul = document.getElementById('cer-judul').value.trim();
    const link = document.getElementById('cer-link').value.trim();
    const isPinned = document.getElementById('cer-pin').checked;

    if (!judul || !link) {
        alert("Judul dan link materi wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-simpan-ceramah');
    const txtAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        if (isPinned) {
            const { count, error: errCount } = await supabase
                .from('konsepceramah')
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) {
                alert("Batas maksimal 25 Pin tercapai!");
                return;
            }
        }

        const { error } = await supabase.from('konsepceramah').insert([{
            judul_konsep: judul,
            link_materi: link,
            is_pinned: isPinned
        }]);

        if (error) throw error;

        alert("Konsep ceramah/khutbah berhasil disimpan!");
        event.target.reset();
        document.getElementById('form-wrap-ceramah').style.display = 'none';
        window.loadCardsKonsepCeramah();

    } catch (e) {
        alert("Gagal menyimpan konsep ceramah: " + e.message);
    } finally {
        btn.innerHTML = txtAsli;
        btn.disabled = false;
    }
};

window.loadCardsKonsepCeramah = async function() {
    const container = document.getElementById('list-cards-ceramah');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('konsepceramah')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        cacheKonsepCeramah = data || [];
        renderKonsepCeramahUI(cacheKonsepCeramah);

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal: ${e.message}</div>`;
    }
};

function renderKonsepCeramahUI(dataList) {
    const container = document.getElementById('list-cards-ceramah');
    const btnExpand = document.getElementById('btn-expand-ceramah');
    if (!container) return;

    if (!dataList || dataList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada konsep ceramah yang tersimpan.</div>';
        if (btnExpand) btnExpand.style.display = 'none';
        return;
    }

    const dataTampil = isExpandedCeramah ? dataList : dataList.slice(0, 9);

    let html = '';
    dataTampil.forEach(item => {
        const pinClass = item.is_pinned ? 'pinned' : '';
        const iconPinBtn = item.is_pinned 
            ? '<i class="fa-solid fa-thumbtack" style="color:var(--neon-yellow);"></i>' 
            : '<i class="fa-regular fa-thumbtack" style="color:var(--text-abu);"></i>';

        html += `
            <div class="item-doc-row ${pinClass}">
                <div class="doc-left-area">
                    <button onclick="togglePinDoc('konsepceramah', '${item.id}', ${item.is_pinned})" class="btn-icon-doc" title="Pin ke atas">${iconPinBtn}</button>
                    <div class="doc-text-wrap">
                        <b style="font-size:11px; color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.judul_konsep}">
                            <i class="fa-solid fa-book-quran" style="color:var(--neon-purple); margin-right:4px;"></i>${item.judul_konsep}
                        </b>
                    </div>
                </div>
                <div class="doc-actions-wrap">
                    <button onclick="window.open('${item.link_materi}', '_blank')" class="btn-icon-doc" style="color:var(--neon-green); border-color:rgba(5,213,138,0.3);" title="Buka Link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button onclick="copyLinkDoc('${item.link_materi}')" class="btn-icon-doc" style="color:var(--neon-blue); border-color:rgba(59,130,246,0.3);" title="Salin Link">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="hapusDocItem('konsepceramah', '${item.id}', '${item.judul_konsep}')" class="btn-icon-doc" style="color:var(--neon-red); border-color:rgba(239,68,68,0.3);" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (btnExpand) {
        if (dataList.length > 9) {
            btnExpand.style.display = 'flex';
            btnExpand.innerHTML = isExpandedCeramah 
                ? '<i class="fa-solid fa-chevron-up"></i> Tampilkan Lebih Sedikit' 
                : `<i class="fa-solid fa-chevron-down"></i> Tampilkan Semua (${dataList.length})`;
        } else {
            btnExpand.style.display = 'none';
        }
    }
}

window.cariKonsepCeramah = function(keyword) {
    const query = (keyword || '').trim().toLowerCase();
    if (!query) {
        renderKonsepCeramahUI(cacheKonsepCeramah);
        return;
    }
    const hasilFilter = cacheKonsepCeramah.filter(item => 
        (item.judul_konsep || '').toLowerCase().includes(query)
    );
    renderKonsepCeramahUI(hasilFilter);
};

window.toggleExpandCeramah = function() {
    isExpandedCeramah = !isExpandedCeramah;
    const inputCari = document.getElementById('cari-konsep-ceramah');
    window.cariKonsepCeramah(inputCari ? inputCari.value : '');
};


// ================= 6. FITUR PERANGKAT AJAR (COLLAPSIBLE / TERSEMBUNYI) =================
window.toggleSectionPerangkat = function() {
    const content = document.getElementById('section-perangkat-content');
    const icon = document.getElementById('icon-chevron-perangkat');
    const btn = document.getElementById('btn-toggle-perangkat-section');

    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-perangkat"></i> Tutup';

        if (!isPerangkatLoaded) {
            window.loadCardsPerangkatAjar();
            isPerangkatLoaded = true;
        }
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-perangkat"></i> Buka Perangkat';
    }
};

window.toggleFormPerangkatAjar = function() {
    const wrap = document.getElementById('form-wrap-perangkat');
    wrap.style.display = (wrap.style.display === 'none') ? 'block' : 'none';
};

window.simpanPerangkatAjar = async function(event) {
    event.preventDefault();
    let jenis = document.getElementById('per-jenis').value;
    if (jenis === 'Lainnya') {
        jenis = document.getElementById('per-jenis-kustom').value.trim();
    }

    const semester = document.getElementById('per-semester').value;
    const deskripsi = document.getElementById('per-deskripsi').value.trim();
    const tahun = document.getElementById('per-tahun').value.trim();
    const isPinned = document.getElementById('per-pin').checked;
    const link = document.getElementById('per-link').value.trim();

    if (!jenis) {
        alert("Jenis perangkat ajar wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-simpan-perangkat');
    const txtAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        if (isPinned) {
            const { count, error: errCount } = await supabase
                .from('perangkatajar')
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) {
                alert("Batas maksimal 25 Pin tercapai!");
                return;
            }
        }

        const { error } = await supabase.from('perangkatajar').insert([{
            jenis_perangkat: jenis,
            deskripsi_perangkat: deskripsi || null,
            tahun_ajaran: tahun,
            semester: semester,
            is_pinned: isPinned,
            link_perangkat: link
        }]);

        if (error) throw error;

        alert("Perangkat ajar berhasil disimpan!");
        event.target.reset();
        document.getElementById('per-jenis-kustom').style.display = 'none';
        window.setTahunAjaranOtomatis();
        document.getElementById('form-wrap-perangkat').style.display = 'none';
        window.loadCardsPerangkatAjar();

    } catch (e) {
        alert("Gagal menyimpan perangkat: " + e.message);
    } finally {
        btn.innerHTML = txtAsli;
        btn.disabled = false;
    }
};

window.loadCardsPerangkatAjar = async function() {
    const container = document.getElementById('list-cards-perangkat');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('perangkatajar')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        cachePerangkatAjar = data || [];
        renderPerangkatAjarUI();

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal memuat perangkat: ${e.message}</div>`;
    }
};

function renderPerangkatAjarUI() {
    const container = document.getElementById('list-cards-perangkat');
    const btnExpand = document.getElementById('btn-expand-perangkat');
    if (!container) return;

    if (cachePerangkatAjar.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada perangkat ajar yang diunggah.</div>';
        if (btnExpand) btnExpand.style.display = 'none';
        return;
    }

    const dataTampil = isExpandedPerangkat ? cachePerangkatAjar : cachePerangkatAjar.slice(0, 9);

    let html = '';
    dataTampil.forEach(item => {
        const pinClass = item.is_pinned ? 'pinned' : '';
        const iconPinBtn = item.is_pinned 
            ? '<i class="fa-solid fa-thumbtack" style="color:var(--neon-yellow);"></i>' 
            : '<i class="fa-regular fa-thumbtack" style="color:var(--text-abu);"></i>';

        html += `
            <div class="item-doc-row ${pinClass}">
                <div class="doc-left-area">
                    <button onclick="togglePinDoc('perangkatajar', '${item.id}', ${item.is_pinned})" class="btn-icon-doc" title="Pin ke atas">${iconPinBtn}</button>
                    <div class="doc-text-wrap">
                        <span class="badge-doc-tag" style="color:var(--neon-purple); background:rgba(139,92,246,0.15); border-color:rgba(139,92,246,0.3);">${item.jenis_perangkat}</span>
                        <span style="font-size:11px; color:var(--text-abu); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.deskripsi_perangkat || ''}">
                            ${item.deskripsi_perangkat || '-'}
                        </span>
                    </div>
                </div>
                <div class="doc-actions-wrap">
                    <button onclick="window.open('${item.link_perangkat}', '_blank')" class="btn-icon-doc" style="color:var(--neon-green); border-color:rgba(5,213,138,0.3);" title="Buka Link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button onclick="copyLinkDoc('${item.link_perangkat}')" class="btn-icon-doc" style="color:var(--neon-blue); border-color:rgba(59,130,246,0.3);" title="Salin Link">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="hapusDocItem('perangkatajar', '${item.id}', '${item.jenis_perangkat}')" class="btn-icon-doc" style="color:var(--neon-red); border-color:rgba(239,68,68,0.3);" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (btnExpand) {
        if (cachePerangkatAjar.length > 9) {
            btnExpand.style.display = 'flex';
            btnExpand.innerHTML = isExpandedPerangkat 
                ? '<i class="fa-solid fa-chevron-up"></i> Tampilkan Lebih Sedikit' 
                : `<i class="fa-solid fa-chevron-down"></i> Tampilkan Semua (${cachePerangkatAjar.length})`;
        } else {
            btnExpand.style.display = 'none';
        }
    }
}

window.toggleExpandPerangkat = function() {
    isExpandedPerangkat = !isExpandedPerangkat;
    renderPerangkatAjarUI();
};


// ================= 7. FITUR WHATSAPP GROUP (TERSEMBUNYI DEFAULT) =================
window.toggleSectionWaGroup = function() {
    const content = document.getElementById('section-wa-content');
    const icon = document.getElementById('icon-chevron-wa');
    const btn = document.getElementById('btn-toggle-wa-section');

    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-wa"></i> Tutup';

        if (!isWaLoaded) {
            window.loadWhatsAppGroupKelas();
            isWaLoaded = true;
        }
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-wa"></i> Buka Grup';
    }
};

function formatNomorWaInternasional(no) {
    if (!no) return '';
    let clean = no.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    return clean;
}

window.loadWhatsAppGroupKelas = async function() {
    const container = document.getElementById('container-wa-kelas');
    if (!container) return;

    try {
        const [resKelas, resAnggota] = await Promise.all([
            supabase.from('kelas')
                .select(`
                    id, nama_kelas, tingkat, link_wa_group,
                    nama_walikelas, wa_walikelass,
                    ketua:id_ketua(id, nama_siswa, nomor_wa),
                    sekretaris:id_sekretaris(id, nama_siswa, nomor_wa),
                    bendahara:id_bendahara(id, nama_siswa, nomor_wa)
                `)
                .eq('status_kelas', true)
                .order('tingkat')
                .order('nama_kelas'),
            supabase.from('anggota_kelas').select('id_kelas, id_siswa, siswa(id, nama_siswa, nomor_wa)')
        ]);

        if (resKelas.error) throw resKelas.error;

        const listKelas = resKelas.data || [];
        const allAnggota = resAnggota.data || [];

        cacheSiswaPerKelasMap.clear();
        listKelas.forEach(kls => {
            const siswaKls = allAnggota
                .filter(a => a.id_kelas === kls.id && a.siswa)
                .map(a => a.siswa);
            siswaKls.sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
            cacheSiswaPerKelasMap.set(kls.id, { klsInfo: kls, siswa: siswaKls });
        });

        if (listKelas.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada kelas aktif.</div>';
            return;
        }

        let html = '';
        listKelas.forEach(item => {
            const linkGrup = item.link_wa_group || '';
            const btnGroupAttr = linkGrup 
                ? `onclick="window.open('${linkGrup}', '_blank')"` 
                : `onclick="bukaModalEditWaKelas('${item.id}')" title="Klik untuk menambahkan link grup"`;
            const btnGroupClass = linkGrup ? '' : 'disabled';
            const btnGroupText = linkGrup ? '<i class="fa-solid fa-users"></i> Buka Grup WA' : '<i class="fa-solid fa-link-slash"></i> Belum Ada Link Grup (Atur)';

            // Render khusus Wali Kelas
            const renderWaliKelas = () => {
                if (!item.nama_walikelas) {
                    return `
                        <div class="pengurus-item" style="border-left: 2px solid var(--neon-green);">
                            <span style="color:var(--text-abu);">🌿 <b>Wali Kelas:</b> -</span>
                            <span style="font-size:9px; color:var(--text-abu);">-</span>
                        </div>
                    `;
                }

                const noWaFormatted = formatNomorWaInternasional(item.wa_walikelass);
                const pesan = encodeURIComponent(`Assalamu'alaikum Bapak/Ibu ${item.nama_walikelas} (Wali Kelas ${item.nama_kelas}), mohon informasi terkait pembelajaran PAI.`);
                const linkWaPersonal = noWaFormatted ? `https://wa.me/${noWaFormatted}?text=${pesan}` : '';

                const btnWa = linkWaPersonal 
                    ? `<a href="${linkWaPersonal}" target="_blank" class="btn-wa-personal"><i class="fa-brands fa-whatsapp"></i> WA</a>` 
                    : `<span style="font-size:8.5px; color:var(--text-abu);">No WA (-)</span>`;

                return `
                    <div class="pengurus-item" style="border-left: 2px solid var(--neon-green);">
                        <span style="color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px;" title="${item.nama_walikelas}">
                            🌿 <b style="color:var(--neon-green);">Wali Kelas:</b> ${item.nama_walikelas}
                        </span>
                        ${btnWa}
                    </div>
                `;
            };

            const renderPengurus = (label, icon, color, objSiswa) => {
                if (!objSiswa) {
                    return `
                        <div class="pengurus-item">
                            <span style="color:var(--text-abu);">${icon} <b>${label}:</b> -</span>
                            <span style="font-size:9px; color:var(--text-abu);">-</span>
                        </div>
                    `;
                }

                const noWaFormatted = formatNomorWaInternasional(objSiswa.nomor_wa);
                const pesan = encodeURIComponent(`Assalamu'alaikum ${objSiswa.nama_siswa} (${label} Kelas ${item.nama_kelas}), mohon informasi terkait pembelajaran PAI.`);
                const linkWaPersonal = noWaFormatted ? `https://wa.me/${noWaFormatted}?text=${pesan}` : '';

                const btnWa = linkWaPersonal 
                    ? `<a href="${linkWaPersonal}" target="_blank" class="btn-wa-personal"><i class="fa-brands fa-whatsapp"></i> WA</a>` 
                    : `<span style="font-size:8.5px; color:var(--text-abu);">No WA (-)</span>`;

                return `
                    <div class="pengurus-item">
                        <span style="color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px;" title="${objSiswa.nama_siswa}">
                            ${icon} <b style="color:${color};">${label}:</b> ${objSiswa.nama_siswa}
                        </span>
                        ${btnWa}
                    </div>
                `;
            };

            html += `
                <div class="card-wa-kelas">
                    <div class="header-wa-kelas">
                        <b><i class="fa-solid fa-chalkboard" style="color:var(--neon-green);"></i> Kelas ${item.nama_kelas}</b>
                        <button onclick="bukaModalEditWaKelas('${item.id}')" class="btn-compact" style="background:transparent; border:1px solid rgba(5,213,138,0.3); color:var(--neon-green); padding:3px 8px !important;">
                            <i class="fa-solid fa-pen-to-square"></i> Edit Link
                        </button>
                    </div>
                    
                    <button ${btnGroupAttr} class="btn-open-group ${btnGroupClass}">
                        ${btnGroupText}
                    </button>
                    
                    <div class="pengurus-list">
                        <span style="font-size:9px; font-weight:700; color:var(--text-abu); text-transform:uppercase; letter-spacing:0.5px;">Wali & Pengurus Kelas:</span>
                        ${renderWaliKelas()}
                        ${renderPengurus('Ketua', '☀️', 'var(--neon-yellow)', item.ketua)}
                        ${renderPengurus('Sekretaris', '🌙', 'var(--neon-blue)', item.sekretaris)}
                        ${renderPengurus('Bendahara', '⭕', 'var(--neon-red)', item.bendahara)}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal memuat WhatsApp Kelas: ${e.message}</div>`;
    }
};

window.bukaModalEditWaKelas = function(idKelas) {
    const dataKls = cacheSiswaPerKelasMap.get(idKelas);
    if (!dataKls) return;

    const modal = document.getElementById('modal-edit-wa-kelas');
    const title = document.getElementById('modal-wa-title-kelas');
    const inpId = document.getElementById('modal-wa-id-kelas');
    const inpLink = document.getElementById('modal-wa-link-grup');

    const inpNamaWali = document.getElementById('modal-wa-nama-walikelas');
    const inpNoWali = document.getElementById('modal-wa-no-walikelas');

    const selKetua = document.getElementById('modal-wa-id-ketua');
    const selSekre = document.getElementById('modal-wa-id-sekretaris');
    const selBenda = document.getElementById('modal-wa-id-bendahara');

    const inpNoKetua = document.getElementById('modal-wa-no-ketua');
    const inpNoSekre = document.getElementById('modal-wa-no-sekretaris');
    const inpNoBenda = document.getElementById('modal-wa-no-bendahara');

    title.innerText = `Kelas ${dataKls.klsInfo.nama_kelas}`;
    inpId.value = idKelas;
    inpLink.value = dataKls.klsInfo.link_wa_group || '';

    // Isi data Wali Kelas
    if (inpNamaWali) inpNamaWali.value = dataKls.klsInfo.nama_walikelas || '';
    if (inpNoWali) inpNoWali.value = dataKls.klsInfo.wa_walikelass || '';

    let optSiswa = '<option value="">-- Pilih Siswa --</option>';
    dataKls.siswa.forEach(s => {
        optSiswa += `<option value="${s.id}" data-wa="${s.nomor_wa || ''}">${s.nama_siswa}</option>`;
    });

    selKetua.innerHTML = optSiswa;
    selSekre.innerHTML = optSiswa;
    selBenda.innerHTML = optSiswa;

    const k = dataKls.klsInfo.ketua;
    const s = dataKls.klsInfo.sekretaris;
    const b = dataKls.klsInfo.bendahara;

    selKetua.value = k ? k.id : '';
    inpNoKetua.value = k ? (k.nomor_wa || '') : '';

    selSekre.value = s ? s.id : '';
    inpNoSekre.value = s ? (s.nomor_wa || '') : '';

    selBenda.value = b ? b.id : '';
    inpNoBenda.value = b ? (b.nomor_wa || '') : '';

    modal.style.display = 'flex';
};

window.sinkronNomorPengurus = function(role) {
    const sel = document.getElementById(`modal-wa-id-${role}`);
    const inpNo = document.getElementById(`modal-wa-no-${role}`);
    const selectedOpt = sel.options[sel.selectedIndex];

    if (selectedOpt && selectedOpt.value) {
        const wa = selectedOpt.getAttribute('data-wa');
        inpNo.value = wa || '';
    } else {
        inpNo.value = '';
    }
};

window.simpanKonfigurasiWaKelas = async function(event) {
    event.preventDefault();
    const idKelas = document.getElementById('modal-wa-id-kelas').value;
    const linkGrup = document.getElementById('modal-wa-link-grup').value.trim();

    const namaWali = document.getElementById('modal-wa-nama-walikelas').value.trim() || null;
    const noWali = document.getElementById('modal-wa-no-walikelas').value.trim() || null;

    const idKetua = document.getElementById('modal-wa-id-ketua').value || null;
    const noKetua = document.getElementById('modal-wa-no-ketua').value.trim() || null;

    const idSekre = document.getElementById('modal-wa-id-sekretaris').value || null;
    const noSekre = document.getElementById('modal-wa-no-sekretaris').value.trim() || null;

    const idBenda = document.getElementById('modal-wa-id-bendahara').value || null;
    const noBenda = document.getElementById('modal-wa-no-bendahara').value.trim() || null;

    const btn = document.getElementById('btn-simpan-wa-modal');
    const txtAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        const { error: errKelas } = await supabase
            .from('kelas')
            .update({
                link_wa_group: linkGrup || null,
                nama_walikelas: namaWali,
                wa_walikelass: noWali,
                id_ketua: idKetua,
                id_sekretaris: idSekre,
                id_bendahara: idBenda
            })
            .eq('id', idKelas);

        if (errKelas) throw errKelas;

        const updatePromises = [];
        if (idKetua) updatePromises.push(supabase.from('siswa').update({ nomor_wa: noKetua }).eq('id', idKetua));
        if (idSekre) updatePromises.push(supabase.from('siswa').update({ nomor_wa: noSekre }).eq('id', idSekre));
        if (idBenda) updatePromises.push(supabase.from('siswa').update({ nomor_wa: noBenda }).eq('id', idBenda));

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }

        alert("Pengaturan WhatsApp dan Pengurus Kelas berhasil disimpan!");
        document.getElementById('modal-edit-wa-kelas').style.display = 'none';
        window.loadWhatsAppGroupKelas();

    } catch (e) {
        alert("Gagal menyimpan konfigurasi: " + e.message);
    } finally {
        btn.innerHTML = txtAsli;
        btn.disabled = false;
    }
};

// ================= AKSI GLOBAL: TOGGLE PIN, COPY LINK, HAPUS =================
window.togglePinDoc = async function(tabel, id, statusSekarang) {
    const statusBaru = !statusSekarang;

    try {
        if (statusBaru) {
            const { count, error: errCount } = await supabase
                .from(tabel)
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) {
                alert("Batas maksimal 25 Pin telah tercapai!");
                return;
            }
        }

        const { error } = await supabase.from(tabel).update({ is_pinned: statusBaru }).eq('id', id);
        if (error) throw error;

        if (tabel === 'materiajar') window.loadCardsMateriAjar();
        else if (tabel === 'konsepceramah') window.loadCardsKonsepCeramah();
        else window.loadCardsPerangkatAjar();

    } catch (e) {
        alert("Gagal mengubah status pin: " + e.message);
    }
};

window.copyLinkDoc = async function(link) {
    if (!link) {
        alert("Link tidak valid!");
        return;
    }
    try {
        await navigator.clipboard.writeText(link);
        alert("Tautan berhasil disalin ke clipboard!");
    } catch (err) {
        const tempInput = document.createElement("input");
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert("Tautan berhasil disalin!");
    }
};

window.hapusDocItem = async function(tabel, id, namaItem) {
    if (!confirm(`Yakin ingin MENGHAPUS "${namaItem}"?`)) return;

    try {
        const { error } = await supabase.from(tabel).delete().eq('id', id);
        if (error) throw error;
        alert("Item berhasil dihapus!");

        if (tabel === 'materiajar') window.loadCardsMateriAjar();
        else if (tabel === 'konsepceramah') window.loadCardsKonsepCeramah();
        else window.loadCardsPerangkatAjar();

    } catch (e) {
        alert("Gagal menghapus: " + e.message);
    }
};

window.setTahunAjaranOtomatis = async function() {
    const elTahunMat = document.getElementById('mat-tahun');
    const elTahunPer = document.getElementById('per-tahun');

    try {
        const { data } = await supabase.from('profilaplikasi').select('tahun_ajaran_aktif').limit(1).maybeSingle();
        const thn = data && data.tahun_ajaran_aktif ? data.tahun_ajaran_aktif : '2025/2026';
        if (elTahunMat) elTahunMat.value = thn;
        if (elTahunPer) elTahunPer.value = thn;
    } catch (e) {
        if (elTahunMat) elTahunMat.value = '2025/2026';
        if (elTahunPer) elTahunPer.value = '2025/2026';
    }
};

// ================= FITUR MESIN PENCARI QURAN & HADITS (COLLAPSIBLE) =================
let kategoriDalilAktif = 'quran'; // 'quran' atau 'hadis'

window.toggleSectionDalil = function() {
    const content = document.getElementById('section-dalil-content');
    const icon = document.getElementById('icon-chevron-dalil');
    const btn = document.getElementById('btn-toggle-dalil-section');

    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-dalil"></i> Tutup';
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-dalil"></i> Buka Pencarian';
    }
};

window.gantiKategoriDalil = function(kategori) {
    kategoriDalilAktif = kategori;
    const tabQ = document.getElementById('tab-cari-quran');
    const tabH = document.getElementById('tab-cari-hadis');
    const input = document.getElementById('input-keyword-dalil');

    if (kategori === 'quran') {
        if (tabQ) tabQ.classList.add('active');
        if (tabH) tabH.classList.remove('active');
        if (input) input.placeholder = "Cari terjemahan Al-Qur'an (1-5 kata)...";
    } else {
        if (tabH) tabH.classList.add('active');
        if (tabQ) tabQ.classList.remove('active');
        if (input) input.placeholder = "Cari hadits shahih (1-5 kata)...";
    }

    if (input && input.value.trim()) {
        window.eksekusiCariDalil();
    }
};

window.eksekusiCariDalil = async function() {
    const input = document.getElementById('input-keyword-dalil');
    const container = document.getElementById('hasil-pencarian-dalil');
    if (!input || !container) return;

    const raw = input.value.trim();
    if (!raw) {
        alert("Masukkan minimal 1 kata kunci!");
        return;
    }

    // Batasi 1 sampai 5 kata
    const kataKunci = raw.split(/\s+/).slice(0, 5).join(' ');

    container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--neon-green); font-size:11px;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari dalil...</div>';

    try {
        if (kategoriDalilAktif === 'quran') {
            const { data, error } = await supabase.rpc('cari_quran_multikata', {
                kata_kunci: kataKunci,
                limit_hasil: 25
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Tidak ditemukan ayat dengan kata kunci <b>"${kataKunci}"</b>.</div>`;
                return;
            }

            let html = '';
            data.forEach(item => {
                html += `
                    <div class="quran-hadis-item-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="badge-info-dalil"><i class="fa-solid fa-book-quran"></i> QS. ${item.nama_surah} [${item.surah_no}:${item.ayat_no}]</span>
                            <button onclick="copyLinkDoc('${item.teks_arab} - QS ${item.nama_surah}:${item.ayat_no}')" class="btn-icon-doc" title="Salin Ayat"><i class="fa-solid fa-copy"></i></button>
                        </div>
                        <div class="text-arab-box">${item.teks_arab}</div>
                        <div class="text-terjemahan-box">
                            <b>Artinya:</b> "${item.terjemahan_id}"
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;

        } else {
            const { data, error } = await supabase.rpc('cari_hadis_multikata', {
                kata_kunci: kataKunci,
                limit_hasil: 25
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Tidak ditemukan hadits dengan kata kunci <b>"${kataKunci}"</b>.</div>`;
                return;
            }

            let html = '';
            data.forEach(item => {
                // Memisahkan sanad dan matan untuk pewarnaan
                const { arabHtml, indoHtml } = pisahkanSanadDanMatan(item.teks_arab, item.terjemahan_id);
                const blockArab = item.teks_arab ? `<div class="text-arab-box">${arabHtml}</div>` : '';

                html += `
                    <div class="quran-hadis-item-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="badge-info-dalil" style="color:var(--neon-yellow); border-color:rgba(245,158,11,0.3); background:rgba(245,158,11,0.15);">
                                <i class="fa-solid fa-scroll"></i> ${item.kitab} No. ${item.nomor_hadis} (${item.derajat_hadis || 'Shahih'})
                            </span>
                            <button onclick="copyLinkDoc('${(item.teks_arab || item.terjemahan_id).replace(/'/g, "\\'")} - ${item.kitab} No. ${item.nomor_hadis}')" class="btn-icon-doc" title="Salin Hadits">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                        ${blockArab}
                        <div class="text-terjemahan-box">
                            <b style="color:var(--text-abu);">Artinya:</b> ${indoHtml}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

    } catch (e) {
        console.error("Gagal pencarian dalil:", e);
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--neon-red); font-size:11px;">Gagal memuat pencarian: ${e.message}</div>`;
    }
};

// ================= HELPER: PEWARNAAN SANAD (KUNING) & MATAN (PUTIH) =================
function pisahkanSanadDanMatan(teksArab, teksIndo) {
    let arabHtml = teksArab || '';
    let indoHtml = teksIndo || '';

    // 1. Pemisahan Teks Terjemahan Indonesia
    // Mencari kata kunci transisi sanad: "bersabda:", "berkata:", atau "katanya:"
    const regexIndo = /^(.*?(?:bersabda|berkata|katanya)\s*:\s*)(.*)$/is;
    const matchIndo = indoHtml.match(regexIndo);

    if (matchIndo && matchIndo[1] && matchIndo[2]) {
        indoHtml = `<span class="sanad-text">${matchIndo[1]}</span><span class="matan-text">"${matchIndo[2].replace(/^["“]|["”]$/g, '').trim()}"</span>`;
    } else {
        indoHtml = `<span class="matan-text">"${indoHtml}"</span>`;
    }

    // 2. Pemisahan Teks Arab
    // Mencari kata kunci transisi sanad: "قَالَ رَسُولُ اللَّهِ", "قَالَ النَّبِيُّ", "عَنِ ... قَالَ", atau "قَالَ:"
    const regexArab = /^(.*?(?:قَالَ رَسُولُ اللَّهِ|قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ|عَنْ.*?قَالَ|قَالَ)\s*:\s*)(.*)$/is;
    const matchArab = arabHtml.match(regexArab);

    if (matchArab && matchArab[1] && matchArab[2]) {
        arabHtml = `<span class="sanad-text">${matchArab[1]}</span><span class="matan-text">${matchArab[2].trim()}</span>`;
    } else {
        arabHtml = `<span class="matan-text">${arabHtml}</span>`;
    }

    return { arabHtml, indoHtml };
}