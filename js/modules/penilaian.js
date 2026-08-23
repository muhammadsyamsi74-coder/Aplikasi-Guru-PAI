// js/modules/penilaian.js
import supabase from '../supabase.js';

let dataSiswaPenilaian = [];

// Pemetaan Nama Kolom Database Horizontal 
const mapSholat = [
    { label: 'Doa Iftitah', col: 'iftitah' },
    { label: 'Al-Fatihah', col: 'alfatihah' },
    { label: 'Rukuk', col: 'rukuk' },
    { label: 'I\'tidal', col: 'itidal' },
    { label: 'Sujud', col: 'sujud' },
    { label: 'Duduk Diantara Sujud', col: 'duduk' },
    { label: 'Tahyat Awal', col: 'tahyat_awal' },
    { label: 'Tahyat Akhir', col: 'tahyat_akhir' }
];

const mapSurah = [
    { label: 'An-Nas', col: 'annas' },
    { label: 'Al-Falaq', col: 'alfalaq' },
    { label: 'Al-Ikhlas', col: 'alikhlas' },
    { label: 'Al-Lahab', col: 'allahab' },
    { label: 'An-Nasr', col: 'annasr' },
    { label: 'Al-Kafirun', col: 'alkafirun' },
    { label: 'Al-Kautsar', col: 'alkautsar' },
    { label: 'Al-Ma\'un', col: 'almaun' },
    { label: 'Quraisy', col: 'quraisy' },
    { label: 'Al-Fil', col: 'alfil' },
    { label: 'Al-Humazah', col: 'alhumazah' },
    { label: 'Al-\'Asr', col: 'alasr' },
    { label: 'At-Takatsur', col: 'attakatsur' },
    { label: 'Al-Qari\'ah', col: 'alqoriah' },
    { label: 'Al-\'Adiyat', col: 'aladiyat' }
];

// ================= FUNGSI SORTING STANDAR (ABSEN LALU NAMA) =================
function sortSiswaPenilaian(listData) {
    return listData.sort((a, b) => {
        const noA = (a.nomor_absen !== null && a.nomor_absen !== undefined && a.nomor_absen !== '') ? parseInt(a.nomor_absen) : 99999;
        const noB = (b.nomor_absen !== null && b.nomor_absen !== undefined && b.nomor_absen !== '') ? parseInt(b.nomor_absen) : 99999;

        if (noA !== noB) {
            return noA - noB;
        }

        const namaA = (a.siswa && a.siswa.nama_siswa) ? a.siswa.nama_siswa : '';
        const namaB = (b.siswa && b.siswa.nama_siswa) ? b.siswa.nama_siswa : '';
        return namaA.localeCompare(namaB);
    });
}

// ================= PEWARNAAN DROPDOWN DINAMIS =================
window.updateSelectColor = function(el) {
    const val = el.value;
    const reds = ['Tidak bisa baca', 'Tanpa tajwid', 'Tidak mengenal huruf', 'Banyak salah', 'Tanpa lagu', 'Tidak rapi', 'Belum hafal'];
    const yellows = ['Terbata-bata ada salah', 'Terbata-bata bacaan benar', 'Cepat namun banyak salah', 'Panjang-pendek', 'Tajwid dasar', 'Salah sedikit', 'Kurang jelas', 'Kurang rapi', 'Cukup', 'Nada stabil', 'Tidak lancar'];
    const lightGreens = ['Cepat dengan sedikit salah'];
    const darkGreens = ['Lancar', 'Mahir tanpa kesalahan', 'Tajwid lanjutan', 'Mahir', 'Jelas', 'Sangat jelas', 'Sudah tepat', 'Rapi', 'Lagu tilawah', 'Hafal'];

    if (darkGreens.includes(val)) {
        el.style.color = '#059669';
        el.style.backgroundColor = 'rgba(5, 150, 105, 0.15)';
        el.style.borderColor = 'rgba(5, 150, 105, 0.4)';
    } else if (lightGreens.includes(val)) {
        el.style.color = 'var(--neon-green)';
        el.style.backgroundColor = 'rgba(5, 213, 138, 0.15)';
        el.style.borderColor = 'rgba(5, 213, 138, 0.4)';
    } else if (yellows.includes(val)) {
        el.style.color = 'var(--neon-yellow)';
        el.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
        el.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    } else if (reds.includes(val)) {
        el.style.color = '#f472b6'; 
        el.style.backgroundColor = 'rgba(244, 114, 182, 0.15)';
        el.style.borderColor = 'rgba(244, 114, 182, 0.4)';
    } else {
        el.style.color = 'var(--text-putih)';
        el.style.backgroundColor = 'var(--bg-card)';
        el.style.borderColor = 'var(--border-color)';
    }
};

// ================= FUNGSI TAB & TOGGLE =================
window.gantiTabPenilaian = function(tabName) {
    const tabs = ['tugas', 'baca', 'tulis', 'sholat', 'surah'];
    tabs.forEach(t => {
        document.getElementById(`btn-tab-${t}`).classList.remove('active');
        document.getElementById(`tab-penilaian-${t}`).style.display = 'none';
    });
    document.getElementById(`btn-tab-${tabName}`).classList.add('active');
    document.getElementById(`tab-penilaian-${tabName}`).style.display = 'block';
};

window.toggleInputPenilaian = function(tipe, idSiswa) {
    const area = document.getElementById(`area-input-${tipe}-${idSiswa}`);
    if(area.style.display === 'none') {
        area.style.display = 'block';
    } else {
        area.style.display = 'none';
    }
};

window.toggleTugasBaru = function() {
    const inputBaru = document.getElementById('input-nama-tugas-baru');
    const dropdown = document.getElementById('input-nama-tugas-dropdown');
    if(inputBaru.style.display === 'none') {
        inputBaru.style.display = 'block';
        dropdown.value = ''; 
        loadNilaiTugas(); 
    } else {
        inputBaru.style.display = 'none';
        inputBaru.value = '';
    }
};

window.setKetuntasan = function(idSiswa, status) {
    const parent = document.getElementById(`grp-tuntas-${idSiswa}`);
    const btns = parent.getElementsByTagName('button');
    for(let b of btns) b.classList.remove('active', 't', 'ts');
    
    const targetBtn = document.querySelector(`.btn-tuntas[data-idsiswa="${idSiswa}"][data-val="${status}"]`);
    if(targetBtn) targetBtn.classList.add('active', status.toLowerCase());
    
    document.getElementById(`val-tuntas-${idSiswa}`).value = status;
};

// FITUR: Auto Ketuntasan (>= 70 = T, < 70 atau kosong = TS)
window.autoKetuntasan = function(idSiswa, nilai) {
    if (nilai === "" || nilai === null || nilai === undefined) {
        window.setKetuntasan(idSiswa, 'TS');
    } else {
        const num = parseFloat(nilai);
        if (num >= 70) {
            window.setKetuntasan(idSiswa, 'T');
        } else {
            window.setKetuntasan(idSiswa, 'TS');
        }
    }
};

// ================= INISIALISASI DATA AWAL =================
window.loadKelasUntukPenilaian = async function() {
    const selIds = ['pilih-kelas-tugas', 'pilih-kelas-baca', 'pilih-kelas-tulis', 'pilih-kelas-sholat', 'pilih-kelas-surah'];
    const loadingText = '<option value="">Memuat kelas...</option>';
    selIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = loadingText; });

    try {
        const { data, error } = await supabase
            .from('kelas')
            .select('id, tingkat, nama_kelas')
            .eq('status_kelas', true)
            .order('tingkat', { ascending: true })
            .order('nama_kelas', { ascending: true });

        if (error) throw error;

        let options = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(item => { options += `<option value="${item.id}">${item.nama_kelas} (Kelas ${item.tingkat})</option>`; });
        selIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = options; });

    } catch (error) {
        selIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = '<option value="">Gagal</option>'; });
    }
};

window.loadDaftarTugas = async function(idKelas) {
    const dd = document.getElementById('input-nama-tugas-dropdown');
    if (!dd) return;

    if (!idKelas) {
        dd.innerHTML = '<option value="">-- Pilih Tugas --</option>';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('namatugas')
            .select('id, nama_tugas')
            .eq('id_kelas', idKelas)
            .order('created_at', { ascending: true });

        if (error) throw error;

        let html = '<option value="">-- Pilih Tugas --</option>';
        if (data && data.length > 0) {
            data.forEach(t => { 
                html += `<option value="${t.id}">${t.nama_tugas}</option>`; 
            });
        }
        dd.innerHTML = html;
    } catch (e) { 
        console.error("Gagal load tugas per kelas", e); 
    }
};

window.loadNilaiTugas = async function() {
    const idTugas = document.getElementById('input-nama-tugas-dropdown').value;
    
    document.querySelectorAll('.input-nilai-tugas').forEach(el => { el.value = ''; el.removeAttribute('data-recordid'); });
    
    document.querySelectorAll('.val-ketuntasan').forEach(el => el.value = 'TS');
    document.querySelectorAll('.btn-tuntas').forEach(el => el.classList.remove('active', 't', 'ts'));
    document.querySelectorAll('.btn-tuntas[data-val="TS"]').forEach(el => el.classList.add('active', 'ts'));
    
    document.querySelectorAll('.input-refleksi').forEach(el => el.value = '');

    if(!idTugas) return;

    try {
        const { data } = await supabase.from('penilaiantugas').select('id, id_siswa, nilai_tugas, ketuntasan, refleksi').eq('id_tugas', idTugas);
        if(data) {
            data.forEach(d => {
                const inpNilai = document.querySelector(`.input-nilai-tugas[data-idsiswa="${d.id_siswa}"]`);
                const inpTuntas = document.getElementById(`val-tuntas-${d.id_siswa}`);
                const inpRef = document.querySelector(`.input-refleksi[data-idsiswa="${d.id_siswa}"]`);

                if(inpNilai) {
                    inpNilai.value = d.nilai_tugas !== null ? d.nilai_tugas : '';
                    inpNilai.setAttribute('data-recordid', d.id); 
                }
                if(inpRef) inpRef.value = d.refleksi || '';
                if(inpTuntas && d.ketuntasan) setKetuntasan(d.id_siswa, d.ketuntasan);
            });
        }
    } catch(e) { console.error("Gagal load nilai tugas", e); }
};

window.hapusTugasAktif = async function() {
    const dd = document.getElementById('input-nama-tugas-dropdown');
    const idTugas = dd.value;
    const namaTugas = dd.options[dd.selectedIndex] ? dd.options[dd.selectedIndex].text : '';
    const idKelas = document.getElementById('pilih-kelas-tugas').value;

    if (!idTugas) {
        alert("Pilih tugas yang ingin dihapus terlebih dahulu!");
        return;
    }

    if (!confirm(`PERINGATAN!\n\nApakah Anda yakin ingin MENGHAPUS tugas "${namaTugas}"?\nSemua nilai siswa yang terkait dengan tugas ini akan ikut terhapus permanen.`)) {
        return;
    }

    try {
        const { error: errNilai } = await supabase
            .from('penilaiantugas')
            .delete()
            .eq('id_tugas', idTugas);
        if (errNilai) throw errNilai;

        const { error: errTugas } = await supabase
            .from('namatugas')
            .delete()
            .eq('id', idTugas);
        if (errTugas) throw errTugas;

        alert(`Tugas "${namaTugas}" beserta semua nilainya berhasil dihapus!`);

        await window.loadDaftarTugas(idKelas);
        window.loadNilaiTugas();

    } catch (e) {
        alert("Gagal menghapus tugas: " + e.message);
    }
};

// ================= RENDER FORM DINAMIS =================
const mkSel = (val, target) => (val === target ? 'selected' : '');

window.bukaFormPenilaian = async function(tipe) {
    const idKelas = document.getElementById(`pilih-kelas-${tipe}`).value;
    if (!idKelas) {
        document.getElementById(`area-${tipe}`).style.display = 'none';
        return;
    }

    document.getElementById(`area-${tipe}`).style.display = 'block';
    const elRekap = document.getElementById(`area-rekap-${tipe}`);
    if(elRekap) elRekap.style.display = 'block';
    
    const container = document.getElementById(`tempat-list-${tipe}`);
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--neon-green);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat siswa...</div>';

    try {
        const { data: dataSiswa, error: errSiswa } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas);
        if (errSiswa) throw errSiswa;
        if (dataSiswa.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-abu);">Belum ada siswa di kelas ini.</div>';
            return;
        }

        sortSiswaPenilaian(dataSiswa);
        dataSiswaPenilaian = dataSiswa;

        let exBaca = [], exTulis = [], exSholat = [], exSurah = [];
        if (tipe === 'baca') {
            const {data} = await supabase.from('penilaianmembaca').select('*').eq('id_kelas', idKelas);
            exBaca = data || [];
        } else if (tipe === 'tulis') {
            const {data} = await supabase.from('penilaianmenulis').select('*').eq('id_kelas', idKelas);
            exTulis = data || [];
        } else if (tipe === 'sholat') {
            const {data} = await supabase.from('penilaianhafalansholat').select('*').eq('id_kelas', idKelas);
            exSholat = data || [];
        } else if (tipe === 'surah') {
            const {data} = await supabase.from('hafalansurah').select('*').eq('id_kelas', idKelas);
            exSurah = data || [];
        }

        let htmlContent = '';
        dataSiswa.forEach((item) => {
            const ikonGender = item.siswa.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue); font-size:10px;"></i>' : (item.siswa.jenis_kelamin === 'P' ? '<i class="fa-solid fa-venus" style="color:var(--neon-red); font-size:10px;"></i>' : '');
            let inputUI = '';
            let badgeHTML = '';
            
            // 1. TUGAS (MENDUKUNG KELAS .absen-card-tugas UNTUK 1 BARIS DESKTOP)
            if(tipe === 'tugas') {
                inputUI = `
                <div class="wrap-tugas">
                    <input type="number" class="input-nilai-tugas form-control sel-kecil" data-idsiswa="${item.id_siswa}" placeholder="Nilai" style="width:60px; text-align:center;" oninput="window.autoKetuntasan('${item.id_siswa}', this.value)">
                    <div id="grp-tuntas-${item.id_siswa}" style="display:flex; gap:4px;">
                        <input type="hidden" id="val-tuntas-${item.id_siswa}" class="val-ketuntasan" value="TS">
                        <button type="button" class="btn-tuntas" data-idsiswa="${item.id_siswa}" data-val="T" onclick="setKetuntasan('${item.id_siswa}', 'T')">T</button>
                        <button type="button" class="btn-tuntas active ts" data-idsiswa="${item.id_siswa}" data-val="TS" onclick="setKetuntasan('${item.id_siswa}', 'TS')">TS</button>
                    </div>
                    <input type="text" class="input-refleksi form-control sel-kecil" data-idsiswa="${item.id_siswa}" placeholder="Catatan/Refleksi..." style="flex:1; min-width: 100px;">
                </div>`;
                
                htmlContent += `
                    <div class="absen-card absen-card-tugas">
                        <div class="absen-info-header">
                            <div class="absen-identity">
                                <span class="absen-no">${item.nomor_absen || '-'}</span>
                                <span class="absen-nama">${item.siswa.nama_siswa} ${ikonGender}</span>
                            </div>
                        </div>
                        <div class="wrap-tugas-container" style="width:100%; margin-top:6px;">${inputUI}</div>
                    </div>
                `;
            } 
            else {
                if (tipe === 'baca') {
                    const ex = exBaca.find(x => x.id_siswa === item.id_siswa) || {};
                    let filled = 0;
                    if(ex.kelancaran_membaca) filled++; if(ex.tajwid_bacaan) filled++; if(ex.makraj_huruf) filled++; if(ex.nada_suara) filled++;
                    if(filled === 4) badgeHTML = '<span class="badge-status bg-sudah">Lengkap</span>';
                    else if(filled > 0) badgeHTML = '<span class="badge-status bg-sebagian">Sebagian</span>';
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';

                    inputUI = `
                    <div class="grid-input-nilai">
                        <div class="form-group" style="margin-bottom:0;"><label>Kelancaran</label>
                            <select class="form-control input-kelancaran sel-kecil" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}" onchange="updateSelectColor(this)">
                                <option value="">-Pilih-</option>
                                <option value="Tidak bisa baca" ${mkSel(ex.kelancaran_membaca, 'Tidak bisa baca')}>Tidak bisa baca</option>
                                <option value="Terbata-bata ada salah" ${mkSel(ex.kelancaran_membaca, 'Terbata-bata ada salah')}>Terbata-bata ada salah</option>
                                <option value="Terbata-bata bacaan benar" ${mkSel(ex.kelancaran_membaca, 'Terbata-bata bacaan benar')}>Terbata-bata bacaan benar</option>
                                <option value="Cepat namun banyak salah" ${mkSel(ex.kelancaran_membaca, 'Cepat namun banyak salah')}>Cepat namun banyak salah</option>
                                <option value="Cepat dengan sedikit salah" ${mkSel(ex.kelancaran_membaca, 'Cepat dengan sedikit salah')}>Cepat dengan sedikit salah</option>
                                <option value="Lancar" ${mkSel(ex.kelancaran_membaca, 'Lancar')}>Lancar</option>
                                <option value="Mahir tanpa kesalahan" ${mkSel(ex.kelancaran_membaca, 'Mahir tanpa kesalahan')}>Mahir tanpa kesalahan</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;"><label>Tajwid</label><select class="form-control input-tajwid sel-kecil" data-idsiswa="${item.id_siswa}" onchange="updateSelectColor(this)"><option value="">-Pilih-</option><option value="Tanpa tajwid" ${mkSel(ex.tajwid_bacaan, 'Tanpa tajwid')}>Tanpa tajwid</option><option value="Panjang-pendek" ${mkSel(ex.tajwid_bacaan, 'Panjang-pendek')}>Panjang-pendek</option><option value="Tajwid dasar" ${mkSel(ex.tajwid_bacaan, 'Tajwid dasar')}>Tajwid dasar</option><option value="Tajwid lanjutan" ${mkSel(ex.tajwid_bacaan, 'Tajwid lanjutan')}>Tajwid lanjutan</option><option value="Mahir" ${mkSel(ex.tajwid_bacaan, 'Mahir')}>Mahir</option></select></div>
                        <div class="form-group" style="margin-bottom:0;"><label>Makhraj</label><select class="form-control input-makraj sel-kecil" data-idsiswa="${item.id_siswa}" onchange="updateSelectColor(this)"><option value="">-Pilih-</option><option value="Tidak mengenal huruf" ${mkSel(ex.makraj_huruf, 'Tidak mengenal huruf')}>Tidak mengenal huruf</option><option value="Banyak salah" ${mkSel(ex.makraj_huruf, 'Banyak salah')}>Banyak salah</option><option value="Salah sedikit" ${mkSel(ex.makraj_huruf, 'Salah sedikit')}>Salah sedikit</option><option value="Kurang jelas" ${mkSel(ex.makraj_huruf, 'Kurang jelas')}>Kurang jelas</option><option value="Jelas" ${mkSel(ex.makraj_huruf, 'Jelas')}>Jelas</option><option value="Sangat jelas" ${mkSel(ex.makraj_huruf, 'Sangat jelas')}>Sangat jelas</option></select></div>
                        <div class="form-group" style="margin-bottom:0;"><label>Nada/Suara</label><select class="form-control input-nada sel-kecil" data-idsiswa="${item.id_siswa}" onchange="updateSelectColor(this)"><option value="">-Pilih-</option><option value="Tanpa lagu" ${mkSel(ex.nada_suara, 'Tanpa lagu')}>Tanpa lagu</option><option value="Nada stabil" ${mkSel(ex.nada_suara, 'Nada stabil')}>Nada stabil</option><option value="Lagu tilawah" ${mkSel(ex.nada_suara, 'Lagu tilawah')}>Lagu tilawah</option></select></div>
                    </div>
                    <div class="wrap-tugas">
                        <input type="number" class="input-nilai-baca form-control sel-kecil" data-idsiswa="${item.id_siswa}" placeholder="Nilai Akhir" style="width:80px;" value="${ex.nilai !== undefined && ex.nilai !== null ? ex.nilai : ''}">
                        <input type="text" class="input-ket-baca form-control sel-kecil" data-idsiswa="${item.id_siswa}" placeholder="Keterangan..." style="flex:1;" value="${ex.keterangan || ''}">
                    </div>`;
                } 
                else if (tipe === 'tulis') {
                    const ex = exTulis.find(x => x.id_siswa === item.id_siswa) || {};
                    let filled = 0;
                    if(ex.ketepatan_huruf) filled++; if(ex.kerapian) filled++;
                    if(filled === 2) badgeHTML = '<span class="badge-status bg-sudah">Lengkap</span>';
                    else if(filled === 1) badgeHTML = '<span class="badge-status bg-sebagian">Sebagian</span>';
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';

                    inputUI = `
                    <div class="grid-input-nilai" style="grid-template-columns: 1fr 1fr; margin-bottom:0;">
                        <div class="form-group" style="margin-bottom:0;"><label>Ketepatan Huruf</label><select class="form-control input-tepat sel-kecil" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}" onchange="updateSelectColor(this)"><option value="">-Pilih-</option><option value="Banyak salah" ${mkSel(ex.ketepatan_huruf, 'Banyak salah')}>Banyak salah</option><option value="Sedikit salah" ${mkSel(ex.ketepatan_huruf, 'Sedikit salah')}>Sedikit salah</option><option value="Sudah tepat" ${mkSel(ex.ketepatan_huruf, 'Sudah tepat')}>Sudah tepat</option></select></div>
                        <div class="form-group" style="margin-bottom:0;"><label>Kerapian</label><select class="form-control input-rapi sel-kecil" data-idsiswa="${item.id_siswa}" onchange="updateSelectColor(this)"><option value="">-Pilih-</option><option value="Tidak rapi" ${mkSel(ex.kerapian, 'Tidak rapi')}>Tidak rapi</option><option value="Kurang rapi" ${mkSel(ex.kerapian, 'Kurang rapi')}>Kurang rapi</option><option value="Cukup" ${mkSel(ex.kerapian, 'Cukup')}>Cukup</option><option value="Rapi" ${mkSel(ex.kerapian, 'Rapi')}>Rapi</option></select></div>
                    </div>`;
                } 
                else if (tipe === 'sholat') {
                    const ex = exSholat.find(x => x.id_siswa === item.id_siswa) || {};
                    let filledCount = 0;
                    
                    let grid = '<div class="hafalan-grid">';
                    mapSholat.forEach(hf => {
                        const val = ex[hf.col];
                        if(val && val !== 'Kosong') filledCount++;
                        grid += `<div class="hafalan-item"><span class="hafalan-label">${hf.label}</span><select class="form-control sel-sholat sel-kecil" data-col="${hf.col}" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}" onchange="updateSelectColor(this)"><option value="Kosong" ${mkSel(val, 'Kosong')}>Kosong</option><option value="Belum hafal" ${mkSel(val, 'Belum hafal')}>Belum hafal</option><option value="Tidak lancar" ${mkSel(val, 'Tidak lancar')}>Tidak lancar</option><option value="Hafal" ${mkSel(val, 'Hafal')}>Hafal</option></select></div>`;
                    });
                    grid += '</div>';
                    inputUI = grid;

                    if(filledCount === mapSholat.length) badgeHTML = `<span class="badge-status bg-sudah">Lengkap (${mapSholat.length})</span>`;
                    else if(filledCount > 0) badgeHTML = `<span class="badge-status bg-sebagian">${filledCount}/${mapSholat.length} Dinilai</span>`;
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';
                } 
                else if (tipe === 'surah') {
                    const ex = exSurah.find(x => x.id_siswa === item.id_siswa) || {};
                    let filledCount = 0;

                    let grid = '<div class="hafalan-grid">';
                    mapSurah.forEach(sr => {
                        const val = ex[sr.col];
                        if(val && val !== 'Kosong') filledCount++;
                        grid += `<div class="hafalan-item"><span class="hafalan-label">${sr.label}</span><select class="form-control sel-surah sel-kecil" data-col="${sr.col}" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}" onchange="updateSelectColor(this)"><option value="Kosong" ${mkSel(val, 'Kosong')}>Kosong</option><option value="Belum hafal" ${mkSel(val, 'Belum hafal')}>Belum hafal</option><option value="Tidak lancar" ${mkSel(val, 'Tidak lancar')}>Tidak lancar</option><option value="Hafal" ${mkSel(val, 'Hafal')}>Hafal</option></select></div>`;
                    });
                    grid += '</div>';
                    inputUI = grid;

                    if(filledCount === mapSurah.length) badgeHTML = `<span class="badge-status bg-sudah">Lengkap (${mapSurah.length})</span>`;
                    else if(filledCount > 0) badgeHTML = `<span class="badge-status bg-sebagian">${filledCount}/${mapSurah.length} Dinilai</span>`;
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';
                }

                htmlContent += `
                    <div class="absen-card">
                        <div class="absen-info-header">
                            <div class="absen-identity">
                                <span class="absen-no">${item.nomor_absen || '-'}</span>
                                <span class="absen-nama">${item.siswa.nama_siswa} ${ikonGender}</span>
                                ${badgeHTML}
                            </div>
                            <button type="button" onclick="toggleInputPenilaian('${tipe}', '${item.id_siswa}')" class="btn-toggle-input"><i class="fa-solid fa-pen"></i> Isi / Edit</button>
                        </div>
                        <div id="area-input-${tipe}-${item.id_siswa}" style="display:none; width:100%; margin-top:6px; padding-top:6px; border-top:1px dashed var(--border-color);">
                            ${inputUI}
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = htmlContent;

        if(tipe === 'tugas') {
            await loadDaftarTugas(idKelas);
            loadNilaiTugas();
        } else {
            container.querySelectorAll('select').forEach(sel => window.updateSelectColor(sel));
        }

    } catch (error) {
        container.innerHTML = `<div style="color:var(--neon-red); text-align:center; padding:20px;">Gagal: ${error.message}</div>`;
    }
};

// ================= FUNGSI SIMPAN =================
window.simpanPenilaian = async function(tipe) {
    const idKelas = document.getElementById(`pilih-kelas-${tipe}`).value;
    const btn = document.getElementById(`btn-simpan-${tipe}`);
    const teksAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        let payloadInsert = [];

        const pushToDatabase = async (tabel, payload) => {
            const toInsert = payload.filter(p => !p.id); 
            const toUpdate = payload.filter(p => p.id);  
            
            if(toInsert.length > 0) {
                const { error } = await supabase.from(tabel).insert(toInsert);
                if (error) throw error;
            }
            if(toUpdate.length > 0) {
                const { error } = await supabase.from(tabel).upsert(toUpdate);
                if (error) throw error;
            }
        };

        if (tipe === 'tugas') {
            const dropVal = document.getElementById('input-nama-tugas-dropdown').value;
            const inputBaru = document.getElementById('input-nama-tugas-baru');
            let idTugasFinal = dropVal;

            if (inputBaru.style.display === 'block' && inputBaru.value.trim() !== '') {
                const { data: dtTugas, error: errTugas } = await supabase.from('namatugas').insert([{ id_kelas: idKelas, nama_tugas: inputBaru.value.trim() }]).select();
                if (errTugas) throw errTugas;
                idTugasFinal = dtTugas[0].id;
            }
            if(!idTugasFinal) throw new Error("Pilih tugas dari daftar atau buat tugas baru!");

            dataSiswaPenilaian.forEach(item => {
                const inpNilai = document.querySelector(`.input-nilai-tugas[data-idsiswa="${item.id_siswa}"]`);
                const iTuntas = document.getElementById(`val-tuntas-${item.id_siswa}`).value;
                const iRefleksi = document.querySelector(`.input-refleksi[data-idsiswa="${item.id_siswa}"]`);
                
                if(inpNilai.value !== "" || (iRefleksi && iRefleksi.value !== "")) {
                    let record = { 
                        id_tugas: idTugasFinal, id_siswa: item.id_siswa, 
                        nilai_tugas: inpNilai.value ? parseInt(inpNilai.value) : null, 
                        ketuntasan: iTuntas || 'TS', 
                        refleksi: (iRefleksi ? iRefleksi.value : null)
                    };
                    let recId = inpNilai.getAttribute('data-recordid');
                    if(recId && recId !== '') record.id = recId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) await pushToDatabase('penilaiantugas', payloadInsert);

        } else if (tipe === 'baca') {
            dataSiswaPenilaian.forEach(item => {
                const sel = document.querySelector(`.input-kelancaran[data-idsiswa="${item.id_siswa}"]`);
                const iLancar = sel.value;
                const iTajwid = document.querySelector(`.input-tajwid[data-idsiswa="${item.id_siswa}"]`).value;
                const iMakraj = document.querySelector(`.input-makraj[data-idsiswa="${item.id_siswa}"]`).value;
                const iNada = document.querySelector(`.input-nada[data-idsiswa="${item.id_siswa}"]`).value;
                const iNilai = document.querySelector(`.input-nilai-baca[data-idsiswa="${item.id_siswa}"]`).value;
                const iKet = document.querySelector(`.input-ket-baca[data-idsiswa="${item.id_siswa}"]`).value;
                
                if(iLancar || iTajwid || iMakraj || iNada || iNilai || iKet) {
                    let record = { 
                        id_kelas: idKelas, id_siswa: item.id_siswa, 
                        kelancaran_membaca: iLancar || null, tajwid_bacaan: iTajwid || null, 
                        makraj_huruf: iMakraj || null, nada_suara: iNada || null,
                        nilai: iNilai ? parseInt(iNilai) : null, keterangan: iKet || null
                    };
                    let recId = sel.getAttribute('data-recordid');
                    if(recId && recId !== '') record.id = recId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) await pushToDatabase('penilaianmembaca', payloadInsert);

        } else if (tipe === 'tulis') {
            dataSiswaPenilaian.forEach(item => {
                const sel = document.querySelector(`.input-tepat[data-idsiswa="${item.id_siswa}"]`);
                const iTepat = sel.value;
                const iRapi = document.querySelector(`.input-rapi[data-idsiswa="${item.id_siswa}"]`).value;
                
                if(iTepat || iRapi) {
                    let record = { id_kelas: idKelas, id_siswa: item.id_siswa, ketepatan_huruf: iTepat || null, kerapian: iRapi || null };
                    let recId = sel.getAttribute('data-recordid');
                    if(recId && recId !== '') record.id = recId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) await pushToDatabase('penilaianmenulis', payloadInsert);

        } else if (tipe === 'sholat') {
            dataSiswaPenilaian.forEach(item => {
                let record = { id_kelas: idKelas, id_siswa: item.id_siswa };
                let hasData = false;
                let recordId = null;

                mapSholat.forEach(hf => {
                    const sel = document.querySelector(`.sel-sholat[data-idsiswa="${item.id_siswa}"][data-col="${hf.col}"]`);
                    if (sel) {
                        if (sel.value && sel.value !== "Kosong") {
                            record[hf.col] = sel.value;
                            hasData = true;
                        } else {
                            record[hf.col] = null; 
                        }
                        let rid = sel.getAttribute('data-recordid');
                        if (!recordId && rid && rid !== 'undefined' && rid !== '') {
                            recordId = rid;
                        }
                    }
                });

                if (hasData || recordId) { 
                    if (recordId) record.id = recordId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) await pushToDatabase('penilaianhafalansholat', payloadInsert);

        } else if (tipe === 'surah') {
            dataSiswaPenilaian.forEach(item => {
                let record = { id_kelas: idKelas, id_siswa: item.id_siswa };
                let hasData = false;
                let recordId = null;

                mapSurah.forEach(sr => {
                    const sel = document.querySelector(`.sel-surah[data-idsiswa="${item.id_siswa}"][data-col="${sr.col}"]`);
                    if (sel) {
                        if (sel.value && sel.value !== "Kosong") {
                            record[sr.col] = sel.value;
                            hasData = true;
                        } else {
                            record[sr.col] = null; 
                        }
                        let rid = sel.getAttribute('data-recordid');
                        if (!recordId && rid && rid !== 'undefined' && rid !== '') {
                            recordId = rid;
                        }
                    }
                });

                if (hasData || recordId) { 
                    if (recordId) record.id = recordId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) await pushToDatabase('hafalansurah', payloadInsert);
        }

        if(payloadInsert.length === 0) {
            alert("Tidak ada data baru yang diubah/diisi! Pengisian dibatalkan.");
        } else {
            alert(`Berhasil menyimpan data ke database!`);
            bukaFormPenilaian(tipe); 
        }
    } catch (error) {
        alert("Gagal menyimpan penilaian! " + error.message);
    } finally {
        btn.innerHTML = teksAsli;
        btn.disabled = false;
    }
};

// ================= FITUR DOWNLOAD REKAP =================
window.loadExportLibsPenilaian = async function() {
    const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
    
    try {
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
    } catch (e) {
        throw new Error("Gagal memuat library export.");
    }
};

window.downloadRekapPenilaian = async function(tipe, format) {
    const idKelas = document.getElementById(`pilih-kelas-${tipe}`).value;
    const selKelas = document.getElementById(`pilih-kelas-${tipe}`);
    const namaKelas = selKelas.options[selKelas.selectedIndex].text;

    if (!idKelas) { alert("Pilih kelas terlebih dahulu!"); return; }

    try {
        alert(`Sedang menyusun rekap nilai ${tipe.toUpperCase()}, mohon tunggu...`);
        await window.loadExportLibsPenilaian();

        const { data: siswaData, error: errSiswa } = await supabase.from('anggota_kelas')
            .select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`)
            .eq('id_kelas', idKelas);
        if (errSiswa) throw errSiswa;

        sortSiswaPenilaian(siswaData);

        let headers = [];
        let reportData = [];
        let exData = [];
        let fileName = `Rekap_Nilai_${tipe.toUpperCase()}_${namaKelas}`;

        if (tipe === 'baca') {
            const {data} = await supabase.from('penilaianmembaca').select('*').eq('id_kelas', idKelas);
            exData = data || [];
            headers = [["No", "Nama Siswa", "L/P", "Kelancaran", "Tajwid", "Makhraj", "Nada/Suara", "Nilai Akhir", "Keterangan"]];
            siswaData.forEach((s, idx) => {
                let rec = exData.find(x => x.id_siswa === s.id_siswa) || {};
                reportData.push([
                    s.nomor_absen || (idx+1), s.siswa.nama_siswa, s.siswa.jenis_kelamin,
                    rec.kelancaran_membaca || '-', rec.tajwid_bacaan || '-', rec.makraj_huruf || '-',
                    rec.nada_suara || '-', rec.nilai || '-', rec.keterangan || '-'
                ]);
            });
        } 
        else if (tipe === 'tulis') {
            const {data} = await supabase.from('penilaianmenulis').select('*').eq('id_kelas', idKelas);
            exData = data || [];
            headers = [["No", "Nama Siswa", "L/P", "Ketepatan Huruf", "Kerapian"]];
            siswaData.forEach((s, idx) => {
                let rec = exData.find(x => x.id_siswa === s.id_siswa) || {};
                reportData.push([
                    s.nomor_absen || (idx+1), s.siswa.nama_siswa, s.siswa.jenis_kelamin,
                    rec.ketepatan_huruf || '-', rec.kerapian || '-'
                ]);
            });
        } 
        else if (tipe === 'sholat') {
            const {data} = await supabase.from('penilaianhafalansholat').select('*').eq('id_kelas', idKelas);
            exData = data || [];
            let h = ["No", "Nama Siswa", "L/P"];
            mapSholat.forEach(m => h.push(m.label));
            headers = [h];
            siswaData.forEach((s, idx) => {
                let rec = exData.find(x => x.id_siswa === s.id_siswa) || {};
                let row = [s.nomor_absen || (idx+1), s.siswa.nama_siswa, s.siswa.jenis_kelamin];
                mapSholat.forEach(m => row.push(rec[m.col] || '-'));
                reportData.push(row);
            });
        } 
        else if (tipe === 'surah') {
            const {data} = await supabase.from('hafalansurah').select('*').eq('id_kelas', idKelas);
            exData = data || [];
            let h = ["No", "Nama Siswa", "L/P"];
            mapSurah.forEach(m => h.push(m.label));
            headers = [h];
            siswaData.forEach((s, idx) => {
                let rec = exData.find(x => x.id_siswa === s.id_siswa) || {};
                let row = [s.nomor_absen || (idx+1), s.siswa.nama_siswa, s.siswa.jenis_kelamin];
                mapSurah.forEach(m => row.push(rec[m.col] || '-'));
                reportData.push(row);
            });
        } 
        else if (tipe === 'tugas') {
            const { data: lt } = await supabase
                .from('namatugas')
                .select('id, nama_tugas')
                .eq('id_kelas', idKelas)
                .order('created_at', { ascending: true });
            
            const listTugas = lt || [];
            const listTugasIds = listTugas.map(t => t.id);

            let nilaiTugas = [];
            if (listTugasIds.length > 0) {
                const { data: nt } = await supabase
                    .from('penilaiantugas')
                    .select('*')
                    .in('id_tugas', listTugasIds);
                nilaiTugas = nt || [];
            }
            
            let h = ["No", "Nama Siswa", "L/P"];
            listTugas.forEach(t => h.push(t.nama_tugas));
            headers = [h];

            siswaData.forEach((s, idx) => {
                let row = [s.nomor_absen || (idx+1), s.siswa.nama_siswa, s.siswa.jenis_kelamin];
                listTugas.forEach(t => {
                    let rec = nilaiTugas.find(x => x.id_siswa === s.id_siswa && x.id_tugas === t.id);
                    if(rec) {
                        let val = (rec.nilai_tugas !== null && rec.nilai_tugas !== undefined) ? rec.nilai_tugas : '-';
                        row.push(val);
                    } else { 
                        row.push('-'); 
                    }
                });
                reportData.push(row);
            });
        }

        if (format === 'excel') {
            const ws = window.XLSX.utils.aoa_to_sheet([...headers, ...reportData]);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, `Rekap ${tipe.toUpperCase()}`);
            window.XLSX.writeFile(wb, `${fileName}.xlsx`);
        } 
        else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4'); 
            
            let pdfFontSize = 8;
            if (tipe === 'surah') pdfFontSize = 5; 
            if (tipe === 'sholat') pdfFontSize = 6;
            if (tipe === 'tugas' && headers[0].length > 10) pdfFontSize = 6;
            
            doc.setFontSize(14);
            doc.text(`Rekapitulasi Nilai ${tipe.toUpperCase()} - ${namaKelas}`, 40, 40);

            doc.autoTable({
                startY: 60,
                head: headers,
                body: reportData,
                theme: 'grid',
                styles: { fontSize: pdfFontSize, cellPadding: 2 },
                headStyles: { fillColor: [5, 213, 138], textColor: 255 } 
            });

            doc.save(`${fileName}.pdf`);
        }
        
    } catch (e) {
        alert("Gagal membuat rekapitulasi data: " + e.message);
    }
};