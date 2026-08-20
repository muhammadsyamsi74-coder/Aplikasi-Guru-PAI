// js/modules/presensi.js
import supabase from '../supabase.js';

let dataSiswaAbsenKelas = [];
let dataSiswaAbsenSholat = [];
let editModeKelas = null;   
let editModeSholat = null;  

window.gantiTabPresensi = function(tabName) {
    document.getElementById('btn-tab-kelas').classList.remove('active');
    document.getElementById('btn-tab-sholat').classList.remove('active');
    document.getElementById(`btn-tab-${tabName}`).classList.add('active');

    document.getElementById('tab-presensi-kelas').style.display = (tabName === 'kelas') ? 'block' : 'none';
    document.getElementById('tab-presensi-sholat').style.display = (tabName === 'sholat') ? 'block' : 'none';
};

window.loadKelasUntukPresensi = async function() {
    const selKelas = document.getElementById('pilih-kelas-absen-kelas');
    const selSholat = document.getElementById('pilih-kelas-absen-sholat');
    const loadingText = '<option value="">Memuat kelas...</option>';
    
    selKelas.innerHTML = loadingText;
    selSholat.innerHTML = loadingText;

    try {
        const { data, error } = await supabase.from('kelas').select('id, tingkat, nama_kelas').order('tingkat', { ascending: true }).order('nama_kelas', { ascending: true });
        if (error) throw error;

        let options = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(item => { options += `<option value="${item.id}">${item.nama_kelas} (Kelas ${item.tingkat})</option>`; });
        
        selKelas.innerHTML = options;
        selSholat.innerHTML = options;
    } catch (error) {
        selKelas.innerHTML = '<option value="">Gagal memuat kelas</option>';
        selSholat.innerHTML = '<option value="">Gagal memuat kelas</option>';
    }
};

// ================= TAB 1: LOGIKA PRESENSI KELAS =================
window.bukaFormAbsenKelas = async function() {
    const idKelas = document.getElementById('pilih-kelas-absen-kelas').value;
    if (!idKelas) {
        document.getElementById('area-riwayat-kelas').style.display = 'none';
        return;
    }

    editModeKelas = null;
    document.getElementById('btn-simpan-absen-kelas').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Transmit Data Presensi';
    document.getElementById('input-tgl-absen-kelas').valueAsDate = new Date(); 

    const container = document.getElementById('tempat-list-absen-kelas');
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#007bff;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar siswa...</div>';
    document.getElementById('area-absen-kelas').style.display = 'block';

    try {
        const { data: maxPertemuan, error: errMax } = await supabase
            .from('absenkelas').select('pertemuan_ke').eq('id_kelas', idKelas)
            .order('pertemuan_ke', { ascending: false }).limit(1);

        let nextPertemuan = 1;
        if (maxPertemuan && maxPertemuan.length > 0) {
            nextPertemuan = parseInt(maxPertemuan[0].pertemuan_ke) + 1;
        }
        document.getElementById('input-pertemuan-ke').value = nextPertemuan;

        const { data, error } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas).order('nomor_absen', { ascending: true });
        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa0b3;">Belum ada siswa di kelas ini.</div>';
            return;
        }

        data.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));
        dataSiswaAbsenKelas = data.map(item => ({ id_siswa: item.id_siswa, kehadiran: 'Hadir', quran: 'Kosong' }));

        let htmlContent = '';
        data.forEach((item, index) => {
            const jk = item.siswa.jenis_kelamin;
            const ikonGender = jk === 'L' ? '<i class="fa-solid fa-mars" style="color:#007bff; font-size:10px;"></i>' : (jk === 'P' ? '<i class="fa-solid fa-venus" style="color:#e83e8c; font-size:10px;"></i>' : '');

            htmlContent += `
                <div class="absen-card">
                    <span class="absen-no">${item.nomor_absen || '-'}</span>
                    <span class="absen-nama" title="${item.siswa.nama_siswa}">${item.siswa.nama_siswa} ${ikonGender}</span>
                    
                    <div class="opsi-group" id="kg-hadir-${index}">
                        <div class="btn-opsi active btn-hadir" onclick="pilihKehadiranKelas(${index}, 'Hadir')">H</div>
                        <div class="btn-opsi btn-sakit" onclick="pilihKehadiranKelas(${index}, 'Sakit')">S</div>
                        <div class="btn-opsi btn-izin" onclick="pilihKehadiranKelas(${index}, 'Izin')">I</div>
                        <div class="btn-opsi btn-alpa" onclick="pilihKehadiranKelas(${index}, 'Alpa')">A</div>
                    </div>
                    
                    <div class="opsi-group" id="kg-quran-${index}" style="margin-left: 5px;">
                        <div class="btn-opsi btn-bawa" onclick="pilihQuranKelas(${index}, 'Bawa')">B</div>
                        <div class="btn-opsi btn-tbawa" onclick="pilihQuranKelas(${index}, 'Tidak Bawa')">T</div>
                        <div class="btn-opsi active btn-strip" onclick="pilihQuranKelas(${index}, 'Kosong')">-</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = htmlContent;
        loadRiwayatKelas(idKelas);
    } catch (error) {
        container.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Gagal: ${error.message}</div>`;
    }
};

window.pilihKehadiranKelas = function(indexSiswa, status) {
    dataSiswaAbsenKelas[indexSiswa].kehadiran = status;
    const grpHadir = document.getElementById(`kg-hadir-${indexSiswa}`);
    const btnsHadir = grpHadir.querySelectorAll('.btn-opsi');
    btnsHadir.forEach(btn => btn.classList.remove('active'));
    
    const classMap = { 'Hadir': 'btn-hadir', 'Sakit': 'btn-sakit', 'Izin': 'btn-izin', 'Alpa': 'btn-alpa' };
    btnsHadir.forEach(btn => { if(btn.classList.contains(classMap[status])) btn.classList.add('active'); });

    const grpQuran = document.getElementById(`kg-quran-${indexSiswa}`);
    const btnsQuran = grpQuran.querySelectorAll('.btn-opsi');
    
    if (status !== 'Hadir') {
        dataSiswaAbsenKelas[indexSiswa].quran = 'Kosong';
        btnsQuran.forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.4';
            btn.classList.remove('active');
            if (btn.innerText === '-') btn.classList.add('active');
        });
    } else {
        btnsQuran.forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        });
    }
};

window.pilihQuranKelas = function(indexSiswa, status) {
    if (dataSiswaAbsenKelas[indexSiswa].kehadiran !== 'Hadir') return;
    dataSiswaAbsenKelas[indexSiswa].quran = status;
    const grpQuran = document.getElementById(`kg-quran-${indexSiswa}`);
    const btnsQuran = grpQuran.querySelectorAll('.btn-opsi');
    btnsQuran.forEach(btn => btn.classList.remove('active'));
    
    const classMap = { 'Bawa': 'btn-bawa', 'Tidak Bawa': 'btn-tbawa', 'Kosong': 'btn-strip' };
    btnsQuran.forEach(btn => { if(btn.classList.contains(classMap[status])) btn.classList.add('active'); });
};

window.simpanPresensiKelas = async function() {
    if (dataSiswaAbsenKelas.length === 0) return;
    const tgl = document.getElementById('input-tgl-absen-kelas').value;
    const pert = document.getElementById('input-pertemuan-ke').value;
    const idKelas = document.getElementById('pilih-kelas-absen-kelas').value;
    
    if (!tgl || !pert) { alert("Tanggal dan Pertemuan Ke harus diisi!"); return; }

    const btn = document.getElementById('btn-simpan-absen-kelas');
    const teksAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        if (editModeKelas) {
            await supabase.from('absenkelas').delete().eq('id_kelas', idKelas).eq('tanggal', editModeKelas.tanggal).eq('pertemuan_ke', editModeKelas.pertemuan_ke);
        }

        const payloadInsert = dataSiswaAbsenKelas.map(item => {
            let bawaQuranBool = null;
            if (item.quran === 'Bawa') bawaQuranBool = true;
            else if (item.quran === 'Tidak Bawa') bawaQuranBool = false;

            return { id_kelas: idKelas, id_siswa: item.id_siswa, tanggal: tgl, pertemuan_ke: pert, kehadiran: item.kehadiran, bawa_quran: bawaQuranBool };
        });

        const { error } = await supabase.from('absenkelas').insert(payloadInsert);
        if (error) throw error;

        alert(`Berhasil menyimpan presensi mengajar untuk ${payloadInsert.length} siswa!`);
        bukaFormAbsenKelas(); 
    } catch (error) {
        alert("Gagal menyimpan presensi! " + error.message);
    } finally {
        btn.innerHTML = teksAsli;
        btn.disabled = false;
    }
};

window.loadRiwayatKelas = async function(idKelas) {
    const container = document.getElementById('tempat-riwayat-kelas');
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';
    document.getElementById('area-riwayat-kelas').style.display = 'block';

    const selKelas = document.getElementById('pilih-kelas-absen-kelas');
    const namaKelas = selKelas.options[selKelas.selectedIndex].text;

    try {
        const { data, error } = await supabase.from('absenkelas').select('tanggal, pertemuan_ke, kehadiran').eq('id_kelas', idKelas);
        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<li style="color:#8fa0b3; font-size:12px; padding:10px 0;">Belum ada riwayat presensi.</li>';
            return;
        }

        const grouped = {};
        data.forEach(item => {
            const key = `${item.tanggal}|${item.pertemuan_ke}`;
            if(!grouped[key]) grouped[key] = { tanggal: item.tanggal, pertemuan: item.pertemuan_ke, Hadir:0, Sakit:0, Izin:0, Alpa:0 };
            if(grouped[key][item.kehadiran] !== undefined) grouped[key][item.kehadiran]++;
        });

        const sortedKeys = Object.keys(grouped).sort((a,b) => new Date(grouped[b].tanggal) - new Date(grouped[a].tanggal));
        
        let html = '';
        sortedKeys.forEach(k => {
            const g = grouped[k];
            // PERUBAHAN UI RIWAYAT 2 BARIS (MENGAJAR)
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:8px; padding: 12px; background: rgba(255,255,255,0.7); border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                <!-- Baris 1: Judul & Tanggal -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <b style="color:var(--biru-tua); font-size:12px;"><i class="fa-solid fa-chalkboard-user" style="color:var(--biru-dasar); margin-right:4px;"></i> ${namaKelas} (Pert. ${g.pertemuan})</b>
                    <span style="font-size:10px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;"><i class="fa-regular fa-calendar"></i> ${g.tanggal}</span>
                </div>
                
                <!-- Baris 2: Indikator & Aksi -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="font-size:10px; background:rgba(0,123,255,0.05); padding:5px 8px; border-radius:6px; font-weight:700; display:flex; gap:8px; border:1px solid rgba(0,123,255,0.1);">
                        <span style="color:#10b981;">H:${g.Hadir}</span>
                        <span style="color:#f59e0b;">S:${g.Sakit}</span>
                        <span style="color:#0ea5e9;">I:${g.Izin}</span>
                        <span style="color:#ef4444;">A:${g.Alpa}</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="editRiwayatKelas('${g.tanggal}', '${g.pertemuan}')" class="btn-action btn-edit" style="width: 28px; height: 28px; padding:0; justify-content:center;" title="Edit"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusRiwayatKelas('${g.tanggal}', '${g.pertemuan}')" class="btn-action btn-delete" style="width: 28px; height: 28px; padding:0; justify-content:center;" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </li>
            `;
        });
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = `<li style="color:red; font-size:11px;">Gagal memuat riwayat.</li>`;
    }
};

window.editRiwayatKelas = async function(tanggal, pertemuan) {
    const idKelas = document.getElementById('pilih-kelas-absen-kelas').value;
    document.getElementById('input-tgl-absen-kelas').value = tanggal;
    document.getElementById('input-pertemuan-ke').value = pertemuan;
    
    try {
        const { data, error } = await supabase.from('absenkelas').select('*').eq('id_kelas', idKelas).eq('tanggal', tanggal).eq('pertemuan_ke', pertemuan);
        if(error) throw error;
        
        data.forEach(dbItem => {
            const index = dataSiswaAbsenKelas.findIndex(s => s.id_siswa === dbItem.id_siswa);
            if(index !== -1) {
                pilihKehadiranKelas(index, dbItem.kehadiran);
                if(dbItem.bawa_quran === true) pilihQuranKelas(index, 'Bawa');
                else if(dbItem.bawa_quran === false) pilihQuranKelas(index, 'Tidak Bawa');
                else pilihQuranKelas(index, 'Kosong');
            }
        });
        
        editModeKelas = { tanggal, pertemuan_ke: pertemuan };
        document.getElementById('btn-simpan-absen-kelas').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Perbarui Presensi Kelas';
        document.getElementById('area-absen-kelas').scrollIntoView({ behavior: 'smooth' });
    } catch(e) { alert('Gagal memuat data edit: ' + e.message); }
};

window.hapusRiwayatKelas = async function(tanggal, pertemuan) {
    if(!confirm(`Yakin MENGHAPUS presensi pertemuan ${pertemuan} tanggal ${tanggal}?`)) return;
    const idKelas = document.getElementById('pilih-kelas-absen-kelas').value;
    try {
        const {error} = await supabase.from('absenkelas').delete().eq('id_kelas', idKelas).eq('tanggal', tanggal).eq('pertemuan_ke', pertemuan);
        if(error) throw error;
        alert('Riwayat berhasil dihapus.');
        loadRiwayatKelas(idKelas); 
    } catch(e) { alert('Gagal hapus: '+e.message); }
};

// ================= TAB 2: LOGIKA PRESENSI SHOLAT =================
window.bukaFormAbsenSholat = async function() {
    const idKelas = document.getElementById('pilih-kelas-absen-sholat').value;
    if (!idKelas) {
        document.getElementById('area-riwayat-sholat').style.display = 'none';
        return;
    }

    editModeSholat = null;
    document.getElementById('btn-simpan-absen-sholat').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Transmit Presensi Sholat';
    document.getElementById('input-tgl-absen-sholat').valueAsDate = new Date(); 
    document.getElementById('filter-gender-sholat').value = 'Semua'; 

    const container = document.getElementById('tempat-list-absen-sholat');
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#007bff;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar siswa...</div>';
    document.getElementById('area-absen-sholat').style.display = 'block';

    try {
        const { data, error } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas).order('nomor_absen', { ascending: true });
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#8fa0b3;">Belum ada siswa.</div>';
            return;
        }

        data.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));
        dataSiswaAbsenSholat = data.map(item => ({ id_siswa: item.id_siswa, kehadiran: 'SH', keterangan: '' }));

        let htmlContent = '';
        data.forEach((item, index) => {
            const jk = item.siswa.jenis_kelamin;
            const ikonGender = jk === 'L' ? '<i class="fa-solid fa-mars" style="color:#007bff; font-size:10px;"></i>' : (jk === 'P' ? '<i class="fa-solid fa-venus" style="color:#e83e8c; font-size:10px;"></i>' : '');

            htmlContent += `
                <div class="absen-card absen-card-sholat" data-jk="${jk}">
                    <span class="absen-no">${item.nomor_absen || '-'}</span>
                    <span class="absen-nama" title="${item.siswa.nama_siswa}">${item.siswa.nama_siswa} ${ikonGender}</span>
                    
                    <div class="opsi-group" id="kg-sholat-${index}">
                        <div class="btn-opsi active btn-sh" onclick="pilihKehadiranSholat(${index}, 'SH')">SH</div>
                        <div class="btn-opsi btn-ts" onclick="pilihKehadiranSholat(${index}, 'TS')">TS</div>
                        <div class="btn-opsi btn-izin" onclick="pilihKehadiranSholat(${index}, 'I')">I</div>
                        <div class="btn-opsi btn-sakit" onclick="pilihKehadiranSholat(${index}, 'S')">S</div>
                        <div class="btn-opsi btn-alpa" onclick="pilihKehadiranSholat(${index}, 'A')">A</div>
                        <div class="btn-opsi btn-hd" onclick="pilihKehadiranSholat(${index}, 'HD')">HD</div>
                        <div class="btn-opsi btn-strip" onclick="pilihKehadiranSholat(${index}, '-')">-</div>
                    </div>
                    
                    <input type="text" id="ket-sholat-${index}" class="input-ket-sholat" placeholder="Ket..." onkeyup="inputKetSholat(${index}, this.value)">
                </div>
            `;
        });
        container.innerHTML = htmlContent;
        loadRiwayatSholat(idKelas);
    } catch (error) {
        container.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Gagal: ${error.message}</div>`;
    }
};

window.terapkanFilterSholat = function() {
    const filterVal = document.getElementById('filter-gender-sholat').value;
    const cards = document.querySelectorAll('.absen-card-sholat');
    
    cards.forEach(card => {
        const jk = card.getAttribute('data-jk');
        if (filterVal === 'Semua' || filterVal === jk) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};

window.pilihKehadiranSholat = function(indexSiswa, status) {
    dataSiswaAbsenSholat[indexSiswa].kehadiran = status;
    const grpHadir = document.getElementById(`kg-sholat-${indexSiswa}`);
    const btnsHadir = grpHadir.querySelectorAll('.btn-opsi');
    btnsHadir.forEach(btn => btn.classList.remove('active'));
    
    const classMap = { 'SH': 'btn-sh', 'TS': 'btn-ts', 'I': 'btn-izin', 'S': 'btn-sakit', 'A': 'btn-alpa', 'HD': 'btn-hd', '-': 'btn-strip' };
    btnsHadir.forEach(btn => { 
        if (btn.innerText === status && btn.classList.contains(classMap[status])) btn.classList.add('active'); 
    });
};

window.inputKetSholat = function(indexSiswa, value) {
    dataSiswaAbsenSholat[indexSiswa].keterangan = value;
};

window.simpanPresensiSholat = async function() {
    if (dataSiswaAbsenSholat.length === 0) return;
    const tgl = document.getElementById('input-tgl-absen-sholat').value;
    const nmSholat = document.getElementById('input-nama-sholat').value;
    const idKelas = document.getElementById('pilih-kelas-absen-sholat').value;
    
    if (!tgl || !nmSholat) { alert("Tanggal dan Nama Sholat harus diisi!"); return; }

    const btn = document.getElementById('btn-simpan-absen-sholat');
    const teksAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        if (editModeSholat) {
            await supabase.from('absensholat').delete().eq('id_kelas', idKelas).eq('tanggal', editModeSholat.tanggal).eq('nama_sholat', editModeSholat.nama_sholat);
        }

        const payloadInsert = dataSiswaAbsenSholat.map(item => ({
            id_kelas: idKelas, id_siswa: item.id_siswa, tanggal: tgl,
            nama_sholat: nmSholat, kehadiran: item.kehadiran, keterangan: item.keterangan || null 
        }));

        const { error } = await supabase.from('absensholat').insert(payloadInsert);
        if (error) throw error;

        alert(`Berhasil menyimpan presensi sholat ${nmSholat} untuk ${payloadInsert.length} siswa!`);
        bukaFormAbsenSholat(); 
    } catch (error) {
        alert("Gagal menyimpan presensi sholat! " + error.message);
    } finally {
        btn.innerHTML = teksAsli;
        btn.disabled = false;
    }
};

window.loadRiwayatSholat = async function(idKelas) {
    const container = document.getElementById('tempat-riwayat-sholat');
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';
    document.getElementById('area-riwayat-sholat').style.display = 'block';

    const selSholat = document.getElementById('pilih-kelas-absen-sholat');
    const namaKelas = selSholat.options[selSholat.selectedIndex].text;

    try {
        const { data, error } = await supabase.from('absensholat').select('tanggal, nama_sholat, kehadiran').eq('id_kelas', idKelas);
        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<li style="color:#8fa0b3; font-size:12px; padding:10px 0;">Belum ada riwayat.</li>';
            return;
        }

        const grouped = {};
        data.forEach(item => {
            const key = `${item.tanggal}|${item.nama_sholat}`;
            if(!grouped[key]) grouped[key] = { tanggal: item.tanggal, sholat: item.nama_sholat, SH:0, TS:0, I:0, S:0, A:0, HD:0, strip:0 };
            if(item.kehadiran === '-') grouped[key].strip++;
            else if(grouped[key][item.kehadiran] !== undefined) grouped[key][item.kehadiran]++;
        });

        const sortedKeys = Object.keys(grouped).sort((a,b) => new Date(grouped[b].tanggal) - new Date(grouped[a].tanggal));
        
        let html = '';
        sortedKeys.forEach(k => {
            const g = grouped[k];
            // PERUBAHAN UI RIWAYAT 2 BARIS (SHOLAT)
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:8px; padding: 12px; background: rgba(255,255,255,0.7); border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                <!-- Baris 1: Judul & Tanggal -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <b style="color:#0ea5e9; font-size:12px;"><i class="fa-solid fa-mosque" style="margin-right:4px;"></i> ${namaKelas} (${g.sholat})</b>
                    <span style="font-size:10px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;"><i class="fa-regular fa-calendar"></i> ${g.tanggal}</span>
                </div>
                
                <!-- Baris 2: Indikator & Aksi -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="font-size:9px; background:rgba(14,165,233,0.05); padding:5px 8px; border-radius:6px; font-weight:800; display:flex; gap:6px; border:1px solid rgba(14,165,233,0.1); overflow-x:auto; white-space:nowrap; scrollbar-width:none; flex:1;">
                        <span style="color:#10b981;">SH:${g.SH}</span>
                        <span style="color:#ef4444;">TS:${g.TS}</span>
                        <span style="color:#0ea5e9;">I:${g.I}</span>
                        <span style="color:#f59e0b;">S:${g.S}</span>
                        <span style="color:#ef4444;">A:${g.A}</span>
                        <span style="color:#d946ef;">HD:${g.HD}</span>
                        <span style="color:#64748b;">-:${g.strip}</span>
                    </div>
                    <div style="display:flex; gap:6px; margin-left: 5px;">
                        <button onclick="editRiwayatSholat('${g.tanggal}', '${g.sholat}')" class="btn-action btn-edit" style="width: 28px; height: 28px; padding:0; justify-content:center;" title="Edit"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusRiwayatSholat('${g.tanggal}', '${g.sholat}')" class="btn-action btn-delete" style="width: 28px; height: 28px; padding:0; justify-content:center;" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </li>
            `;
        });
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = `<li style="color:red; font-size:11px;">Gagal memuat riwayat.</li>`;
    }
};

window.editRiwayatSholat = async function(tanggal, sholat) {
    const idKelas = document.getElementById('pilih-kelas-absen-sholat').value;
    document.getElementById('input-tgl-absen-sholat').value = tanggal;
    document.getElementById('input-nama-sholat').value = sholat;
    
    try {
        const { data, error } = await supabase.from('absensholat').select('*').eq('id_kelas', idKelas).eq('tanggal', tanggal).eq('nama_sholat', sholat);
        if(error) throw error;
        
        data.forEach(dbItem => {
            const index = dataSiswaAbsenSholat.findIndex(s => s.id_siswa === dbItem.id_siswa);
            if(index !== -1) {
                pilihKehadiranSholat(index, dbItem.kehadiran);
                const ketInput = document.getElementById(`ket-sholat-${index}`);
                if(ketInput) ketInput.value = dbItem.keterangan || '';
                dataSiswaAbsenSholat[index].keterangan = dbItem.keterangan || '';
            }
        });
        
        editModeSholat = { tanggal, nama_sholat: sholat };
        document.getElementById('btn-simpan-absen-sholat').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Perbarui Presensi Sholat';
        document.getElementById('area-absen-sholat').scrollIntoView({ behavior: 'smooth' });
    } catch(e) { alert('Gagal memuat data edit: ' + e.message); }
};

window.hapusRiwayatSholat = async function(tanggal, sholat) {
    if(!confirm(`Yakin MENGHAPUS presensi sholat ${sholat} tanggal ${tanggal}?`)) return;
    const idKelas = document.getElementById('pilih-kelas-absen-sholat').value;
    try {
        const {error} = await supabase.from('absensholat').delete().eq('id_kelas', idKelas).eq('tanggal', tanggal).eq('nama_sholat', sholat);
        if(error) throw error;
        alert('Riwayat berhasil dihapus.');
        loadRiwayatSholat(idKelas); 
    } catch(e) { alert('Gagal hapus: '+e.message); }
};