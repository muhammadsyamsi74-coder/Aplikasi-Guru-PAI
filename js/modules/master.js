// js/modules/master.js
import supabase from '../supabase.js';

// ================= DYNAMIC SCRIPT LOADER (XLSX) =================
window.loadSheetJS = function() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) return resolve();
        const script = document.createElement('script');
        // Ganti CDN ke jsdelivr yang jauh lebih tangguh dari blokir browser
        script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Gagal memuat library Excel. Periksa koneksi internet Anda."));
        document.head.appendChild(script);
    });
};

// ================= FUNGSI KELAS =================
window.toggleFormKelas = function() {
    const form = document.getElementById('wrapper-form-kelas');
    form.style.display = (form.style.display === 'none') ? 'block' : 'none';
    if(form.style.display === 'block') document.getElementById('form-tambah-kelas').reset();
};

window.loadDataKelas = async function() {
    const container = document.getElementById('tempat-data-kelas');
    container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--biru-dasar);">Memuat data... <i class="fa-solid fa-spinner fa-spin"></i></li>';

    try {
        const { data, error } = await supabase.from('kelas').select('*').order('tingkat', { ascending: true }).order('nama_kelas', { ascending: true });
        if (error) throw error;
        if (data.length === 0) {
            container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: #8fa0b3;">Belum ada data kelas.</li>';
            return;
        }

        let htmlContent = '';
        data.forEach(item => {
            htmlContent += `
                <li onclick="bukaDetailKelas('${item.id}', '${item.nama_kelas}')" style="cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='#f4f7f6'" onmouseout="this.style.background='transparent'">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-chalkboard" style="color: var(--biru-muda); font-size: 16px;"></i>
                        <span><b>${item.nama_kelas}</b> (Tingkat ${item.tingkat})</span>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color: #ced4da; font-size: 12px;"></i>
                </li>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        console.error("Error ambil data:", error);
        container.innerHTML = `<li style="display:block; text-align:center; color: red; padding: 10px;">Gagal: ${error.message}</li>`;
    }
};

window.simpanDataKelas = async function(event) {
    event.preventDefault();
    const inputTingkat = document.getElementById('input-tingkat').value;
    const inputNama = document.getElementById('input-nama-kelas').value;
    const inputTahun = document.getElementById('input-tahun-ajaran').value;
    const btnSimpan = document.getElementById('btn-simpan-kelas');
    const textAsli = btnSimpan.innerHTML;
    
    try {
        btnSimpan.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btnSimpan.disabled = true;

        const { error } = await supabase.from('kelas').insert([{ tingkat: inputTingkat, nama_kelas: inputNama, tahun_ajaran: inputTahun }]);
        if (error) throw error;
        document.getElementById('form-tambah-kelas').reset();
        document.getElementById('wrapper-form-kelas').style.display = 'none';
        alert('Data kelas berhasil ditambahkan!');
        window.loadDataKelas();
    } catch (error) {
        alert('Gagal menyimpan data! Pesan: ' + error.message);
    } finally {
        btnSimpan.innerHTML = textAsli;
        btnSimpan.disabled = false;
    }
};

// ================= FUNGSI SISWA =================
let currentKelasId = null;
let currentDataSiswa = []; 
let editingSiswaId = null; 
let editingAnggotaKelasId = null;

window.bukaDetailKelas = function(idKelas, namaKelas) {
    currentKelasId = idKelas;
    document.getElementById('judul-detail-kelas').innerText = "Data Siswa " + namaKelas;
    document.getElementById('panel-kelas').style.display = 'none';
    document.getElementById('panel-siswa').style.display = 'block';
    
    document.getElementById('wrapper-form-siswa').style.display = 'none';
    document.getElementById('wrapper-form-massal').style.display = 'none';
    
    loadDataSiswa();
};

window.tutupDetailKelas = function() {
    currentKelasId = null;
    document.getElementById('panel-siswa').style.display = 'none';
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
    container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: var(--biru-dasar);">Memuat data siswa... <i class="fa-solid fa-spinner fa-spin"></i></li>';

    try {
        const { data, error } = await supabase.from('anggota_kelas').select(`id, nomor_absen, jabatan_kelas, siswa (*)`).eq('id_kelas', currentKelasId);
        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<li style="display:block; text-align:center; padding: 10px; color: #8fa0b3;">Belum ada siswa di kelas ini.</li>';
            currentDataSiswa = [];
            return;
        }

        data.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));
        currentDataSiswa = data; 

        let htmlContent = '';
        data.forEach(item => {
            const dSiswa = item.siswa;
            const ikonGender = dSiswa.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:#007bff;"></i>' : '<i class="fa-solid fa-venus" style="color:#e83e8c;"></i>';
            const badgeJabatan = (item.jabatan_kelas && item.jabatan_kelas !== 'Anggota') 
                ? `<span style="background:var(--biru-muda); color:var(--biru-tua); font-size:9px; padding:2px 6px; border-radius:10px; margin-left:5px; font-weight:bold;">${item.jabatan_kelas}</span>` : '';
            const ikonFoto = dSiswa.foto_siswa ? '<i class="fa-solid fa-image" style="color:#28a745; font-size:10px; margin-left:5px;" title="Foto Tersedia"></i>' : '';

            htmlContent += `
                <li>
                    <div style="display: flex; align-items: center; gap: 10px; width:70%;">
                        <span style="font-weight:600; color:var(--biru-tua); width:20px;">${item.nomor_absen || '-'}</span>
                        <div>
                            <div style="font-size:13px; font-weight:500;">${dSiswa.nama_siswa} ${ikonGender} ${badgeJabatan} ${ikonFoto}</div>
                            <div style="font-size:10px; color:#8fa0b3;">NISN: ${dSiswa.nisn_siswa || '-'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editSiswa('${item.id}', '${dSiswa.id}')" class="btn-action btn-edit" title="Edit"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="hapusSiswa('${item.id}', '${dSiswa.id}', '${dSiswa.nama_siswa}')" class="btn-action btn-delete" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (error) {
        container.innerHTML = `<li style="display:block; text-align:center; color: red; padding: 10px;">Gagal: ${error.message}</li>`;
    }
};

window.editSiswa = function(idAnggota, idSiswa) {
    const dataRow = currentDataSiswa.find(row => row.id === idAnggota);
    if(!dataRow) return;

    const s = dataRow.siswa;
    
    document.getElementById('wrapper-form-massal').style.display = 'none';
    document.getElementById('wrapper-form-siswa').style.display = 'block';
    document.getElementById('judul-form-siswa').innerText = `Edit Data: ${s.nama_siswa}`;
    
    document.getElementById('input-nisn').value = s.nisn_siswa;
    document.getElementById('input-kode-siswa').value = s.kode_siswa || '';
    document.getElementById('input-nama-siswa').value = s.nama_siswa;
    document.getElementById('input-no-absen').value = dataRow.nomor_absen || '';
    document.getElementById('input-jk').value = s.jenis_kelamin;
    document.getElementById('input-jabatan').value = dataRow.jabatan_kelas || 'Anggota';
    document.getElementById('input-tempat-lahir').value = s.tempat_lahir || '';
    document.getElementById('input-tanggal-lahir').value = s.tanggal_lahir || '';
    document.getElementById('input-alamat').value = s.alamat_tinggal || '';
    document.getElementById('input-wa-siswa').value = s.whatsapp_siswa || '';
    document.getElementById('input-email-siswa').value = s.email_siswa || '';
    document.getElementById('input-wa-ortu').value = s.whatsapp_orangtua || '';
    document.getElementById('input-ig-siswa').value = s.instagram_siswa || '';
    document.getElementById('input-foto-siswa').value = '';

    editingSiswaId = idSiswa;
    editingAnggotaKelasId = idAnggota;
    
    document.getElementById('btn-simpan-siswa').innerHTML = '<i class="fa-solid fa-save"></i> Perbarui Data Siswa';
    document.getElementById('wrapper-form-siswa').scrollIntoView({behavior: "smooth"});
};

window.hapusSiswa = async function(idAnggota, idSiswa, namaSiswa) {
    if(!confirm(`Yakin ingin MENGHAPUS data siswa "${namaSiswa}"?\nData tidak dapat dikembalikan.`)) return;

    try {
        const { error: err1 } = await supabase.from('anggota_kelas').delete().eq('id', idAnggota);
        if(err1) throw err1;

        await supabase.from('siswa').delete().eq('id', idSiswa);
        alert(`Siswa ${namaSiswa} berhasil dihapus dari kelas.`);
        loadDataSiswa();
    } catch(err) {
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
                nomor_absen: iNoAbsen || null, jabatan_kelas: iJabatan
            }).eq('id', editingAnggotaKelasId);
            if (errAnggota) throw errAnggota;

            alert('Data siswa berhasil diperbarui!');
        } else {
            const { data: dataSiswa, error: errSiswa } = await supabase.from('siswa').insert([payloadSiswa]).select(); 
            if (errSiswa) throw errSiswa;
            
            const newSiswaId = dataSiswa[0].id;
            const { error: errAnggota } = await supabase.from('anggota_kelas').insert([{ 
                id_kelas: currentKelasId, id_siswa: newSiswaId, nomor_absen: iNoAbsen || null, jabatan_kelas: iJabatan
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

// ================= FUNGSI EXCEL (DOWNLOAD & UPLOAD) =================
window.downloadBlangkoExcel = async function() {
    const btn = document.getElementById('btn-download-blangko');
    const textAsli = btn ? btn.innerHTML : '';
    
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
        btn.disabled = true;
    }

    try {
        await window.loadSheetJS(); // Pastikan library termuat
        
        const headers = [["No Absen", "NISN", "Kode Siswa", "Nama Lengkap", "L/P", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Alamat", "WA Siswa", "Email Siswa", "WA Ortu", "Instagram", "Jabatan"]];
        
        const exampleData = [
            ["1", "1234567890", "K-01", "Budi Santoso", "L", "Jakarta", "2010-05-12", "Jl. Merdeka No 1", "08123456789", "budi@email.com", "08987654321", "@budi_s", "Ketua Kelas"],
            ["2", "0987654321", "", "Siti Aminah", "P", "Bandung", "2010-08-20", "Jl. Sudirman", "", "", "", "", "Anggota"]
        ];

        const dataSheet = [...headers, ...exampleData];
        const ws = window.XLSX.utils.aoa_to_sheet(dataSheet); // Gunakan referensi window eksak
        
        ws['!cols'] = [{wch: 8}, {wch: 15}, {wch: 10}, {wch: 25}, {wch: 5}, {wch: 15}, {wch: 25}, {wch: 30}, {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}];

        const wb = window.XLSX.utils.book_new();
        
        // Ambil nama kelas untuk penamaan file
        let namaKelas = "Baru";
        const elKelas = document.getElementById('judul-detail-kelas');
        if(elKelas) {
            namaKelas = elKelas.innerText.replace('Data Siswa ', '').trim();
        }
        
        window.XLSX.utils.book_append_sheet(wb, ws, "DataSiswa");
        
        // METODE BLOB ANCHOR (Tahan Banting di semua browser)
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