// js/modules/penilaian.js
import supabase from '../supabase.js';

let dataSiswaPenilaian = [];

// Pemetaan Nama Kolom Database Horizontal berdasarkan tangkapan layar Anda
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
        loadNilaiTugas(); // Bersihkan form
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

// ================= INISIALISASI DATA AWAL =================
window.loadKelasUntukPenilaian = async function() {
    const selIds = ['pilih-kelas-tugas', 'pilih-kelas-baca', 'pilih-kelas-tulis', 'pilih-kelas-sholat', 'pilih-kelas-surah'];
    const loadingText = '<option value="">Memuat kelas...</option>';
    selIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = loadingText; });

    try {
        const { data, error } = await supabase.from('kelas').select('id, tingkat, nama_kelas').order('tingkat', { ascending: true }).order('nama_kelas', { ascending: true });
        if (error) throw error;

        let options = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(item => { options += `<option value="${item.id}">${item.nama_kelas} (Kelas ${item.tingkat})</option>`; });
        selIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = options; });

        await loadDaftarTugas();
    } catch (error) {
        selIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = '<option value="">Gagal</option>'; });
    }
};

window.loadDaftarTugas = async function() {
    try {
        const { data, error } = await supabase.from('namatugas').select('id, nama_tugas');
        if (error) throw error;
        
        const dd = document.getElementById('input-nama-tugas-dropdown');
        let html = '<option value="">-- Pilih Tugas --</option>';
        const uniqueTugas = [];
        const mapTugas = new Map();
        for (const item of data) {
            if(!mapTugas.has(item.nama_tugas)){
                mapTugas.set(item.nama_tugas, true);
                uniqueTugas.push({ id: item.id, nama: item.nama_tugas });
            }
        }
        uniqueTugas.forEach(t => { html += `<option value="${t.id}">${t.nama}</option>`; });
        if(dd) dd.innerHTML = html;
    } catch (e) { console.error("Gagal load tugas", e); }
};

window.loadNilaiTugas = async function() {
    const idTugas = document.getElementById('input-nama-tugas-dropdown').value;
    
    // Reset seluruh form nilai tugas
    document.querySelectorAll('.input-nilai-tugas').forEach(el => { el.value = ''; el.removeAttribute('data-recordid'); });
    document.querySelectorAll('.val-ketuntasan').forEach(el => el.value = '');
    document.querySelectorAll('.btn-tuntas').forEach(el => el.classList.remove('active', 't', 'ts'));
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

// ================= RENDER FORM DINAMIS =================
const mkSel = (val, target) => (val === target ? 'selected' : '');

window.bukaFormPenilaian = async function(tipe) {
    const idKelas = document.getElementById(`pilih-kelas-${tipe}`).value;
    if (!idKelas) return;

    document.getElementById(`area-${tipe}`).style.display = 'block';
    
    const container = document.getElementById(`tempat-list-${tipe}`);
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#007bff;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat siswa dan data riwayat...</div>';

    try {
        const { data: dataSiswa, error: errSiswa } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas).order('nomor_absen', { ascending: true });
        if (errSiswa) throw errSiswa;
        if (dataSiswa.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa0b3;">Belum ada siswa di kelas ini.</div>';
            return;
        }
        dataSiswa.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));
        dataSiswaPenilaian = dataSiswa;

        // Tarik Data Riwayat
        let exBaca = [], exTulis = [], exSholat = [], exSurah = [];
        if (tipe === 'baca') {
            const {data} = await supabase.from('penilaianmembaca').select('*').eq('id_kelas', idKelas);
            exBaca = data || [];
        } else if (tipe === 'tulis') {
            const {data} = await supabase.from('nilaitulisquran').select('*').eq('id_kelas', idKelas);
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
            const ikonGender = item.siswa.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:#007bff;"></i>' : (item.siswa.jenis_kelamin === 'P' ? '<i class="fa-solid fa-venus" style="color:#e83e8c;"></i>' : '');
            let inputUI = '';
            let badgeHTML = '';
            
            // 1. TUGAS
            if(tipe === 'tugas') {
                inputUI = `
                <div class="wrap-tugas" style="margin-top:8px;">
                    <input type="number" class="input-nilai-tugas form-control" data-idsiswa="${item.id_siswa}" placeholder="Nilai" style="width:70px; text-align:center;">
                    <div id="grp-tuntas-${item.id_siswa}" style="display:flex; gap:5px;">
                        <input type="hidden" id="val-tuntas-${item.id_siswa}" class="val-ketuntasan" value="">
                        <button type="button" class="btn-tuntas" data-idsiswa="${item.id_siswa}" data-val="T" onclick="setKetuntasan('${item.id_siswa}', 'T')">T</button>
                        <button type="button" class="btn-tuntas" data-idsiswa="${item.id_siswa}" data-val="TS" onclick="setKetuntasan('${item.id_siswa}', 'TS')">TS</button>
                    </div>
                    <input type="text" class="input-refleksi form-control" data-idsiswa="${item.id_siswa}" placeholder="Catatan/Refleksi..." style="flex:1; min-width: 150px;">
                </div>`;
                
                htmlContent += `
                    <div class="absen-card">
                        <div class="absen-info-header" style="border-bottom:none;">
                            <div class="absen-identity">
                                <span class="absen-no">${item.nomor_absen || '-'}</span>
                                <span class="absen-nama">${item.siswa.nama_siswa} ${ikonGender}</span>
                            </div>
                        </div>
                        <div style="width:100%;">${inputUI}</div>
                    </div>
                `;
            } 
            else {
                // 2. BACA QURAN
                if (tipe === 'baca') {
                    const ex = exBaca.find(x => x.id_siswa === item.id_siswa) || {};
                    let filled = 0;
                    if(ex.kelancaran_membaca) filled++; if(ex.tajwid_bacaan) filled++; if(ex.makraj_huruf) filled++; if(ex.nada_suara) filled++;
                    if(filled === 4) badgeHTML = '<span class="badge-status bg-sudah">Lengkap</span>';
                    else if(filled > 0) badgeHTML = '<span class="badge-status bg-sebagian">Sebagian</span>';
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';

                    inputUI = `
                    <div class="grid-input-nilai">
                        <div class="form-group"><label>Kelancaran</label><select class="form-control input-kelancaran sel-kecil" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}"><option value="">-Pilih-</option><option value="Tidak bisa baca" ${mkSel(ex.kelancaran_membaca, 'Tidak bisa baca')}>Tidak bisa baca</option><option value="Terbata-bata" ${mkSel(ex.kelancaran_membaca, 'Terbata-bata')}>Terbata-bata</option><option value="Cepat namun banyak salah" ${mkSel(ex.kelancaran_membaca, 'Cepat namun banyak salah')}>Cepat namun banyak salah</option><option value="Cepat dengan sedikit salah" ${mkSel(ex.kelancaran_membaca, 'Cepat dengan sedikit salah')}>Cepat dengan sedikit salah</option><option value="Lancar" ${mkSel(ex.kelancaran_membaca, 'Lancar')}>Lancar</option><option value="Mahir tanpa kesalahan" ${mkSel(ex.kelancaran_membaca, 'Mahir tanpa kesalahan')}>Mahir tanpa kesalahan</option></select></div>
                        <div class="form-group"><label>Tajwid</label><select class="form-control input-tajwid sel-kecil" data-idsiswa="${item.id_siswa}"><option value="">-Pilih-</option><option value="Tanpa tajwid" ${mkSel(ex.tajwid_bacaan, 'Tanpa tajwid')}>Tanpa tajwid</option><option value="Panjang-pendek" ${mkSel(ex.tajwid_bacaan, 'Panjang-pendek')}>Panjang-pendek</option><option value="Tajwid dasar" ${mkSel(ex.tajwid_bacaan, 'Tajwid dasar')}>Tajwid dasar</option><option value="Tajwid lanjutan" ${mkSel(ex.tajwid_bacaan, 'Tajwid lanjutan')}>Tajwid lanjutan</option><option value="Mahir" ${mkSel(ex.tajwid_bacaan, 'Mahir')}>Mahir</option></select></div>
                        <div class="form-group"><label>Makhraj</label><select class="form-control input-makraj sel-kecil" data-idsiswa="${item.id_siswa}"><option value="">-Pilih-</option><option value="Tidak mengenal huruf" ${mkSel(ex.makraj_huruf, 'Tidak mengenal huruf')}>Tidak mengenal huruf</option><option value="Banyak salah" ${mkSel(ex.makraj_huruf, 'Banyak salah')}>Banyak salah</option><option value="Salah sedikit" ${mkSel(ex.makraj_huruf, 'Salah sedikit')}>Salah sedikit</option><option value="Kurang jelas" ${mkSel(ex.makraj_huruf, 'Kurang jelas')}>Kurang jelas</option><option value="Jelas" ${mkSel(ex.makraj_huruf, 'Jelas')}>Jelas</option><option value="Sangat jelas" ${mkSel(ex.makraj_huruf, 'Sangat jelas')}>Sangat jelas</option></select></div>
                        <div class="form-group"><label>Nada/Suara</label><select class="form-control input-nada sel-kecil" data-idsiswa="${item.id_siswa}"><option value="">-Pilih-</option><option value="Tanpa lagu" ${mkSel(ex.nada_suara, 'Tanpa lagu')}>Tanpa lagu</option><option value="Nada stabil" ${mkSel(ex.nada_suara, 'Nada stabil')}>Nada stabil</option><option value="Lagu tilawah" ${mkSel(ex.nada_suara, 'Lagu tilawah')}>Lagu tilawah</option></select></div>
                    </div>
                    <div class="wrap-tugas" style="margin-top:5px;">
                        <input type="number" class="input-nilai-baca form-control" data-idsiswa="${item.id_siswa}" placeholder="Nilai Akhir" style="width:100px;" value="${ex.nilai !== undefined && ex.nilai !== null ? ex.nilai : ''}">
                        <input type="text" class="input-ket-baca form-control" data-idsiswa="${item.id_siswa}" placeholder="Keterangan tambahan..." style="flex:1;" value="${ex.keterangan || ''}">
                    </div>`;
                } 
                // 3. TULIS QURAN
                else if (tipe === 'tulis') {
                    const ex = exTulis.find(x => x.id_siswa === item.id_siswa) || {};
                    let filled = 0;
                    if(ex.ketepatan_huruf) filled++; if(ex.kerapian) filled++;
                    if(filled === 2) badgeHTML = '<span class="badge-status bg-sudah">Lengkap</span>';
                    else if(filled === 1) badgeHTML = '<span class="badge-status bg-sebagian">Sebagian</span>';
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';

                    inputUI = `
                    <div class="grid-input-nilai" style="grid-template-columns: 1fr 1fr;">
                        <div class="form-group"><label>Ketepatan Huruf</label><select class="form-control input-tepat sel-kecil" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}"><option value="">-Pilih-</option><option value="Banyak salah" ${mkSel(ex.ketepatan_huruf, 'Banyak salah')}>Banyak salah</option><option value="Sedikit salah" ${mkSel(ex.ketepatan_huruf, 'Sedikit salah')}>Sedikit salah</option><option value="Sudah tepat" ${mkSel(ex.ketepatan_huruf, 'Sudah tepat')}>Sudah tepat</option></select></div>
                        <div class="form-group"><label>Kerapian</label><select class="form-control input-rapi sel-kecil" data-idsiswa="${item.id_siswa}"><option value="">-Pilih-</option><option value="Tidak rapi" ${mkSel(ex.kerapian, 'Tidak rapi')}>Tidak rapi</option><option value="Kurang rapi" ${mkSel(ex.kerapian, 'Kurang rapi')}>Kurang rapi</option><option value="Cukup" ${mkSel(ex.kerapian, 'Cukup')}>Cukup</option><option value="Rapi" ${mkSel(ex.kerapian, 'Rapi')}>Rapi</option></select></div>
                    </div>`;
                } 
                // 4. HAFALAN SHOLAT
                else if (tipe === 'sholat') {
                    const ex = exSholat.find(x => x.id_siswa === item.id_siswa) || {};
                    let filledCount = 0;
                    
                    let grid = '<div class="hafalan-grid">';
                    mapSholat.forEach(hf => {
                        const val = ex[hf.col];
                        if(val && val !== 'Kosong') filledCount++;
                        grid += `<div class="hafalan-item"><span class="hafalan-label">${hf.label}</span><select class="form-control sel-sholat sel-kecil" data-col="${hf.col}" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}"><option value="Kosong" ${mkSel(val, 'Kosong')}>Kosong</option><option value="Belum hafal" ${mkSel(val, 'Belum hafal')}>Belum hafal</option><option value="Tidak lancar" ${mkSel(val, 'Tidak lancar')}>Tidak lancar</option><option value="Hafal" ${mkSel(val, 'Hafal')}>Hafal</option></select></div>`;
                    });
                    grid += '</div>';
                    inputUI = grid;

                    if(filledCount === mapSholat.length) badgeHTML = `<span class="badge-status bg-sudah">Lengkap (${mapSholat.length})</span>`;
                    else if(filledCount > 0) badgeHTML = `<span class="badge-status bg-sebagian">${filledCount}/${mapSholat.length} Dinilai</span>`;
                    else badgeHTML = '<span class="badge-status bg-belum">Belum Dinilai</span>';
                } 
                // 5. SURAH PENDEK
                else if (tipe === 'surah') {
                    const ex = exSurah.find(x => x.id_siswa === item.id_siswa) || {};
                    let filledCount = 0;

                    let grid = '<div class="hafalan-grid">';
                    mapSurah.forEach(sr => {
                        const val = ex[sr.col];
                        if(val && val !== 'Kosong') filledCount++;
                        grid += `<div class="hafalan-item"><span class="hafalan-label">${sr.label}</span><select class="form-control sel-surah sel-kecil" data-col="${sr.col}" data-idsiswa="${item.id_siswa}" data-recordid="${ex.id||''}"><option value="Kosong" ${mkSel(val, 'Kosong')}>Kosong</option><option value="Belum hafal" ${mkSel(val, 'Belum hafal')}>Belum hafal</option><option value="Tidak lancar" ${mkSel(val, 'Tidak lancar')}>Tidak lancar</option><option value="Hafal" ${mkSel(val, 'Hafal')}>Hafal</option></select></div>`;
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
                                <span class="absen-nama">${item.siswa.nama_siswa} ${ikonGender} ${badgeHTML}</span>
                            </div>
                            <button type="button" onclick="toggleInputPenilaian('${tipe}', '${item.id_siswa}')" class="btn-toggle-input"><i class="fa-solid fa-pen"></i> Isi / Edit</button>
                        </div>
                        <div id="area-input-${tipe}-${item.id_siswa}" style="display:none; width:100%; margin-top:10px; padding-top:10px; border-top:1px dashed #e6f2ff;">
                            ${inputUI}
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = htmlContent;
        if(tipe === 'tugas') loadNilaiTugas();

    } catch (error) {
        container.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Gagal: ${error.message}</div>`;
    }
};

// ================= FUNGSI SIMPAN (TANPA TANGGAL, UPSERT HORIZONTAL) =================
window.simpanPenilaian = async function(tipe) {
    const idKelas = document.getElementById(`pilih-kelas-${tipe}`).value;
    const btn = document.getElementById(`btn-simpan-${tipe}`);
    const teksAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        let payloadInsert = [];

        // --- 1. SIMPAN TUGAS ---
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
                
                if(inpNilai.value !== "" || iTuntas !== "" || (iRefleksi && iRefleksi.value !== "")) {
                    let record = { 
                        id_tugas: idTugasFinal, id_siswa: item.id_siswa, 
                        nilai_tugas: inpNilai.value ? parseInt(inpNilai.value) : null, 
                        ketuntasan: iTuntas || null, refleksi: (iRefleksi ? iRefleksi.value : null)
                    };
                    if(inpNilai.getAttribute('data-recordid')) record.id = inpNilai.getAttribute('data-recordid');
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) {
                const { error } = await supabase.from('penilaiantugas').upsert(payloadInsert);
                if (error) throw error;
            }

        // --- 2. BACA QURAN ---
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
                    if(sel.getAttribute('data-recordid')) record.id = sel.getAttribute('data-recordid');
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) {
                const { error } = await supabase.from('penilaianmembaca').upsert(payloadInsert);
                if (error) throw error;
            }

        // --- 3. TULIS QURAN ---
        } else if (tipe === 'tulis') {
            dataSiswaPenilaian.forEach(item => {
                const sel = document.querySelector(`.input-tepat[data-idsiswa="${item.id_siswa}"]`);
                const iTepat = sel.value;
                const iRapi = document.querySelector(`.input-rapi[data-idsiswa="${item.id_siswa}"]`).value;
                
                if(iTepat || iRapi) {
                    let record = { id_kelas: idKelas, id_siswa: item.id_siswa, ketepatan_huruf: iTepat || null, kerapian: iRapi || null };
                    if(sel.getAttribute('data-recordid')) record.id = sel.getAttribute('data-recordid');
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) {
                const { error } = await supabase.from('nilaitulisquran').upsert(payloadInsert);
                if (error) throw error;
            }

        // --- 4. SHOLAT (DATABASE HORIZONTAL) ---
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
                        if (!recordId && sel.getAttribute('data-recordid')) recordId = sel.getAttribute('data-recordid');
                    }
                });

                if (hasData || recordId) { 
                    if (recordId) record.id = recordId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) {
                const { error } = await supabase.from('penilaianhafalansholat').upsert(payloadInsert);
                if (error) throw error;
            }

        // --- 5. SURAH (DATABASE HORIZONTAL) ---
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
                        if (!recordId && sel.getAttribute('data-recordid')) recordId = sel.getAttribute('data-recordid');
                    }
                });

                if (hasData || recordId) {
                    if (recordId) record.id = recordId;
                    payloadInsert.push(record);
                }
            });
            if(payloadInsert.length > 0) {
                const { error } = await supabase.from('hafalansurah').upsert(payloadInsert);
                if (error) throw error;
            }
        }

        if(payloadInsert.length === 0) {
            alert("Tidak ada data baru yang diubah/diisi! Pengisian dibatalkan.");
        } else {
            alert(`Berhasil menyimpan data ke database!`);
            bukaFormPenilaian(tipe); // Reload untuk mereset status badge
        }
    } catch (error) {
        alert("Gagal menyimpan penilaian! " + error.message);
    } finally {
        btn.innerHTML = teksAsli;
        btn.disabled = false;
    }
};