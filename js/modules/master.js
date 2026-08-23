// js/modules/master.js
import supabase from '../supabase.js';

// ================= DYNAMIC SCRIPT LOADER (XLSX) =================
window.loadSheetJS = function() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) return resolve();
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Gagal memuat library Excel. Periksa koneksi internet Anda."));
        document.head.appendChild(script);
    });
};

// ================= FUNGSI KELAS =================
let editingKelasId = null;
let currentListKelas = [];

window.toggleFormKelas = function() {
    const formWrapper = document.getElementById('wrapper-form-kelas');
    if (formWrapper.style.display === 'none') {
        formWrapper.style.display = 'block';
        document.getElementById('form-tambah-kelas').reset();
        document.getElementById('input-status-kelas').value = "true";
        editingKelasId = null;
        document.getElementById('judul-form-kelas').innerText = "Isi Data Kelas Baru";
        document.getElementById('btn-simpan-kelas').innerHTML = '<i class="fa-solid fa-save"></i> Simpan';
    } else {
        formWrapper.style.display = 'none';
    }
};

window.loadDataKelas = async function() {
    const container = document.getElementById('tempat-data-kelas');
    container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--neon-green);">Memuat data... <i class="fa-solid fa-spinner fa-spin"></i></li>';

    try {
        const { data, error } = await supabase.from('kelas').select('*').order('tingkat', { ascending: true }).order('nama_kelas', { ascending: true });
        if (error) throw error;
        if (data.length === 0) {
            container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--text-abu);">Belum ada data kelas.</li>';
            currentListKelas = [];
            return;
        }

        currentListKelas = data;
        let htmlContent = '';
        data.forEach(item => {
            const isAktif = item.status_kelas !== false;
            const badgeStatus = isAktif 
                ? '<span class="badge-status-kelas badge-status-aktif">Aktif</span>'
                : '<span class="badge-status-kelas badge-status-nonaktif">Tidak Aktif</span>';

            htmlContent += `
                <li style="transition: background 0.2s; padding: 10px 12px; border-radius: 8px;" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='transparent'">
                    <div onclick="bukaDetailKelas('${item.id}', '${item.nama_kelas}')" style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                        <i class="fa-solid fa-chalkboard" style="color: var(--neon-green); font-size: 16px;"></i>
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <b>${item.nama_kelas}</b> (Tingkat ${item.tingkat}) - ${item.tahun_ajaran || ''}
                            ${badgeStatus}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button onclick="editKelas('${item.id}')" class="btn-action btn-edit" title="Edit Kelas"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusKelas('${item.id}', '${item.nama_kelas}')" class="btn-action btn-delete" title="Hapus Kelas"><i class="fa-solid fa-trash"></i></button>
                        <i class="fa-solid fa-chevron-right" style="color: var(--text-abu); font-size: 12px; margin-left: 4px; cursor: pointer;" onclick="bukaDetailKelas('${item.id}', '${item.nama_kelas}')"></i>
                    </div>
                </li>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        console.error("Error ambil data:", error);
        container.innerHTML = `<li style="display:block; text-align:center; color: var(--neon-red); padding: 10px;">Gagal: ${error.message}</li>`;
    }
};

window.editKelas = function(idKelas) {
    const kls = currentListKelas.find(k => k.id === idKelas);
    if (!kls) return;

    editingKelasId = idKelas;
    document.getElementById('input-tingkat').value = kls.tingkat || '7';
    document.getElementById('input-nama-kelas').value = kls.nama_kelas || '';
    document.getElementById('input-tahun-ajaran').value = kls.tahun_ajaran || '2025/2026';
    document.getElementById('input-status-kelas').value = (kls.status_kelas !== false) ? 'true' : 'false';

    document.getElementById('judul-form-kelas').innerText = `Edit Kelas: ${kls.nama_kelas}`;
    document.getElementById('btn-simpan-kelas').innerHTML = '<i class="fa-solid fa-save"></i> Perbarui';
    document.getElementById('wrapper-form-kelas').style.display = 'block';
    document.getElementById('wrapper-form-kelas').scrollIntoView({ behavior: 'smooth' });
};

// ================= FITUR HAPUS KELAS BESERTA SELURUH DATA SISWA =================
window.hapusKelas = async function(idKelas, namaKelas) {
    const konfirmasi1 = confirm(
        `PERINGATAN!\n\nApakah Anda yakin ingin MENGHAPUS Kelas "${namaKelas}"?\nSemua data siswa, nilai, presensi, jurnal, dan tugas di kelas ini akan DIHAPUS PERMANEN.`
    );
    if (!konfirmasi1) return;

    const konfirmasi2 = prompt(`Ketik nama kelas "${namaKelas}" untuk mengonfirmasi penghapusan:`);
    if (konfirmasi2 !== namaKelas) {
        alert("Nama kelas yang Anda ketik tidak cocok. Penghapusan dibatalkan.");
        return;
    }

    try {
        const { data: anggota, error: errAnggota } = await supabase
            .from('anggota_kelas')
            .select('id_siswa')
            .eq('id_kelas', idKelas);
        if (errAnggota) throw errAnggota;

        const siswaIds = (anggota || []).map(a => a.id_siswa).filter(Boolean);

        const { data: listTugas } = await supabase
            .from('namatugas')
            .select('id')
            .eq('id_kelas', idKelas);
        const tugasIds = (listTugas || []).map(t => t.id).filter(Boolean);

        if (tugasIds.length > 0) {
            await supabase.from('penilaiantugas').delete().in('id_tugas', tugasIds);
        }

        await Promise.all([
            supabase.from('namatugas').delete().eq('id_kelas', idKelas),
            supabase.from('absenkelas').delete().eq('id_kelas', idKelas),
            supabase.from('penilaianmembaca').delete().eq('id_kelas', idKelas),
            supabase.from('penilaianmenulis').delete().eq('id_kelas', idKelas),
            supabase.from('penilaianhafalansholat').delete().eq('id_kelas', idKelas),
            supabase.from('hafalansurah').delete().eq('id_kelas', idKelas),
            supabase.from('jurnalmengajar').delete().eq('id_kelas', idKelas),
            supabase.from('jadwalmengajar').delete().eq('id_kelas', idKelas),
            supabase.from('anggota_kelas').delete().eq('id_kelas', idKelas)
        ]);

        if (siswaIds.length > 0) {
            await supabase.from('siswa').delete().in('id', siswaIds);
        }

        const { error: errDelKelas } = await supabase.from('kelas').delete().eq('id', idKelas);
        if (errDelKelas) throw errDelKelas;

        alert(`Kelas "${namaKelas}" beserta seluruh data di dalamnya berhasil dihapus.`);
        window.loadDataKelas();

    } catch (e) {
        console.error("Gagal hapus kelas:", e);
        alert("Gagal menghapus kelas: " + e.message);
    }
};

window.simpanDataKelas = async function(event) {
    event.preventDefault();
    const inputTingkat = document.getElementById('input-tingkat').value;
    const inputNama = document.getElementById('input-nama-kelas').value;
    const inputTahun = document.getElementById('input-tahun-ajaran').value;
    const inputStatus = document.getElementById('input-status-kelas').value === 'true';
    const btnSimpan = document.getElementById('btn-simpan-kelas');
    const textAsli = btnSimpan.innerHTML;
    
    try {
        btnSimpan.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btnSimpan.disabled = true;

        const payload = { 
            tingkat: inputTingkat, 
            nama_kelas: inputNama, 
            tahun_ajaran: inputTahun,
            status_kelas: inputStatus
        };

        if (editingKelasId) {
            const { error } = await supabase.from('kelas').update(payload).eq('id', editingKelasId);
            if (error) throw error;
            alert('Data kelas berhasil diperbarui!');
        } else {
            const { error } = await supabase.from('kelas').insert([payload]);
            if (error) throw error;
            alert('Data kelas baru berhasil ditambahkan!');
        }

        document.getElementById('form-tambah-kelas').reset();
        document.getElementById('wrapper-form-kelas').style.display = 'none';
        editingKelasId = null;
        window.loadDataKelas();
    } catch (error) {
        alert('Gagal menyimpan data! Pesan: ' + error.message);
    } finally {
        btnSimpan.innerHTML = textAsli;
        btnSimpan.disabled = false;
    }
};

// ================= FUNGSI SISWA MENGAJAR =================
let currentKelasId = null;
let currentDataSiswa = []; 
let editingSiswaId = null; 
let editingAnggotaKelasId = null;

window.bukaDetailKelas = function(idKelas, namaKelas) {
    currentKelasId = idKelas;
    document.getElementById('judul-detail-kelas').innerText = "Data Siswa " + namaKelas;
    document.getElementById('panel-kelas').style.display = 'none';
    document.getElementById('panel-wali').style.display = 'none';
    const pJadwal = document.getElementById('panel-jadwal');
    if (pJadwal) pJadwal.style.display = 'none';
    document.getElementById('panel-siswa').style.display = 'block';
    
    document.getElementById('wrapper-form-siswa').style.display = 'none';
    document.getElementById('wrapper-form-massal').style.display = 'none';
    
    loadDataSiswa();
};

window.tutupDetailKelas = function() {
    currentKelasId = null;
    document.getElementById('panel-siswa').style.display = 'none';
    document.getElementById('panel-wali').style.display = 'none';
    const pJadwal = document.getElementById('panel-jadwal');
    if (pJadwal) pJadwal.style.display = 'none';
    document.getElementById('panel-kelas').style.display = 'block';
};

window.toggleFormSiswa = function() {
    const formWrapper = document.getElementById('wrapper-form-siswa');
    document.getElementById('wrapper-form-massal').style.display = 'none';

    if (formWrapper.style.display === 'none') {
        formWrapper.style.display = 'block';
        document.getElementById('form-tambah-siswa').reset();
        editingSiswaId = null;
        editingAnggotaKelasId = null;
        document.getElementById('judul-form-siswa').innerText = "Tambah Siswa Baru";
        document.getElementById('btn-simpan-siswa').innerHTML = '<i class="fa-solid fa-save"></i> Simpan Data Siswa';
    } else {
        formWrapper.style.display = 'none';
    }
};

window.toggleFormMassal = function() {
    const formWrapper = document.getElementById('wrapper-form-massal');
    document.getElementById('wrapper-form-siswa').style.display = 'none';

    if (formWrapper.style.display === 'none') {
        formWrapper.style.display = 'block';
        document.getElementById('input-file-excel').value = '';
    } else {
        formWrapper.style.display = 'none';
    }
};

window.loadDataSiswa = async function() {
    const container = document.getElementById('tempat-data-siswa');
    container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--neon-green);">Memuat data siswa... <i class="fa-solid fa-spinner fa-spin"></i></li>';

    try {
        const { data, error } = await supabase.from('anggota_kelas').select(`id, nomor_absen, jabatan_kelas, siswa (*)`).eq('id_kelas', currentKelasId);
        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--text-abu);">Belum ada siswa di kelas ini.</li>';
            currentDataSiswa = [];
            return;
        }

        // 1. URUTKAN BERDASARKAN NOMOR ABSEN, JIKA ABSEN SAMA URUTKAN BERDASARKAN NAMA
        data.sort((a, b) => {
            const noA = (a.nomor_absen !== null && a.nomor_absen !== undefined && a.nomor_absen !== '') ? parseInt(a.nomor_absen) : 9999;
            const noB = (b.nomor_absen !== null && b.nomor_absen !== undefined && b.nomor_absen !== '') ? parseInt(b.nomor_absen) : 9999;
            
            if (noA !== noB) {
                return noA - noB;
            }
            const namaA = (a.siswa && a.siswa.nama_siswa) ? a.siswa.nama_siswa : '';
            const namaB = (b.siswa && b.siswa.nama_siswa) ? b.siswa.nama_siswa : '';
            return namaA.localeCompare(namaB);
        });

        currentDataSiswa = data; 

        let htmlContent = '';
        data.forEach(item => {
            const dSiswa = item.siswa || {};
            const namaTampil = dSiswa.nama_siswa || 'Tanpa Nama';
            const ikonGender = dSiswa.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue);"></i>' : '<i class="fa-solid fa-venus" style="color:var(--neon-red);"></i>';
            const badgeJabatan = (item.jabatan_kelas && item.jabatan_kelas !== 'Anggota') 
                ? `<span style="background:rgba(5,213,138,0.1); color:var(--neon-green); font-size:9px; padding:2px 6px; border-radius:10px; margin-left:5px; font-weight:bold;">${item.jabatan_kelas}</span>` : '';
            const ikonFoto = dSiswa.foto_siswa ? '<i class="fa-solid fa-image" style="color:var(--neon-green); font-size:10px; margin-left:5px;" title="Foto Tersedia"></i>' : '';

            // PERBAIKAN: Gunakan ID unik anggota_kelas untuk hapus agar kebal dari error karakter nama
            htmlContent += `
                <li>
                    <div style="display: flex; align-items: center; gap: 10px; width:70%;">
                        <span style="font-weight:600; color:var(--neon-green); width:24px; text-align:center;">${item.nomor_absen || '-'}</span>
                        <div>
                            <div style="font-size:13px; font-weight:500; color:var(--text-putih);">${namaTampil} ${ikonGender} ${badgeJabatan} ${ikonFoto}</div>
                            <div style="font-size:10px; color:var(--text-abu);">NISN: ${dSiswa.nisn_siswa || '-'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editSiswa('${item.id}')" class="btn-action btn-edit" title="Edit"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusSiswa('${item.id}')" class="btn-action btn-delete" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        container.innerHTML = `<li style="display:block; text-align:center; color: var(--neon-red); padding: 10px;">Gagal: ${error.message}</li>`;
    }
};

window.editSiswa = function(idAnggota) {
    const dataRow = currentDataSiswa.find(row => row.id === idAnggota);
    if (!dataRow) return;

    const s = dataRow.siswa || {};
    
    document.getElementById('wrapper-form-massal').style.display = 'none';
    document.getElementById('wrapper-form-siswa').style.display = 'block';
    document.getElementById('judul-form-siswa').innerText = `Edit Data: ${s.nama_siswa || ''}`;
    
    document.getElementById('input-nisn').value = s.nisn_siswa || '';
    document.getElementById('input-kode-siswa').value = s.kode_siswa || '';
    document.getElementById('input-nama-siswa').value = s.nama_siswa || '';
    document.getElementById('input-no-absen').value = dataRow.nomor_absen || '';
    document.getElementById('input-jk').value = s.jenis_kelamin || 'L';
    document.getElementById('input-jabatan').value = dataRow.jabatan_kelas || 'Anggota';
    document.getElementById('input-tempat-lahir').value = s.tempat_lahir || '';
    document.getElementById('input-tanggal-lahir').value = s.tanggal_lahir || '';
    document.getElementById('input-alamat').value = s.alamat_tinggal || '';
    document.getElementById('input-wa-siswa').value = s.whatsapp_siswa || '';
    document.getElementById('input-email-siswa').value = s.email_siswa || '';
    document.getElementById('input-wa-ortu').value = s.whatsapp_orangtua || '';
    document.getElementById('input-ig-siswa').value = s.instagram_siswa || '';
    document.getElementById('input-foto-siswa').value = '';

    editingSiswaId = s.id;
    editingAnggotaKelasId = idAnggota;
    
    document.getElementById('btn-simpan-siswa').innerHTML = '<i class="fa-solid fa-save"></i> Perbarui Data Siswa';
    document.getElementById('wrapper-form-siswa').scrollIntoView({ behavior: "smooth" });
};

// ================= PERBAIKAN: HAPUS SISWA BEBAS BUG DATA GANDA =================
window.hapusSiswa = async function(idAnggota) {
    const dataRow = currentDataSiswa.find(row => row.id === idAnggota);
    if (!dataRow) {
        alert("Data siswa tidak ditemukan.");
        return;
    }

    const s = dataRow.siswa || {};
    const namaSiswa = s.nama_siswa || 'Siswa ini';
    const idSiswa = s.id;

    if (!confirm(`Yakin ingin MENGHAPUS data "${namaSiswa}" dari kelas ini?\nData tidak dapat dikembalikan.`)) return;

    try {
        // 1. Hapus relasi keanggotaan kelas
        const { error: errAnggota } = await supabase.from('anggota_kelas').delete().eq('id', idAnggota);
        if (errAnggota) throw errAnggota;

        // 2. Hapus data pada tabel siswa jika ada
        if (idSiswa) {
            // Cek apakah siswa masih terdaftar di kelas lain
            const { data: checkLain } = await supabase.from('anggota_kelas').select('id').eq('id_siswa', idSiswa);
            if (!checkLain || checkLain.length === 0) {
                await supabase.from('siswa').delete().eq('id', idSiswa);
            }
        }

        alert(`Siswa "${namaSiswa}" berhasil dihapus.`);
        loadDataSiswa();
    } catch (err) {
        alert("Gagal menghapus data: " + err.message);
    }
};

window.simpanDataSiswa = async function(event) {
    event.preventDefault();
    
    const iNisn = document.getElementById('input-nisn').value;
    const iKode = document.getElementById('input-kode-siswa').value;
    const iNama = document.getElementById('input-nama-siswa').value;
    const iNoAbsen = document.getElementById('input-no-absen').value;
    const iJk = document.getElementById('input-jk').value;
    const iJabatan = document.getElementById('input-jabatan').value;
    const iTempatLahir = document.getElementById('input-tempat-lahir').value;
    const iTanggalLahir = document.getElementById('input-tanggal-lahir').value;
    const iAlamat = document.getElementById('input-alamat').value;
    const iWaSiswa = document.getElementById('input-wa-siswa').value;
    const iEmailSiswa = document.getElementById('input-email-siswa').value;
    const iWaOrtu = document.getElementById('input-wa-ortu').value;
    const iIgSiswa = document.getElementById('input-ig-siswa').value;
    
    const inputFoto = document.getElementById('input-foto-siswa');
    const fileFoto = inputFoto.files[0];
    
    const btn = document.getElementById('btn-simpan-siswa');
    const textAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
        btn.disabled = true;
        let fotoUrl = null;

        if (fileFoto) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah Foto...';
            const fileExt = fileFoto.name.split('.').pop();
            const fileName = `${iNisn}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('foto-siswa').upload(fileName, fileFoto);
            if (uploadError) throw new Error("Gagal mengunggah foto: " + uploadError.message);

            const { data: publicUrlData } = supabase.storage.from('foto-siswa').getPublicUrl(fileName);
            fotoUrl = publicUrlData.publicUrl;
        }

        const payloadSiswa = {
            nisn_siswa: iNisn, kode_siswa: iKode || null, nama_siswa: iNama, jenis_kelamin: iJk,
            tempat_lahir: iTempatLahir || null, tanggal_lahir: iTanggalLahir ? iTanggalLahir : null,
            alamat_tinggal: iAlamat || null, whatsapp_siswa: iWaSiswa || null, email_siswa: iEmailSiswa || null,
            whatsapp_orangtua: iWaOrtu || null, instagram_siswa: iIgSiswa || null
        };
        if(fotoUrl) payloadSiswa.foto_siswa = fotoUrl;

        if (editingSiswaId) {
            const { error: errSiswa } = await supabase.from('siswa').update(payloadSiswa).eq('id', editingSiswaId);
            if (errSiswa) throw errSiswa;

            const { error: errAnggota } = await supabase.from('anggota_kelas').update({
                nomor_absen: iNoAbsen ? parseInt(iNoAbsen) : null, jabatan_kelas: iJabatan
            }).eq('id', editingAnggotaKelasId);
            if (errAnggota) throw errAnggota;

            alert('Data siswa berhasil diperbarui!');
        } else {
            const { data: dataSiswa, error: errSiswa } = await supabase.from('siswa').insert([payloadSiswa]).select(); 
            if (errSiswa) throw errSiswa;
            
            const newSiswaId = dataSiswa[0].id;
            const { error: errAnggota } = await supabase.from('anggota_kelas').insert([{ 
                id_kelas: currentKelasId, id_siswa: newSiswaId, nomor_absen: iNoAbsen ? parseInt(iNoAbsen) : null, jabatan_kelas: iJabatan
            }]);
            if (errAnggota) throw errAnggota;

            alert('Data siswa baru berhasil ditambahkan!');
        }

        document.getElementById('wrapper-form-siswa').style.display = 'none';
        loadDataSiswa(); 
    } catch (error) {
        console.error("Error simpan:", error);
        alert('Gagal! ' + error.message);
    } finally {
        btn.innerHTML = textAsli;
        btn.disabled = false;
    }
};

// ================= FUNGSI SISWA GURU WALI =================
let editingSiswaWaliId = null;
let currentDataSiswaWali = [];

window.bukaPanelWali = function() {
    document.getElementById('panel-kelas').style.display = 'none';
    document.getElementById('panel-siswa').style.display = 'none';
    const pJadwal = document.getElementById('panel-jadwal');
    if (pJadwal) pJadwal.style.display = 'none';
    document.getElementById('panel-wali').style.display = 'block';
    
    document.getElementById('wrapper-form-siswa-wali').style.display = 'none';
    loadDataSiswaWali();
};

window.tutupPanelWali = function() {
    document.getElementById('panel-wali').style.display = 'none';
    document.getElementById('panel-siswa').style.display = 'none';
    const pJadwal = document.getElementById('panel-jadwal');
    if (pJadwal) pJadwal.style.display = 'none';
    document.getElementById('panel-kelas').style.display = 'block';
};

window.toggleFormSiswaWali = function() {
    const formWrapper = document.getElementById('wrapper-form-siswa-wali');
    if (formWrapper.style.display === 'none') {
        formWrapper.style.display = 'block';
        document.getElementById('form-tambah-siswa-wali').reset();
        editingSiswaWaliId = null;
        document.getElementById('judul-form-siswa-wali').innerText = "Tambah Siswa Guru Wali";
        document.getElementById('btn-simpan-siswa-wali').innerHTML = '<i class="fa-solid fa-save"></i> Simpan Data Wali';
    } else {
        formWrapper.style.display = 'none';
    }
};

window.loadDataSiswaWali = async function() {
    const container = document.getElementById('tempat-data-siswa-wali');
    container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--neon-purple);">Memuat data siswa wali... <i class="fa-solid fa-spinner fa-spin"></i></li>';

    try {
        const { data, error } = await supabase.from('siswaguruwali').select('*').order('nama_siswa', { ascending: true });
        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--text-abu);">Belum ada data siswa guru wali.</li>';
            currentDataSiswaWali = [];
            return;
        }

        currentDataSiswaWali = data;
        let htmlContent = '';
        data.forEach(item => {
            const ikonGender = item.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue);"></i>' : '<i class="fa-solid fa-venus" style="color:var(--neon-red);"></i>';
            const ikonFoto = item.foto_profil ? '<i class="fa-solid fa-image" style="color:var(--neon-purple); font-size:10px; margin-left:5px;" title="Foto Tersedia"></i>' : '';
            const badgeKelas = item.kelas_saatini ? `<span style="background:rgba(139,92,246,0.15); color:var(--neon-purple); font-size:9px; padding:2px 6px; border-radius:10px; margin-left:5px; font-weight:bold;">Kelas: ${item.kelas_saatini}</span>` : '';

            htmlContent += `
                <li>
                    <div style="display: flex; align-items: center; gap: 10px; width:70%;">
                        <div>
                            <div style="font-size:13px; font-weight:500; color:var(--text-putih);">${item.nama_siswa} ${ikonGender} ${badgeKelas} ${ikonFoto}</div>
                            <div style="font-size:10px; color:var(--text-abu);">NISN: ${item.nisn_siswa || '-'} | WA: ${item.no_wasiswa || '-'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editSiswaWali('${item.id}')" class="btn-action btn-edit" title="Edit"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusSiswaWali('${item.id}')" class="btn-action btn-delete" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        container.innerHTML = `<li style="display:block; text-align:center; color: var(--neon-red); padding: 10px;">Gagal: ${error.message}</li>`;
    }
};

window.editSiswaWali = function(id) {
    const s = currentDataSiswaWali.find(item => item.id === id);
    if (!s) return;

    editingSiswaWaliId = id;
    document.getElementById('wali-nisn').value = s.nisn_siswa || '';
    document.getElementById('wali-nama').value = s.nama_siswa || '';
    document.getElementById('wali-jk').value = s.jenis_kelamin || 'L';
    document.getElementById('wali-kelas').value = s.kelas_saatini || '';
    document.getElementById('wali-tempat-lahir').value = s.tempat_lahir || '';
    document.getElementById('wali-tanggal-lahir').value = s.tanggal_lahir || '';
    document.getElementById('wali-alamat').value = s.alat_tinggal || '';
    document.getElementById('wali-wasiswa').value = s.no_wasiswa || '';
    document.getElementById('wali-waortu').value = s.no_waorangtua || '';
    document.getElementById('wali-email').value = s.email || '';
    document.getElementById('wali-ig').value = s.instagram || '';
    document.getElementById('wali-foto').value = '';

    document.getElementById('judul-form-siswa-wali').innerText = `Edit Siswa Wali: ${s.nama_siswa}`;
    document.getElementById('btn-simpan-siswa-wali').innerHTML = '<i class="fa-solid fa-save"></i> Perbarui Data Wali';
    document.getElementById('wrapper-form-siswa-wali').style.display = 'block';
    document.getElementById('wrapper-form-siswa-wali').scrollIntoView({ behavior: 'smooth' });
};

window.hapusSiswaWali = async function(id) {
    const s = currentDataSiswaWali.find(item => item.id === id);
    const nama = s ? s.nama_siswa : 'siswa ini';
    if (!confirm(`Yakin ingin MENGHAPUS data siswa wali "${nama}"?`)) return;

    try {
        const { error } = await supabase.from('siswaguruwali').delete().eq('id', id);
        if (error) throw error;
        alert(`Siswa ${nama} berhasil dihapus dari data wali.`);
        loadDataSiswaWali();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
};

window.simpanDataSiswaWali = async function(event) {
    event.preventDefault();

    const iNisn = document.getElementById('wali-nisn').value;
    const iNama = document.getElementById('wali-nama').value;
    const iJk = document.getElementById('wali-jk').value;
    const iKelas = document.getElementById('wali-kelas').value;
    const iTempat = document.getElementById('wali-tempat-lahir').value;
    const iTanggal = document.getElementById('wali-tanggal-lahir').value;
    const iAlamat = document.getElementById('wali-alamat').value;
    const iWaSiswa = document.getElementById('wali-wasiswa').value;
    const iWaOrtu = document.getElementById('wali-waortu').value;
    const iEmail = document.getElementById('wali-email').value;
    const iIg = document.getElementById('wali-ig').value;

    const inputFoto = document.getElementById('wali-foto');
    const fileFoto = inputFoto.files[0];

    const btn = document.getElementById('btn-simpan-siswa-wali');
    const textAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;
        let fotoUrl = null;

        if (fileFoto) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah Foto...';
            const fileExt = fileFoto.name.split('.').pop();
            const fileName = `wali_${iNisn}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('foto-siswa').upload(fileName, fileFoto);
            if (uploadError) throw new Error("Gagal mengunggah foto: " + uploadError.message);

            const { data: publicUrlData } = supabase.storage.from('foto-siswa').getPublicUrl(fileName);
            fotoUrl = publicUrlData.publicUrl;
        }

        const payload = {
            nisn_siswa: iNisn,
            nama_siswa: iNama,
            jenis_kelamin: iJk,
            kelas_saatini: iKelas,
            tempat_lahir: iTempat || null,
            tanggal_lahir: iTanggal ? iTanggal : null,
            alat_tinggal: iAlamat || null,
            no_wasiswa: iWaSiswa || null,
            no_waorangtua: iWaOrtu || null,
            email: iEmail || null,
            instagram: iIg || null
        };
        if (fotoUrl) payload.foto_profil = fotoUrl;

        if (editingSiswaWaliId) {
            const { error } = await supabase.from('siswaguruwali').update(payload).eq('id', editingSiswaWaliId);
            if (error) throw error;
            alert('Data siswa wali berhasil diperbarui!');
        } else {
            const { error } = await supabase.from('siswaguruwali').insert([payload]);
            if (error) throw error;
            alert('Data siswa wali baru berhasil ditambahkan!');
        }

        document.getElementById('wrapper-form-siswa-wali').style.display = 'none';
        editingSiswaWaliId = null;
        loadDataSiswaWali();
    } catch (error) {
        alert('Gagal: ' + error.message);
    } finally {
        btn.innerHTML = textAsli;
        btn.disabled = false;
    }
};

window.downloadSiswaWaliExcel = async function() {
    const btn = document.getElementById('btn-download-wali');
    const textAsli = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan Data...';
        btn.disabled = true;
    }

    try {
        await window.loadSheetJS();

        const { data, error } = await supabase.from('siswaguruwali').select('*').order('nama_siswa', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            alert("Belum ada data siswa guru wali untuk didownload.");
            return;
        }

        const headers = [["No", "NISN", "Nama Siswa", "L/P", "Kelas Saat Ini", "Tempat Lahir", "Tanggal Lahir", "Alamat Tinggal", "WA Siswa", "WA Orang Tua", "Email", "Instagram"]];
        const reportData = data.map((s, idx) => [
            idx + 1, s.nisn_siswa || '-', s.nama_siswa || '-', s.jenis_kelamin || '-',
            s.kelas_saatini || '-', s.tempat_lahir || '-', s.tanggal_lahir || '-',
            s.alat_tinggal || '-', s.no_wasiswa || '-', s.no_waorangtua || '-',
            s.email || '-', s.instagram || '-'
        ]);

        const ws = window.XLSX.utils.aoa_to_sheet([...headers, ...reportData]);
        ws['!cols'] = [{wch: 5}, {wch: 15}, {wch: 25}, {wch: 5}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 15}];

        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "SiswaGuruWali");
        window.XLSX.writeFile(wb, `Data_Siswa_Guru_Wali.xlsx`);

    } catch (e) {
        alert("Gagal mendownload data siswa wali: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = textAsli;
            btn.disabled = false;
        }
    }
};

// ================= FUNGSI JADWAL MENGAJAR =================
let editingJadwalId = null;
let currentDataJadwal = [];

window.bukaPanelJadwal = async function() {
    document.getElementById('panel-kelas').style.display = 'none';
    document.getElementById('panel-siswa').style.display = 'none';
    document.getElementById('panel-wali').style.display = 'none';
    document.getElementById('panel-jadwal').style.display = 'block';
    
    document.getElementById('wrapper-form-jadwal').style.display = 'none';
    await loadOpsiKelasJadwal();
    loadDataJadwal();
};

window.tutupPanelJadwal = function() {
    document.getElementById('panel-jadwal').style.display = 'none';
    document.getElementById('panel-siswa').style.display = 'none';
    document.getElementById('panel-wali').style.display = 'none';
    document.getElementById('panel-kelas').style.display = 'block';
};

window.toggleFormJadwal = function() {
    const formWrapper = document.getElementById('wrapper-form-jadwal');
    if (formWrapper.style.display === 'none') {
        formWrapper.style.display = 'block';
        document.getElementById('form-tambah-jadwal').reset();
        editingJadwalId = null;
        document.getElementById('judul-form-jadwal').innerText = "Isi Data Jadwal Mengajar";
        document.getElementById('btn-simpan-jadwal').innerHTML = '<i class="fa-solid fa-save"></i> Simpan Jadwal';
    } else {
        formWrapper.style.display = 'none';
    }
};

async function loadOpsiKelasJadwal() {
    const sel = document.getElementById('jadwal-kelas');
    if (!sel) return;
    try {
        const { data, error } = await supabase.from('kelas').select('id, tingkat, nama_kelas').eq('status_kelas', true).order('tingkat').order('nama_kelas');
        if (error) throw error;
        let opt = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(k => { opt += `<option value="${k.id}">${k.nama_kelas} (Tingkat ${k.tingkat})</option>`; });
        sel.innerHTML = opt;
    } catch (e) {
        console.error("Gagal load opsi kelas jadwal:", e);
    }
}

window.loadDataJadwal = async function() {
    const container = document.getElementById('tempat-data-jadwal');
    container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--neon-yellow);">Memuat jadwal mengajar... <i class="fa-solid fa-spinner fa-spin"></i></li>';

    try {
        const { data, error } = await supabase
            .from('jadwalmengajar')
            .select(`id, id_kelas, hari, jam_ke, jumlah_jp, jam_mulai, jam_selesai, keterangan, kelas (nama_kelas, tingkat)`);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--text-abu);">Belum ada jadwal mengajar yang disetel.</li>';
            currentDataJadwal = [];
            return;
        }

        const urutanHari = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
        data.sort((a, b) => (urutanHari[a.hari] || 99) - (urutanHari[b.hari] || 99) || String(a.jam_ke).localeCompare(String(b.jam_ke)));
        currentDataJadwal = data;

        let htmlContent = '';
        data.forEach(item => {
            const namaKls = item.kelas ? item.kelas.nama_kelas : '-';
            const jamMulai = item.jam_mulai ? item.jam_mulai.substring(0, 5) : '';
            const jamSelesai = item.jam_selesai ? item.jam_selesai.substring(0, 5) : '';
            const rentangJam = (jamMulai && jamSelesai) ? `(${jamMulai} - ${jamSelesai})` : '';
            const ket = item.keterangan ? ` | ${item.keterangan}` : '';

            htmlContent += `
                <li>
                    <div style="display: flex; align-items: center; gap: 10px; width:75%;">
                        <div style="background: rgba(245, 158, 11, 0.15); color: var(--neon-yellow); font-weight:700; font-size:11px; padding:6px 10px; border-radius:8px; min-width:65px; text-align:center; border: 1px solid rgba(245, 158, 11, 0.3);">
                            ${item.hari}
                        </div>
                        <div>
                            <div style="font-size:13px; font-weight:600; color:var(--text-putih);">
                                Kelas ${namaKls} - <span style="color:var(--neon-green);">JP ${item.jam_ke}</span> (${item.jumlah_jp || 1} JP)
                            </div>
                            <div style="font-size:10px; color:var(--text-abu); margin-top:2px;">
                                <i class="fa-regular fa-clock"></i> ${rentangJam || 'Waktu belum diatur'} ${ket}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editJadwal('${item.id}')" class="btn-action btn-edit" title="Edit"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusJadwal('${item.id}', '${item.hari}', '${namaKls}')" class="btn-action btn-delete" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        container.innerHTML = `<li style="display:block; text-align:center; color: var(--neon-red); padding: 10px;">Gagal: ${error.message}</li>`;
    }
};

window.editJadwal = function(id) {
    const j = currentDataJadwal.find(item => item.id === id);
    if (!j) return;

    editingJadwalId = id;
    document.getElementById('jadwal-hari').value = j.hari || 'Senin';
    document.getElementById('jadwal-kelas').value = j.id_kelas || '';
    document.getElementById('jadwal-jam-ke').value = j.jam_ke || '';
    document.getElementById('jadwal-jumlah-jp').value = j.jumlah_jp || '1';
    document.getElementById('jadwal-jam-mulai').value = j.jam_mulai || '';
    document.getElementById('jadwal-jam-selesai').value = j.jam_selesai || '';
    document.getElementById('jadwal-keterangan').value = j.keterangan || '';

    document.getElementById('judul-form-jadwal').innerText = `Edit Jadwal: ${j.hari} (JP ${j.jam_ke})`;
    document.getElementById('btn-simpan-jadwal').innerHTML = '<i class="fa-solid fa-save"></i> Perbarui Jadwal';
    document.getElementById('wrapper-form-jadwal').style.display = 'block';
    document.getElementById('wrapper-form-jadwal').scrollIntoView({ behavior: 'smooth' });
};

window.hapusJadwal = async function(id, hari, namaKelas) {
    if (!confirm(`Yakin ingin MENGHAPUS jadwal mengajar ${hari} untuk Kelas ${namaKelas}?`)) return;

    try {
        const { error } = await supabase.from('jadwalmengajar').delete().eq('id', id);
        if (error) throw error;
        alert('Jadwal mengajar berhasil dihapus.');
        loadDataJadwal();
    } catch (err) {
        alert("Gagal menghapus jadwal: " + err.message);
    }
};

window.simpanDataJadwal = async function(event) {
    event.preventDefault();

    const hari = document.getElementById('jadwal-hari').value;
    const idKelas = document.getElementById('jadwal-kelas').value;
    const jamKe = document.getElementById('jadwal-jam-ke').value.trim();
    const jumlahJp = parseInt(document.getElementById('jadwal-jumlah-jp').value) || 1;
    const jamMulai = document.getElementById('jadwal-jam-mulai').value || null;
    const jamSelesai = document.getElementById('jadwal-jam-selesai').value || null;
    const keterangan = document.getElementById('jadwal-keterangan').value.trim() || null;

    if (!idKelas) { alert("Pilih kelas terlebih dahulu!"); return; }

    const btn = document.getElementById('btn-simpan-jadwal');
    const textAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        const payload = {
            id_kelas: idKelas,
            hari: hari,
            jam_ke: jamKe,
            jumlah_jp: jumlahJp,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            keterangan: keterangan
        };

        if (editingJadwalId) {
            const { error } = await supabase.from('jadwalmengajar').update(payload).eq('id', editingJadwalId);
            if (error) throw error;
            alert('Jadwal mengajar berhasil diperbarui!');
        } else {
            const { error } = await supabase.from('jadwalmengajar').insert([payload]);
            if (error) throw error;
            alert('Jadwal mengajar baru berhasil ditambahkan!');
        }

        document.getElementById('wrapper-form-jadwal').style.display = 'none';
        editingJadwalId = null;
        loadDataJadwal();
    } catch (error) {
        alert('Gagal menyimpan jadwal: ' + error.message);
    } finally {
        btn.innerHTML = textAsli;
        btn.disabled = false;
    }
};

// ================= FUNGSI EXCEL (DOWNLOAD & UPLOAD SISWA MENGAJAR) =================
window.downloadBlangkoExcel = async function() {
    const btn = document.getElementById('btn-download-blangko');
    const textAsli = btn ? btn.innerHTML : '';
    
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
        btn.disabled = true;
    }

    try {
        await window.loadSheetJS();
        
        const headers = [["No Absen", "NISN", "Kode Siswa", "Nama Lengkap", "L/P", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Alamat", "WA Siswa", "Email Siswa", "WA Ortu", "Instagram", "Jabatan"]];
        
        const exampleData = [
            ["1", "1234567890", "K-01", "Budi Santoso", "L", "Jakarta", "2010-05-12", "Jl. Merdeka No 1", "08123456789", "budi@email.com", "08987654321", "@budi_s", "Ketua Kelas"],
            ["2", "0987654321", "", "Siti Aminah", "P", "Bandung", "2010-08-20", "Jl. Sudirman", "", "", "", "", "Anggota"]
        ];

        const dataSheet = [...headers, ...exampleData];
        const ws = window.XLSX.utils.aoa_to_sheet(dataSheet);
        
        ws['!cols'] = [{wch: 8}, {wch: 15}, {wch: 10}, {wch: 25}, {wch: 5}, {wch: 15}, {wch: 25}, {wch: 30}, {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}];

        const wb = window.XLSX.utils.book_new();
        
        let namaKelas = "Baru";
        const elKelas = document.getElementById('judul-detail-kelas');
        if(elKelas) {
            namaKelas = elKelas.innerText.replace('Data Siswa ', '').trim();
        }
        
        window.XLSX.utils.book_append_sheet(wb, ws, "DataSiswa");
        
        const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Blangko_Siswa_${namaKelas}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch(e) {
        alert("Gagal mendownload blangko: " + e.message);
    } finally {
        if(btn) {
            btn.innerHTML = textAsli;
            btn.disabled = false;
        }
    }
};

window.simpanSiswaMassalExcel = async function() {
    const fileInput = document.getElementById('input-file-excel');
    const file = fileInput.files[0];
    
    if(!file) { 
        alert("Silakan pilih file Excel (.xlsx atau .xls) terlebih dahulu!"); 
        return; 
    }

    const btn = document.getElementById('btn-simpan-massal');
    const textAsli = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses Excel...';
    btn.disabled = true;

    try {
        await window.loadSheetJS();
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData = window.XLSX.utils.sheet_to_json(worksheet, {defval: ""});
                
                let sukses = 0;
                let gagal = 0;

                for (let row of jsonData) {
                    const nisn = String(row["NISN"]).trim();
                    const nama = String(row["Nama Lengkap"]).trim();
                    
                    if(!nisn || !nama) { gagal++; continue; }

                    let jk = String(row["L/P"]).trim().toUpperCase();
                    if(jk !== 'L' && jk !== 'P') jk = 'L';

                    let tglLahir = String(row["Tanggal Lahir (YYYY-MM-DD)"]).trim();
                    if(tglLahir && !tglLahir.match(/^\d{4}-\d{2}-\d{2}$/)) { tglLahir = null; }

                    let noAbsen = parseInt(row["No Absen"]);
                    if(isNaN(noAbsen)) noAbsen = null;

                    let jabatan = String(row["Jabatan"]).trim();
                    if(!jabatan) jabatan = "Anggota";

                    let idSiswaPasti = null;
                    const { data: existingSiswa } = await supabase.from('siswa').select('id').eq('nisn_siswa', nisn).maybeSingle();

                    if (existingSiswa) {
                        idSiswaPasti = existingSiswa.id;
                    } else {
                        const payloadSiswa = {
                            nisn_siswa: nisn, kode_siswa: row["Kode Siswa"] ? String(row["Kode Siswa"]).trim() : null,
                            nama_siswa: nama, jenis_kelamin: jk, tempat_lahir: row["Tempat Lahir"] ? String(row["Tempat Lahir"]).trim() : null,
                            tanggal_lahir: tglLahir || null, alamat_tinggal: row["Alamat"] ? String(row["Alamat"]).trim() : null,
                            whatsapp_siswa: row["WA Siswa"] ? String(row["WA Siswa"]).trim() : null,
                            email_siswa: row["Email Siswa"] ? String(row["Email Siswa"]).trim() : null,
                            whatsapp_orangtua: row["WA Ortu"] ? String(row["WA Ortu"]).trim() : null,
                            instagram_siswa: row["Instagram"] ? String(row["Instagram"]).trim() : null
                        };

                        const { data: newSiswa, error: errInsertSiswa } = await supabase.from('siswa').insert([payloadSiswa]).select();
                        if (errInsertSiswa) throw errInsertSiswa;
                        idSiswaPasti = newSiswa[0].id;
                    }

                    if (idSiswaPasti) {
                        const { data: existingAnggota } = await supabase.from('anggota_kelas').select('id').eq('id_kelas', currentKelasId).eq('id_siswa', idSiswaPasti).maybeSingle();

                        if (!existingAnggota) {
                            const { error: errAnggota } = await supabase.from('anggota_kelas').insert([{ 
                                id_kelas: currentKelasId, id_siswa: idSiswaPasti, nomor_absen: noAbsen, jabatan_kelas: jabatan 
                            }]);
                            if (errAnggota) throw errAnggota;
                            sukses++;
                        } else { gagal++; }
                    }
                }

                alert(`Proses Tambah Massal Excel Selesai!\n\n✅ Berhasil ditambahkan: ${sukses} siswa\n❌ Gagal / Dilewati: ${gagal} baris (Siswa sudah ada atau format salah)`);
                document.getElementById('input-file-excel').value = '';
                document.getElementById('wrapper-form-massal').style.display = 'none';
                loadDataSiswa();

            } catch (err) { alert("Terjadi kesalahan saat membaca file Excel: " + err.message); } 
            finally { btn.innerHTML = textAsli; btn.disabled = false; }
        };
        reader.readAsArrayBuffer(file);
    } catch(e) {
        alert("Gagal memuat sistem pemroses: " + e.message);
        btn.innerHTML = textAsli;
        btn.disabled = false;
    }
};

// ================= FITUR DOWNLOAD SEMUA DATA SISWA MENGAJAR =================
window.downloadSemuaSiswaExcel = async function() {
    const btn = document.getElementById('btn-download-semua-siswa');
    const textAsli = btn ? btn.innerHTML : '';
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan Data...';
        btn.disabled = true;
    }

    try {
        await window.loadSheetJS();

        const { data: listKelas, error: errKelas } = await supabase.from('kelas').select('*').order('tingkat', { ascending: true }).order('nama_kelas', { ascending: true });
        if (errKelas) throw errKelas;

        const { data: listSiswa, error: errSiswa } = await supabase.from('anggota_kelas').select(`nomor_absen, jabatan_kelas, id_kelas, siswa (*)`).order('nomor_absen', { ascending: true });
        if (errSiswa) throw errSiswa;

        const wb = window.XLSX.utils.book_new();
        const headers = [["No Absen", "NISN", "Kode Siswa", "Nama Lengkap", "L/P", "Tempat Lahir", "Tanggal Lahir", "Alamat", "WA Siswa", "Email Siswa", "WA Ortu", "Instagram", "Jabatan"]];

        if (listKelas && listKelas.length > 0) {
            listKelas.forEach(kls => {
                let anggotaKelas = listSiswa.filter(s => s.id_kelas === kls.id && s.siswa);
                
                // Urutkan berdasarkan nomor absen, lalu nama
                anggotaKelas.sort((a, b) => {
                    const noA = (a.nomor_absen !== null && a.nomor_absen !== undefined && a.nomor_absen !== '') ? parseInt(a.nomor_absen) : 9999;
                    const noB = (b.nomor_absen !== null && b.nomor_absen !== undefined && b.nomor_absen !== '') ? parseInt(b.nomor_absen) : 9999;
                    if (noA !== noB) return noA - noB;
                    return a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa);
                });

                let sheetData = [];
                if (anggotaKelas.length > 0) {
                    sheetData = anggotaKelas.map(item => {
                        const s = item.siswa;
                        return [
                            item.nomor_absen || '-', s.nisn_siswa || '-', s.kode_siswa || '-',
                            s.nama_siswa || '-', s.jenis_kelamin || '-', s.tempat_lahir || '-',
                            s.tanggal_lahir || '-', s.alamat_tinggal || '-', s.whatsapp_siswa || '-',
                            s.email_siswa || '-', s.whatsapp_orangtua || '-', s.instagram_siswa || '-',
                            item.jabatan_kelas || '-'
                        ];
                    });
                } else {
                    sheetData = [["(Belum ada siswa di kelas ini)"]];
                }

                const ws = window.XLSX.utils.aoa_to_sheet([...headers, ...sheetData]);
                ws['!cols'] = [{wch: 8}, {wch: 15}, {wch: 10}, {wch: 25}, {wch: 5}, {wch: 15}, {wch: 12}, {wch: 30}, {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}];
                
                let safeSheetName = kls.nama_kelas.replace(/[\\/?*\[\]]/g, '').substring(0, 31);
                window.XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
            });
        } else {
            alert("Belum ada kelas yang terdaftar.");
            return;
        }

        window.XLSX.writeFile(wb, `Data_Semua_Siswa_Lengkap.xlsx`);

    } catch (e) {
        alert("Gagal mendownload data siswa: " + e.message);
    } finally {
        if(btn) {
            btn.innerHTML = textAsli;
            btn.disabled = false;
        }
    }
};