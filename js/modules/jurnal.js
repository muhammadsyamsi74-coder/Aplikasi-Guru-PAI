// js/modules/jurnal.js
import supabase from '../supabase.js';

let editModeMengajar = null;
let editModeSikap = null;
let editModeWali = null;

// ================= FUNGSI TAB & INISIALISASI =================
window.gantiTabJurnal = function(tabName) {
    const tabs = ['mengajar', 'sikap', 'wali'];
    tabs.forEach(t => {
        document.getElementById(`btn-tab-${t}`).classList.remove('active');
        document.getElementById(`tab-jurnal-${t}`).style.display = 'none';
    });
    document.getElementById(`btn-tab-${tabName}`).classList.add('active');
    document.getElementById(`tab-jurnal-${tabName}`).style.display = 'block';

    if(tabName === 'mengajar') loadRiwayatMengajar();
    else if(tabName === 'sikap') loadRiwayatSikap();
    else if(tabName === 'wali') loadRiwayatWali();
};

window.initJurnal = async function() {
    const selKelasForm = ['pilih-kelas-mengajar', 'pilih-kelas-sikap', 'pilih-kelas-wali'];
    const selKelasFilter = ['filter-riwayat-mengajar', 'filter-riwayat-sikap', 'filter-riwayat-wali'];
    
    // Set default tanggal hari ini pada semua tab
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('jm-tanggal')) document.getElementById('jm-tanggal').value = today;
    if(document.getElementById('js-tanggal')) document.getElementById('js-tanggal').value = today;
    if(document.getElementById('jw-tanggal')) document.getElementById('jw-tanggal').value = today;

    try {
        const { data, error } = await supabase.from('kelas').select('id, tingkat, nama_kelas').order('tingkat', { ascending: true }).order('nama_kelas', { ascending: true });
        if (error) throw error;

        let optForm = '<option value="">-- Pilih Kelas --</option>';
        let optFilter = '<option value="">Semua Kelas</option>';
        
        data.forEach(item => { 
            const opt = `<option value="${item.id}">${item.nama_kelas} (Kelas ${item.tingkat})</option>`;
            optForm += opt;
            optFilter += opt;
        });
        
        selKelasForm.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = optForm; });
        selKelasFilter.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = optFilter; });

        loadRiwayatMengajar();
    } catch (error) {
        console.error("Error load kelas jurnal:", error);
    }
};

window.batalkanEdit = function(tipe) {
    const today = new Date().toISOString().split('T')[0];
    if(tipe === 'mengajar') {
        editModeMengajar = null;
        document.getElementById('jm-tanggal').value = today;
        document.getElementById('jm-pertemuan').value = '';
        document.getElementById('jm-jam').value = '';
        document.getElementById('jm-judul').value = '';
        document.getElementById('jm-deskripsi').value = '';
        document.getElementById('jm-refleksi').value = '';
        document.getElementById('btn-simpan-mengajar').innerHTML = '<span style="flex:1; text-align:left;">Simpan Jurnal Mengajar</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-mengajar').style.display = 'none';
        
        setAutoPertemuanMengajar();
    } 
    else if(tipe === 'sikap') {
        editModeSikap = null;
        document.getElementById('js-tanggal').value = today;
        document.getElementById('js-deskripsi').value = '';
        document.getElementById('js-refleksi').value = '';
        document.getElementById('btn-simpan-sikap').innerHTML = '<span style="flex:1; text-align:left;">Simpan Jurnal Sikap</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-sikap').style.display = 'none';
        document.getElementById('wrap-check-all-sikap').style.display = 'flex';
        document.querySelectorAll('.check-siswa-sikap').forEach(cb => { cb.checked = false; cb.disabled = false; });
    }
    else if(tipe === 'wali') {
        editModeWali = null;
        document.getElementById('jw-tanggal').value = today;
        document.getElementById('jw-deskripsi').value = '';
        document.getElementById('jw-tindak').value = '';
        document.getElementById('jw-refleksi').value = '';
        document.getElementById('btn-simpan-wali').innerHTML = '<span style="flex:1; text-align:left;">Simpan Jurnal Wali</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-wali').style.display = 'none';
        document.getElementById('wrap-check-all-wali').style.display = 'flex';
        document.querySelectorAll('.check-siswa-wali').forEach(cb => { cb.checked = false; cb.disabled = false; });
    }
};

// ================= FUNGSI AUTO-PERTAMUAN & CHECKBOX =================
window.setAutoPertemuanMengajar = async function() {
    const idKelas = document.getElementById('pilih-kelas-mengajar').value;
    if (!idKelas || editModeMengajar) { return; }

    try {
        const { count, error } = await supabase
            .from('jurnalmengajar')
            .select('*', { count: 'exact', head: true })
            .eq('id_kelas', idKelas);

        if (error) throw error;
        
        const nextPertemuan = (count || 0) + 1;
        document.getElementById('jm-pertemuan').value = nextPertemuan;
    } catch (error) {
        console.error("Gagal mendapat auto pertemuan:", error);
    }
};

window.loadSiswaJurnal = async function(tipe) {
    const idKelas = document.getElementById(`pilih-kelas-${tipe}`).value;
    const area = document.getElementById(`area-${tipe}`);
    const container = document.getElementById(`list-siswa-${tipe}`);
    
    if (!idKelas) { area.style.display = 'none'; return; }

    area.style.display = 'block';
    container.innerHTML = '<div style="text-align:center; padding:10px; color:var(--neon-green);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat siswa...</div>';
    document.getElementById(`check-all-${tipe}`).checked = false;

    try {
        const { data, error } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas).order('nomor_absen', { ascending: true });
        if (error) throw error;

        data.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));

        let htmlContent = '';
        data.forEach((item, index) => {
            const ikonGender = item.siswa.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue);"></i>' : (item.siswa.jenis_kelamin === 'P' ? '<i class="fa-solid fa-venus" style="color:var(--neon-red);"></i>' : '');
            htmlContent += `
                <label class="student-checkbox-item" for="cb-${tipe}-${index}">
                    <input type="checkbox" id="cb-${tipe}-${index}" class="check-siswa-${tipe}" value="${item.id_siswa}">
                    <span>${item.nomor_absen || '-'} | ${item.siswa.nama_siswa} ${ikonGender}</span>
                </label>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        container.innerHTML = `<div style="color:var(--neon-red); text-align:center; padding:10px;">Gagal: ${error.message}</div>`;
    }
};

window.togglePilihSemua = function(tipe) {
    const masterCheck = document.getElementById(`check-all-${tipe}`).checked;
    document.querySelectorAll(`.check-siswa-${tipe}`).forEach(cb => { 
        if(!cb.disabled) cb.checked = masterCheck; 
    });
};

// ================= JURNAL MENGAJAR =================
window.simpanJurnalMengajar = async function() {
    const idKelas = document.getElementById('pilih-kelas-mengajar').value;
    const tanggal = document.getElementById('jm-tanggal').value;

    if(!idKelas) { alert('Pilih Kelas terlebih dahulu!'); return; }
    if(!tanggal) { alert('Tanggal harus diisi!'); return; }

    const btn = document.getElementById('btn-simpan-mengajar');
    const teksAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        const payload = {
            id_kelas: idKelas, 
            tanggal: tanggal,
            pertemuan_ke: document.getElementById('jm-pertemuan').value || null, 
            jam_ke: document.getElementById('jm-jam').value || null, 
            judul_materi: document.getElementById('jm-judul').value || null,
            deskripsi_materi: document.getElementById('jm-deskripsi').value || null,
            refleksi: document.getElementById('jm-refleksi').value || null
        };

        if(editModeMengajar) {
            const { error } = await supabase.from('jurnalmengajar').update(payload).eq('id', editModeMengajar);
            if (error) throw error;
            alert('Jurnal mengajar berhasil diperbarui!');
        } else {
            const { error } = await supabase.from('jurnalmengajar').insert([payload]);
            if (error) throw error;
            alert('Jurnal mengajar baru berhasil disimpan!');
        }

        batalkanEdit('mengajar');
        loadRiwayatMengajar();
    } catch (error) { alert("Gagal menyimpan: " + error.message); } 
    finally { btn.innerHTML = teksAsli; btn.disabled = false; }
};

window.loadRiwayatMengajar = async function() {
    const container = document.getElementById('list-riwayat-mengajar');
    const idKelasFilt = document.getElementById('filter-riwayat-mengajar').value;
    
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';

    try {
        let query = supabase.from('jurnalmengajar').select('*, kelas(nama_kelas)').order('tanggal', {ascending: false});
        if(idKelasFilt) query = query.eq('id_kelas', idKelasFilt);

        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) { container.innerHTML = '<li style="color:var(--text-abu); font-size:12px;">Belum ada riwayat.</li>'; return; }

        let html = '';
        data.forEach(d => {
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:6px;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <b style="color:var(--text-putih); font-size:13px;">${d.kelas.nama_kelas} - Pertemuan ${d.pertemuan_ke || '-'}</b>
                    <span style="font-size:11px; color:var(--text-abu);">${d.tanggal}</span>
                </div>
                <div style="font-size:11px; color:var(--text-abu);"><b>Jam:</b> ${d.jam_ke || '-'} | <b>Materi:</b> ${d.judul_materi || '-'}</div>
                <div style="display:flex; gap:8px; margin-top:5px; width: 100%; justify-content: flex-end;">
                    <button onclick="panggilEditMengajar('${d.id}')" class="btn-action btn-edit"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button onclick="hapusJurnal('jurnalmengajar', '${d.id}')" class="btn-action btn-delete"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </li>`;
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = `<li style="color:var(--neon-red); font-size:11px;">Gagal memuat.</li>`; }
};

window.panggilEditMengajar = async function(id) {
    try {
        const { data, error } = await supabase.from('jurnalmengajar').select('*').eq('id', id).single();
        if(error) throw error;
        
        document.getElementById('pilih-kelas-mengajar').value = data.id_kelas;
        document.getElementById('jm-tanggal').value = data.tanggal || '';
        document.getElementById('jm-pertemuan').value = data.pertemuan_ke || '';
        document.getElementById('jm-jam').value = data.jam_ke || '';
        document.getElementById('jm-judul').value = data.judul_materi || '';
        document.getElementById('jm-deskripsi').value = data.deskripsi_materi || '';
        document.getElementById('jm-refleksi').value = data.refleksi || '';
        
        editModeMengajar = id;
        document.getElementById('btn-simpan-mengajar').innerHTML = '<span style="flex:1; text-align:left;">Update Jurnal Mengajar</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-mengajar').style.display = 'block';
        document.getElementById('tab-jurnal-mengajar').scrollIntoView({behavior: 'smooth'});
    } catch(e) { alert("Gagal memuat data edit: " + e.message); }
};

// ================= JURNAL SIKAP =================
window.simpanJurnalSikap = async function() {
    const idKelas = document.getElementById('pilih-kelas-sikap').value;
    const tanggal = document.getElementById('js-tanggal').value;
    const checkboxes = document.querySelectorAll('.check-siswa-sikap:checked');
    
    if(!idKelas) { alert("Pilih kelas terlebih dahulu."); return; }
    if(!tanggal) { alert("Tanggal harus diisi."); return; }
    if(checkboxes.length === 0) { alert('Centang minimal 1 siswa!'); return; }

    const btn = document.getElementById('btn-simpan-sikap');
    const teksAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        const jenis = document.getElementById('js-jenis').value;
        const kategori = document.getElementById('js-kategori').value;
        const deskripsi = document.getElementById('js-deskripsi').value;
        const refleksi = document.getElementById('js-refleksi').value;

        if (editModeSikap) {
            const payload = {
                id_kelas: idKelas, tanggal: tanggal, jenis_sikap: jenis, kategori_sikap: kategori,
                deskripsi_sikap: deskripsi || null, refleksi_sikap: refleksi || null
            };
            const { error } = await supabase.from('jurnalsikap').update(payload).eq('id', editModeSikap);
            if (error) throw error;
            alert('Jurnal sikap berhasil diperbarui!');
        } else {
            let payloadInsert = [];
            checkboxes.forEach(cb => {
                payloadInsert.push({
                    tanggal: tanggal, id_kelas: idKelas, id_siswa: cb.value,
                    jenis_sikap: jenis, kategori_sikap: kategori,
                    deskripsi_sikap: deskripsi || null, refleksi_sikap: refleksi || null
                });
            });
            const { error } = await supabase.from('jurnalsikap').insert(payloadInsert);
            if (error) throw error;
            alert(`Jurnal sikap berhasil disimpan untuk ${payloadInsert.length} siswa!`);
        }

        batalkanEdit('sikap');
        loadRiwayatSikap();
    } catch (error) { alert("Gagal menyimpan: " + error.message); } 
    finally { btn.innerHTML = teksAsli; btn.disabled = false; }
};

window.loadRiwayatSikap = async function() {
    const container = document.getElementById('list-riwayat-sikap');
    const idKelasFilt = document.getElementById('filter-riwayat-sikap').value;
    const searchName = document.getElementById('search-nama-sikap').value.toLowerCase();
    
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';

    try {
        let query = supabase.from('jurnalsikap').select('*, kelas(nama_kelas), siswa!inner(nama_siswa)').order('tanggal', {ascending: false});
        if(idKelasFilt) query = query.eq('id_kelas', idKelasFilt);
        if(searchName) query = query.ilike('siswa.nama_siswa', `%${searchName}%`);

        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) { container.innerHTML = '<li style="color:var(--text-abu); font-size:12px;">Belum ada riwayat.</li>'; return; }

        let html = '';
        data.forEach(d => {
            const clr = d.jenis_sikap === 'Positif' ? 'var(--neon-green)' : 'var(--neon-red)';
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:6px;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <b style="color:var(--text-putih); font-size:13px;">${d.siswa.nama_siswa}</b>
                    <span style="font-size:11px; color:var(--text-abu);">${d.tanggal}</span>
                </div>
                <div style="font-size:11px; color:var(--text-abu);">${d.kelas.nama_kelas} | <b style="color:${clr}">${d.jenis_sikap}</b> - ${d.kategori_sikap}</div>
                <div style="display:flex; gap:8px; margin-top:5px; width: 100%; justify-content: flex-end;">
                    <button onclick="panggilEditSikap('${d.id}')" class="btn-action btn-edit"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button onclick="hapusJurnal('jurnalsikap', '${d.id}')" class="btn-action btn-delete"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </li>`;
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = `<li style="color:var(--neon-red); font-size:11px;">Gagal memuat.</li>`; }
};

window.panggilEditSikap = async function(id) {
    try {
        const { data, error } = await supabase.from('jurnalsikap').select('*').eq('id', id).single();
        if(error) throw error;
        
        document.getElementById('pilih-kelas-sikap').value = data.id_kelas;
        await loadSiswaJurnal('sikap'); 
        
        document.getElementById('wrap-check-all-sikap').style.display = 'none';
        document.querySelectorAll('.check-siswa-sikap').forEach(cb => {
            if(cb.value === data.id_siswa) cb.checked = true;
            else cb.checked = false;
            cb.disabled = true;
        });

        document.getElementById('js-tanggal').value = data.tanggal || '';
        document.getElementById('js-jenis').value = data.jenis_sikap;
        document.getElementById('js-kategori').value = data.kategori_sikap;
        document.getElementById('js-deskripsi').value = data.deskripsi_sikap || '';
        document.getElementById('js-refleksi').value = data.refleksi_sikap || '';
        
        editModeSikap = id;
        document.getElementById('btn-simpan-sikap').innerHTML = '<span style="flex:1; text-align:left;">Update Jurnal Sikap</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-sikap').style.display = 'block';
        document.getElementById('tab-jurnal-sikap').scrollIntoView({behavior: 'smooth'});
    } catch(e) { alert("Gagal memuat data edit: " + e.message); }
};

// ================= JURNAL WALI =================
window.simpanJurnalWali = async function() {
    const idKelas = document.getElementById('pilih-kelas-wali').value;
    const tanggal = document.getElementById('jw-tanggal').value;
    const checkboxes = document.querySelectorAll('.check-siswa-wali:checked');
    
    if(!idKelas) { alert("Pilih kelas terlebih dahulu."); return; }
    if(!tanggal) { alert("Tanggal harus diisi."); return; }
    if(checkboxes.length === 0) { alert('Centang minimal 1 siswa!'); return; }

    const btn = document.getElementById('btn-simpan-wali');
    const teksAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        const deskripsi = document.getElementById('jw-deskripsi').value;
        const tindak = document.getElementById('jw-tindak').value;
        const refleksi = document.getElementById('jw-refleksi').value;

        if(editModeWali) {
            const payload = { id_kelas: idKelas, tanggal: tanggal, deskripsi_pembinaan: deskripsi||null, tindak_lanjut: tindak||null, refleksi: refleksi||null };
            const { error } = await supabase.from('jurnalwali').update(payload).eq('id', editModeWali);
            if (error) throw error;
            alert('Jurnal wali berhasil diperbarui!');
        } else {
            let payloadInsert = [];
            checkboxes.forEach(cb => {
                payloadInsert.push({
                    tanggal: tanggal, id_kelas: idKelas, id_siswa: cb.value,
                    deskripsi_pembinaan: deskripsi || null, tindak_lanjut: tindak || null, refleksi: refleksi || null
                });
            });
            const { error } = await supabase.from('jurnalwali').insert(payloadInsert);
            if (error) throw error;
            alert(`Jurnal pembinaan wali berhasil disimpan untuk ${payloadInsert.length} siswa!`);
        }

        batalkanEdit('wali');
        loadRiwayatWali();
    } catch (error) { alert("Gagal menyimpan: " + error.message); } 
    finally { btn.innerHTML = teksAsli; btn.disabled = false; }
};

window.loadRiwayatWali = async function() {
    const container = document.getElementById('list-riwayat-wali');
    const idKelasFilt = document.getElementById('filter-riwayat-wali').value;
    const searchName = document.getElementById('search-nama-wali').value.toLowerCase();
    
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';

    try {
        let query = supabase.from('jurnalwali').select('*, kelas(nama_kelas), siswa!inner(nama_siswa)').order('tanggal', {ascending: false});
        if(idKelasFilt) query = query.eq('id_kelas', idKelasFilt);
        if(searchName) query = query.ilike('siswa.nama_siswa', `%${searchName}%`);

        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) { container.innerHTML = '<li style="color:var(--text-abu); font-size:12px;">Belum ada riwayat.</li>'; return; }

        let html = '';
        data.forEach(d => {
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:6px;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <b style="color:var(--text-putih); font-size:13px;">${d.siswa.nama_siswa}</b>
                    <span style="font-size:11px; color:var(--text-abu);">${d.tanggal}</span>
                </div>
                <div style="font-size:11px; color:var(--text-abu);">${d.kelas.nama_kelas}</div>
                <div style="display:flex; gap:8px; margin-top:5px; width: 100%; justify-content: flex-end;">
                    <button onclick="panggilEditWali('${d.id}')" class="btn-action btn-edit"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button onclick="hapusJurnal('jurnalwali', '${d.id}')" class="btn-action btn-delete"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </li>`;
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = `<li style="color:var(--neon-red); font-size:11px;">Gagal memuat.</li>`; }
};

window.panggilEditWali = async function(id) {
    try {
        const { data, error } = await supabase.from('jurnalwali').select('*').eq('id', id).single();
        if(error) throw error;
        
        document.getElementById('pilih-kelas-wali').value = data.id_kelas;
        await loadSiswaJurnal('wali'); 
        
        document.getElementById('wrap-check-all-wali').style.display = 'none';
        document.querySelectorAll('.check-siswa-wali').forEach(cb => {
            if(cb.value === data.id_siswa) cb.checked = true;
            else cb.checked = false;
            cb.disabled = true;
        });

        document.getElementById('jw-tanggal').value = data.tanggal || '';
        document.getElementById('jw-deskripsi').value = data.deskripsi_pembinaan || '';
        document.getElementById('jw-tindak').value = data.tindak_lanjut || '';
        document.getElementById('jw-refleksi').value = data.refleksi || '';
        
        editModeWali = id;
        document.getElementById('btn-simpan-wali').innerHTML = '<span style="flex:1; text-align:left;">Update Jurnal Wali</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-wali').style.display = 'block';
        document.getElementById('tab-jurnal-wali').scrollIntoView({behavior: 'smooth'});
    } catch(e) { alert("Gagal memuat data edit: " + e.message); }
};

// ================= GLOBAL DELETE =================
window.hapusJurnal = async function(tabel, id) {
    if(!confirm("Yakin ingin menghapus catatan jurnal ini?")) return;
    try {
        const { error } = await supabase.from(tabel).delete().eq('id', id);
        if(error) throw error;
        
        if(tabel === 'jurnalmengajar') loadRiwayatMengajar();
        else if(tabel === 'jurnalsikap') loadRiwayatSikap();
        else if(tabel === 'jurnalwali') loadRiwayatWali();
    } catch(e) { alert("Gagal menghapus: " + e.message); }
};