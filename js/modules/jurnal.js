// js/modules/jurnal.js
import supabase from '../supabase.js';

let editModeMengajar = null;
let editModeSikap = null;
let editModeWali = null;
let modeInputSikap = 'kelas'; // 'kelas' atau 'manual'

// ================= FUNGSI TAB & INISIALISASI =================
window.gantiTabJurnal = function(tabName) {
    const tabs = ['mengajar', 'sikap', 'wali'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-tab-${t}`);
        const tab = document.getElementById(`tab-jurnal-${t}`);
        if (btn) btn.classList.remove('active');
        if (tab) tab.style.display = 'none';
    });
    
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    const activeTab = document.getElementById(`tab-jurnal-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');
    if (activeTab) activeTab.style.display = 'block';

    if (tabName === 'mengajar') loadRiwayatMengajar();
    else if (tabName === 'sikap') loadRiwayatSikap();
    else if (tabName === 'wali') {
        loadSiswaJurnal('wali');
        loadRiwayatWali();
    }
};

window.gantiModeInputSikap = function(mode) {
    modeInputSikap = mode;
    const btnKelas = document.getElementById('btn-mode-sikap-kelas');
    const btnManual = document.getElementById('btn-mode-sikap-manual');
    const wrapKelas = document.getElementById('wrap-sikap-mode-kelas');
    const wrapManual = document.getElementById('wrap-sikap-mode-manual');

    if (mode === 'kelas') {
        if (btnKelas) btnKelas.classList.add('active');
        if (btnManual) btnManual.classList.remove('active');
        if (wrapKelas) wrapKelas.style.display = 'block';
        if (wrapManual) wrapManual.style.display = 'none';
    } else {
        if (btnKelas) btnKelas.classList.remove('active');
        if (btnManual) btnManual.classList.add('active');
        if (wrapKelas) wrapKelas.style.display = 'none';
        if (wrapManual) wrapManual.style.display = 'block';
    }
};

window.initJurnal = async function() {
    const selKelasForm = ['pilih-kelas-mengajar', 'pilih-kelas-sikap'];
    const selKelasFilter = ['filter-riwayat-mengajar', 'filter-riwayat-sikap'];
    const selKelasRekap = ['rekap-kelas-mengajar', 'rekap-kelas-sikap'];
    
    const today = new Date().toISOString().split('T')[0];
    
    ['mengajar', 'sikap', 'wali'].forEach(t => {
        const prefix = t === 'mengajar' ? 'jm' : (t === 'sikap' ? 'js' : 'jw');
        const inpTgl = document.getElementById(`${prefix}-tanggal`);
        if (inpTgl) inpTgl.value = today;
        
        const rMul = document.getElementById(`rekap-mulai-${t}`);
        const rAkh = document.getElementById(`rekap-akhir-${t}`);
        if (rMul) rMul.value = today;
        if (rAkh) rAkh.value = today;
    });

    try {
        const { data, error } = await supabase
            .from('kelas')
            .select('id, tingkat, nama_kelas')
            .eq('status_kelas', true)
            .order('tingkat', { ascending: true })
            .order('nama_kelas', { ascending: true });

        if (error) throw error;

        let optForm = '<option value="">-- Pilih Kelas --</option>';
        let optFilter = '<option value="">Semua Kelas</option>';
        
        data.forEach(item => { 
            const opt = `<option value="${item.id}">${item.nama_kelas} (Kelas ${item.tingkat})</option>`;
            optForm += opt;
            optFilter += opt;
        });
        
        selKelasForm.forEach(id => { 
            const el = document.getElementById(id); 
            if (el) el.innerHTML = optForm; 
        });
        selKelasFilter.forEach(id => { 
            const el = document.getElementById(id); 
            if (el) el.innerHTML = optFilter; 
        });
        selKelasRekap.forEach(id => { 
            const el = document.getElementById(id); 
            if (el) el.innerHTML = optFilter; 
        });

        loadRiwayatMengajar();
    } catch (error) {
        console.error("Error load kelas jurnal:", error);
    }
};

window.batalkanEdit = function(tipe) {
    const today = new Date().toISOString().split('T')[0];
    if (tipe === 'mengajar') {
        editModeMengajar = null;
        if (document.getElementById('jm-tanggal')) document.getElementById('jm-tanggal').value = today;
        if (document.getElementById('jm-pertemuan')) document.getElementById('jm-pertemuan').value = '';
        if (document.getElementById('jm-jam')) document.getElementById('jm-jam').value = '';
        if (document.getElementById('jm-judul')) document.getElementById('jm-judul').value = '';
        if (document.getElementById('jm-deskripsi')) document.getElementById('jm-deskripsi').value = '';
        if (document.getElementById('jm-refleksi')) document.getElementById('jm-refleksi').value = '';
        
        const btn = document.getElementById('btn-simpan-mengajar');
        if (btn) btn.innerHTML = '<span style="flex:1; text-align:left;">Simpan Jurnal Mengajar</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        const cBtn = document.getElementById('btn-cancel-mengajar');
        if (cBtn) cBtn.style.display = 'none';
        
        setAutoPertemuanMengajar();
    } 
    else if (tipe === 'sikap') {
        editModeSikap = null;
        if (document.getElementById('js-tanggal')) document.getElementById('js-tanggal').value = today;
        if (document.getElementById('js-deskripsi')) document.getElementById('js-deskripsi').value = '';
        if (document.getElementById('js-refleksi')) document.getElementById('js-refleksi').value = '';
        if (document.getElementById('js-manual-nama')) document.getElementById('js-manual-nama').value = '';
        if (document.getElementById('js-manual-kelas')) document.getElementById('js-manual-kelas').value = '';
        
        const btn = document.getElementById('btn-simpan-sikap');
        if (btn) btn.innerHTML = '<span style="flex:1; text-align:left;">Simpan Jurnal Sikap</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        const cBtn = document.getElementById('btn-cancel-sikap');
        if (cBtn) cBtn.style.display = 'none';
        
        gantiModeInputSikap('kelas');
        const wrapCheck = document.getElementById('wrap-check-all-sikap');
        if (wrapCheck) wrapCheck.style.display = 'flex';
        document.querySelectorAll('.check-siswa-sikap').forEach(cb => { cb.checked = false; cb.disabled = false; });
    }
    else if (tipe === 'wali') {
        editModeWali = null;
        if (document.getElementById('jw-tanggal')) document.getElementById('jw-tanggal').value = today;
        if (document.getElementById('jw-deskripsi')) document.getElementById('jw-deskripsi').value = '';
        if (document.getElementById('jw-tindak')) document.getElementById('jw-tindak').value = '';
        if (document.getElementById('jw-refleksi')) document.getElementById('jw-refleksi').value = '';
        
        const btn = document.getElementById('btn-simpan-wali');
        if (btn) btn.innerHTML = '<span style="flex:1; text-align:left;">Simpan Jurnal Wali</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        const cBtn = document.getElementById('btn-cancel-wali');
        if (cBtn) cBtn.style.display = 'none';
        
        const wrapCheck = document.getElementById('wrap-check-all-wali');
        if (wrapCheck) wrapCheck.style.display = 'flex';
        document.querySelectorAll('.check-siswa-wali').forEach(cb => { cb.checked = false; cb.disabled = false; });
    }
};

// ================= FUNGSI AUTO-PERTEMUAN & CHECKBOX =================
window.setAutoPertemuanMengajar = async function() {
    const elKelas = document.getElementById('pilih-kelas-mengajar');
    if (!elKelas) return;
    const idKelas = elKelas.value;
    if (!idKelas || editModeMengajar) return;

    try {
        const { count, error } = await supabase
            .from('jurnalmengajar')
            .select('*', { count: 'exact', head: true })
            .eq('id_kelas', idKelas);

        if (error) throw error;
        
        const nextPertemuan = (count || 0) + 1;
        const inPertemuan = document.getElementById('jm-pertemuan');
        if (inPertemuan) inPertemuan.value = nextPertemuan;
    } catch (error) {
        console.error("Gagal mendapat auto pertemuan:", error);
    }
};

window.loadSiswaJurnal = async function(tipe) {
    const container = document.getElementById(`list-siswa-${tipe}`);
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding:10px; color:var(--neon-green);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat siswa...</div>';
    
    const checkAll = document.getElementById(`check-all-${tipe}`);
    if (checkAll) checkAll.checked = false;

    if (tipe === 'wali') {
        try {
            const { data, error } = await supabase
                .from('siswaguruwali')
                .select('id, nama_siswa, jenis_kelamin, kelas_saatini')
                .order('nama_siswa', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                container.innerHTML = '<div style="color:var(--text-abu); text-align:center; padding:10px;">Belum ada siswa guru wali di Master.</div>';
                return;
            }

            let htmlContent = '';
            data.forEach((item, index) => {
                const ikonGender = item.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue);"></i>' : '<i class="fa-solid fa-venus" style="color:var(--neon-red);"></i>';
                const kelasBadge = item.kelas_saatini ? `(${item.kelas_saatini})` : '';
                htmlContent += `
                    <label class="student-checkbox-item" for="cb-wali-${index}">
                        <input type="checkbox" id="cb-wali-${index}" class="check-siswa-wali" value="${item.id}">
                        <span>${item.nama_siswa} ${ikonGender} ${kelasBadge}</span>
                    </label>
                `;
            });
            container.innerHTML = htmlContent;
        } catch (error) {
            container.innerHTML = `<div style="color:var(--neon-red); text-align:center; padding:10px;">Gagal: ${error.message}</div>`;
        }
        return;
    }

    const elKelas = document.getElementById(`pilih-kelas-${tipe}`);
    const area = document.getElementById(`area-${tipe}`);
    if (!elKelas) return;
    
    const idKelas = elKelas.value;
    if (!idKelas) { 
        if (area) area.style.display = 'none'; 
        return; 
    }
    if (area) area.style.display = 'block';

    try {
        const { data, error } = await supabase
            .from('anggota_kelas')
            .select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`)
            .eq('id_kelas', idKelas)
            .order('nomor_absen', { ascending: true });

        if (error) throw error;

        data.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));

        let htmlContent = '';
        data.forEach((item, index) => {
            const ikonGender = item.siswa.jenis_kelamin === 'L' ? '<i class="fa-solid fa-mars" style="color:var(--neon-blue);"></i>' : '<i class="fa-solid fa-venus" style="color:var(--neon-red);"></i>';
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
    const masterCheck = document.getElementById(`check-all-${tipe}`);
    if (!masterCheck) return;
    document.querySelectorAll(`.check-siswa-${tipe}`).forEach(cb => { 
        if (!cb.disabled) cb.checked = masterCheck.checked; 
    });
};

// ================= JURNAL MENGAJAR =================
window.simpanJurnalMengajar = async function() {
    const elKelas = document.getElementById('pilih-kelas-mengajar');
    const elTgl = document.getElementById('jm-tanggal');
    if (!elKelas || !elKelas.value) { alert('Pilih Kelas terlebih dahulu!'); return; }
    if (!elTgl || !elTgl.value) { alert('Tanggal harus diisi!'); return; }

    const btn = document.getElementById('btn-simpan-mengajar');
    const teksAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        const payload = {
            id_kelas: elKelas.value, 
            tanggal: elTgl.value,
            pertemuan_ke: document.getElementById('jm-pertemuan').value || null, 
            jam_ke: document.getElementById('jm-jam').value || null, 
            judul_materi: document.getElementById('jm-judul').value || null,
            deskripsi_materi: document.getElementById('jm-deskripsi').value || null,
            refleksi: document.getElementById('jm-refleksi').value || null
        };

        if (editModeMengajar) {
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
    } catch (error) { 
        alert("Gagal menyimpan: " + error.message); 
    } finally { 
        btn.innerHTML = teksAsli; 
        btn.disabled = false; 
    }
};

window.loadRiwayatMengajar = async function() {
    const container = document.getElementById('list-riwayat-mengajar');
    if (!container) return;
    
    const elFilt = document.getElementById('filter-riwayat-mengajar');
    const idKelasFilt = elFilt ? elFilt.value : '';
    
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';

    try {
        let query = supabase.from('jurnalmengajar').select('*, kelas(nama_kelas)').order('tanggal', {ascending: false});
        if (idKelasFilt) query = query.eq('id_kelas', idKelasFilt);

        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) { 
            container.innerHTML = '<li style="color:var(--text-abu); font-size:12px;">Belum ada riwayat.</li>'; 
            return; 
        }

        let html = '';
        data.forEach(d => {
            const isDraft = (d.judul_materi && d.judul_materi.includes('[Draft]'));
            const isTugas = (d.judul_materi && d.judul_materi.includes('Penugasan Mandiri'));
            
            let statusBadge = '';
            if (isDraft) {
                statusBadge = '<span style="font-size:9px; color:#ef4444; font-weight:700; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid rgba(239, 68, 68, 0.2);"><i class="fa-solid fa-triangle-exclamation"></i> Perlu Diedit</span>';
            } else if (isTugas) {
                statusBadge = '<span style="font-size:9px; color:#8b5cf6; font-weight:700; background: rgba(139, 92, 246, 0.1); padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid rgba(139, 92, 246, 0.2);"><i class="fa-solid fa-book-bookmark"></i> Penugasan</span>';
            }

            html += `
            <li>
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div style="display:flex; align-items:center;">
                        <b style="color:#0f172a; font-size:12px;"><i class="fa-solid fa-chalkboard-user" style="color:var(--neon-blue); margin-right:4px;"></i> ${d.kelas ? d.kelas.nama_kelas : '-'} - Pert. ${d.pertemuan_ke || '-'}</b>
                        ${statusBadge}
                    </div>
                    <span style="font-size:9px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 3px 6px; border-radius: 4px;"><i class="fa-regular fa-calendar"></i> ${d.tanggal}</span>
                </div>
                <div style="font-size:10px; color:#475569; margin-top:2px;"><b>Jam:</b> ${d.jam_ke || '-'} | <b>Materi:</b> ${d.judul_materi || '-'}</div>
                <div style="display:flex; gap:6px; margin-top:4px; width: 100%; justify-content: flex-end;">
                    <button onclick="panggilEditMengajar('${d.id}')" class="btn-action btn-edit"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button onclick="hapusJurnal('jurnalmengajar', '${d.id}')" class="btn-action btn-delete"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </li>`;
        });
        container.innerHTML = html;
    } catch(e) { 
        container.innerHTML = `<li style="color:var(--neon-red); font-size:11px;">Gagal memuat.</li>`; 
    }
};

window.panggilEditMengajar = async function(id) {
    try {
        const { data, error } = await supabase.from('jurnalmengajar').select('*').eq('id', id).single();
        if (error) throw error;
        
        document.getElementById('pilih-kelas-mengajar').value = data.id_kelas;
        document.getElementById('jm-tanggal').value = data.tanggal || '';
        document.getElementById('jm-pertemuan').value = data.pertemuan_ke || '';
        document.getElementById('jm-jam').value = data.jam_ke || '';
        
        // Kosongkan judul jika masih berisi teks penanda draft otomatis
        const judul = data.judul_materi === '[Draft] Belum Mengisi Materi' ? '' : (data.judul_materi || '');
        document.getElementById('jm-judul').value = judul;
        document.getElementById('jm-deskripsi').value = data.deskripsi_materi || '';
        document.getElementById('jm-refleksi').value = data.refleksi || '';
        
        editModeMengajar = id;
        document.getElementById('btn-simpan-mengajar').innerHTML = '<span style="flex:1; text-align:left;">Update Jurnal Mengajar</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-mengajar').style.display = 'block';
        document.getElementById('tab-jurnal-mengajar').scrollIntoView({behavior: 'smooth'});
    } catch(e) { 
        alert("Gagal memuat data edit: " + e.message); 
    }
};

// ================= JURNAL SIKAP (DUAL MODE: KELAS & MANUAL) =================
window.simpanJurnalSikap = async function() {
    const elTgl = document.getElementById('js-tanggal');
    if (!elTgl || !elTgl.value) { alert("Tanggal harus diisi."); return; }

    const jenis = document.getElementById('js-jenis').value;
    const kategori = document.getElementById('js-kategori').value;
    const deskripsi = document.getElementById('js-deskripsi').value;
    const refleksi = document.getElementById('js-refleksi').value;

    const btn = document.getElementById('btn-simpan-sikap');
    const teksAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        if (editModeSikap) {
            const payload = {
                tanggal: elTgl.value, 
                jenis_sikap: jenis, 
                kategori_sikap: kategori,
                deskripsi_sikap: deskripsi || null, 
                refleksi_sikap: refleksi || null
            };
            const { error } = await supabase.from('jurnalsikap').update(payload).eq('id', editModeSikap);
            if (error) throw error;
            alert('Jurnal sikap berhasil diperbarui!');
        } 
        else if (modeInputSikap === 'manual') {
            const namaManual = document.getElementById('js-manual-nama').value.trim();
            const kelasManual = document.getElementById('js-manual-kelas').value.trim();
            if (!namaManual) { alert("Tuliskan nama siswa!"); return; }

            // Menyimpan nama dan kelas manual ke deskripsi kejadian
            const fullDeskripsi = `[${kelasManual || 'Luar Kelas'}] ${namaManual}: ${deskripsi || '-'}`;
            
            const payload = {
                tanggal: elTgl.value,
                id_kelas: null,
                id_siswa: null,
                jenis_sikap: jenis,
                kategori_sikap: kategori,
                deskripsi_sikap: fullDeskripsi,
                refleksi_sikap: refleksi || null
            };
            const { error } = await supabase.from('jurnalsikap').insert([payload]);
            if (error) throw error;
            alert(`Jurnal sikap untuk ${namaManual} berhasil disimpan!`);
        } 
        else {
            const elKelas = document.getElementById('pilih-kelas-sikap');
            const checkboxes = document.querySelectorAll('.check-siswa-sikap:checked');
            if (!elKelas || !elKelas.value) { alert("Pilih kelas terlebih dahulu."); return; }
            if (checkboxes.length === 0) { alert('Centang minimal 1 siswa!'); return; }

            let payloadInsert = [];
            checkboxes.forEach(cb => {
                payloadInsert.push({
                    tanggal: elTgl.value, 
                    id_kelas: elKelas.value, 
                    id_siswa: cb.value,
                    jenis_sikap: jenis, 
                    kategori_sikap: kategori,
                    deskripsi_sikap: deskripsi || null, 
                    refleksi_sikap: refleksi || null
                });
            });
            const { error } = await supabase.from('jurnalsikap').insert(payloadInsert);
            if (error) throw error;
            alert(`Jurnal sikap berhasil disimpan untuk ${payloadInsert.length} siswa!`);
        }

        batalkanEdit('sikap');
        loadRiwayatSikap();
    } catch (error) { 
        alert("Gagal menyimpan: " + error.message); 
    } finally { 
        btn.innerHTML = teksAsli; 
        btn.disabled = false; 
    }
};

window.loadRiwayatSikap = async function() {
    const container = document.getElementById('list-riwayat-sikap');
    if (!container) return;
    
    const elFilt = document.getElementById('filter-riwayat-sikap');
    const idKelasFilt = elFilt ? elFilt.value : '';
    const elSearch = document.getElementById('search-nama-sikap');
    const searchName = elSearch ? elSearch.value.toLowerCase() : '';
    
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';

    try {
        const [resJurnal, resSiswa, resKelas] = await Promise.all([
            supabase.from('jurnalsikap').select('*').order('tanggal', { ascending: false }),
            supabase.from('siswa').select('id, nama_siswa'),
            supabase.from('kelas').select('id, nama_kelas')
        ]);

        if (resJurnal.error) throw resJurnal.error;

        const dataJurnal = resJurnal.data || [];
        const mapSiswa = new Map((resSiswa.data || []).map(s => [s.id, s.nama_siswa]));
        const mapKelas = new Map((resKelas.data || []).map(k => [k.id, k.nama_kelas]));

        let formattedData = dataJurnal.map(d => {
            let nama = d.id_siswa ? (mapSiswa.get(d.id_siswa) || 'Siswa') : 'Siswa Luar Kelas';
            let kelas = d.id_kelas ? (mapKelas.get(d.id_kelas) || 'Kelas') : 'Luar Kelas';
            return { ...d, display_nama: nama, display_kelas: kelas };
        });

        if (idKelasFilt) {
            formattedData = formattedData.filter(d => d.id_kelas === idKelasFilt);
        }
        if (searchName) {
            formattedData = formattedData.filter(d => 
                d.display_nama.toLowerCase().includes(searchName) || 
                (d.deskripsi_sikap && d.deskripsi_sikap.toLowerCase().includes(searchName))
            );
        }

        if (formattedData.length === 0) { 
            container.innerHTML = '<li style="color:var(--text-abu); font-size:12px;">Belum ada riwayat jurnal sikap.</li>'; 
            return; 
        }

        let html = '';
        formattedData.forEach(d => {
            const clr = d.jenis_sikap === 'Positif' ? 'var(--neon-green)' : 'var(--neon-red)';
            html += `
            <li>
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <b style="color:#0f172a; font-size:12px;"><i class="fa-solid fa-user-check" style="color:${clr}; margin-right:4px;"></i> ${d.display_nama}</b>
                    <span style="font-size:9px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 3px 6px; border-radius: 4px;"><i class="fa-regular fa-calendar"></i> ${d.tanggal}</span>
                </div>
                <div style="font-size:10px; color:#475569; margin-top:2px;">${d.display_kelas} | <b style="color:${clr}">${d.jenis_sikap}</b> - ${d.kategori_sikap} | ${d.deskripsi_sikap || '-'}</div>
                <div style="display:flex; gap:6px; margin-top:4px; width: 100%; justify-content: flex-end;">
                    <button onclick="panggilEditSikap('${d.id}')" class="btn-action btn-edit"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button onclick="hapusJurnal('jurnalsikap', '${d.id}')" class="btn-action btn-delete"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </li>`;
        });
        container.innerHTML = html;
    } catch(e) { 
        container.innerHTML = `<li style="color:var(--neon-red); font-size:11px;">Gagal memuat: ${e.message}</li>`; 
    }
};

window.panggilEditSikap = async function(id) {
    try {
        const { data, error } = await supabase.from('jurnalsikap').select('*').eq('id', id).single();
        if (error) throw error;
        
        if (data.id_kelas) {
            gantiModeInputSikap('kelas');
            document.getElementById('pilih-kelas-sikap').value = data.id_kelas;
            await loadSiswaJurnal('sikap'); 
            
            const wrapCheck = document.getElementById('wrap-check-all-sikap');
            if (wrapCheck) wrapCheck.style.display = 'none';
            
            document.querySelectorAll('.check-siswa-sikap').forEach(cb => {
                if (cb.value === data.id_siswa) cb.checked = true;
                else cb.checked = false;
                cb.disabled = true;
            });
        } else {
            gantiModeInputSikap('manual');
        }

        document.getElementById('js-tanggal').value = data.tanggal || '';
        document.getElementById('js-jenis').value = data.jenis_sikap;
        document.getElementById('js-kategori').value = data.kategori_sikap;
        document.getElementById('js-deskripsi').value = data.deskripsi_sikap || '';
        document.getElementById('js-refleksi').value = data.refleksi_sikap || '';
        
        editModeSikap = id;
        document.getElementById('btn-simpan-sikap').innerHTML = '<span style="flex:1; text-align:left;">Update Jurnal Sikap</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        document.getElementById('btn-cancel-sikap').style.display = 'block';
        document.getElementById('tab-jurnal-sikap').scrollIntoView({behavior: 'smooth'});
    } catch(e) { 
        alert("Gagal memuat data edit: " + e.message); 
    }
};

// ================= JURNAL WALI (TERHUBUNG KE SISWAGURUWALI) =================
window.simpanJurnalWali = async function() {
    const elTgl = document.getElementById('jw-tanggal');
    const checkboxes = document.querySelectorAll('.check-siswa-wali:checked');
    
    if (!elTgl || !elTgl.value) { alert("Tanggal harus diisi."); return; }
    if (checkboxes.length === 0) { alert('Centang minimal 1 siswa!'); return; }

    const btn = document.getElementById('btn-simpan-wali');
    const teksAsli = btn.innerHTML;
    
    try {
        btn.innerHTML = '<span style="flex:1; text-align:left;"><i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...</span><div class="icon-circle"><i class="fa-solid fa-check"></i></div>';
        btn.disabled = true;

        const deskripsi = document.getElementById('jw-deskripsi').value;
        const tindak = document.getElementById('jw-tindak').value;
        const refleksi = document.getElementById('jw-refleksi').value;

        if (editModeWali) {
            const payload = { 
                tanggal: elTgl.value, 
                deskripsi_pembinaan: deskripsi || null, 
                tindak_lanjut: tindak || null, 
                refleksi: refleksi || null 
            };
            const { error } = await supabase.from('jurnalwali').update(payload).eq('id', editModeWali);
            if (error) throw error;
            alert('Jurnal wali berhasil diperbarui!');
        } else {
            let payloadInsert = [];
            checkboxes.forEach(cb => {
                payloadInsert.push({
                    tanggal: elTgl.value, 
                    id_siswa: cb.value,
                    id_kelas: null,
                    deskripsi_pembinaan: deskripsi || null, 
                    tindak_lanjut: tindak || null, 
                    refleksi: refleksi || null
                });
            });
            const { error } = await supabase.from('jurnalwali').insert(payloadInsert);
            if (error) throw error;
            alert(`Jurnal pembinaan wali berhasil disimpan untuk ${payloadInsert.length} siswa!`);
        }

        batalkanEdit('wali');
        loadRiwayatWali();
    } catch (error) { 
        alert("Gagal menyimpan: " + error.message); 
    } finally { 
        btn.innerHTML = teksAsli; 
        btn.disabled = false; 
    }
};

window.loadRiwayatWali = async function() {
    const container = document.getElementById('list-riwayat-wali');
    if (!container) return;
    
    const elSearch = document.getElementById('search-nama-wali');
    const searchName = elSearch ? elSearch.value.toLowerCase() : '';
    
    container.innerHTML = '<li><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</li>';

    try {
        const [resJurnal, resSiswa] = await Promise.all([
            supabase.from('jurnalwali').select('*').order('tanggal', { ascending: false }),
            supabase.from('siswaguruwali').select('id, nama_siswa, kelas_saatini')
        ]);

        if (resJurnal.error) throw resJurnal.error;
        if (resSiswa.error) throw resSiswa.error;

        const dataJurnal = resJurnal.data || [];
        const mapSiswa = new Map(resSiswa.data.map(s => [s.id, s]));

        let mergedData = dataJurnal.map(j => {
            const s = mapSiswa.get(j.id_siswa) || { nama_siswa: 'Siswa Tidak Ditemukan', kelas_saatini: '-' };
            return { ...j, siswa_wali: s };
        });

        if (searchName) {
            mergedData = mergedData.filter(d => d.siswa_wali.nama_siswa.toLowerCase().includes(searchName));
        }

        if (mergedData.length === 0) { 
            container.innerHTML = '<li style="color:var(--text-abu); font-size:12px;">Belum ada riwayat jurnal wali.</li>'; 
            return; 
        }

        let html = '';
        mergedData.forEach(d => {
            const kelasText = d.siswa_wali.kelas_saatini ? `Kelas ${d.siswa_wali.kelas_saatini}` : 'Bimbingan Wali';
            html += `
            <li>
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <b style="color:#0f172a; font-size:12px;"><i class="fa-solid fa-user-shield" style="color:var(--neon-purple); margin-right:4px;"></i> ${d.siswa_wali.nama_siswa}</b>
                    <span style="font-size:9px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 3px 6px; border-radius: 4px;"><i class="fa-regular fa-calendar"></i> ${d.tanggal}</span>
                </div>
                <div style="font-size:10px; color:#475569; margin-top:2px;">${kelasText} | <b>Pembinaan:</b> ${d.deskripsi_pembinaan || '-'}</div>
                <div style="display:flex; gap:6px; margin-top:4px; width: 100%; justify-content: flex-end;">
                    <button onclick="panggilEditWali('${d.id}')" class="btn-action btn-edit"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button onclick="hapusJurnal('jurnalwali', '${d.id}')" class="btn-action btn-delete"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </li>`;
        });
        container.innerHTML = html;
    } catch(e) { 
        container.innerHTML = `<li style="color:var(--neon-red); font-size:11px;">Gagal memuat: ${e.message}</li>`; 
    }
};

window.panggilEditWali = async function(id) {
    try {
        const { data, error } = await supabase.from('jurnalwali').select('*').eq('id', id).single();
        if (error) throw error;
        
        await loadSiswaJurnal('wali'); 
        
        const wrapCheck = document.getElementById('wrap-check-all-wali');
        if (wrapCheck) wrapCheck.style.display = 'none';
        
        document.querySelectorAll('.check-siswa-wali').forEach(cb => {
            if (cb.value === data.id_siswa) cb.checked = true;
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
    } catch(e) { 
        alert("Gagal memuat data edit: " + e.message); 
    }
};

// ================= GLOBAL DELETE =================
window.hapusJurnal = async function(tabel, id) {
    if (!confirm("Yakin ingin menghapus catatan jurnal ini?")) return;
    try {
        const { error } = await supabase.from(tabel).delete().eq('id', id);
        if (error) throw error;
        
        if (tabel === 'jurnalmengajar') loadRiwayatMengajar();
        else if (tabel === 'jurnalsikap') loadRiwayatSikap();
        else if (tabel === 'jurnalwali') loadRiwayatWali();
    } catch(e) { 
        alert("Gagal menghapus: " + e.message); 
    }
};

// ================= FITUR DOWNLOAD REKAP JURNAL =================
window.loadExportLibsJurnal = async function() {
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

window.downloadRekapJurnal = async function(tipe, format) {
    const elMul = document.getElementById(`rekap-mulai-${tipe}`);
    const elAkh = document.getElementById(`rekap-akhir-${tipe}`);
    const tglAwal = elMul ? elMul.value : '';
    const tglAkhir = elAkh ? elAkh.value : '';

    if (!tglAwal || !tglAkhir) { alert("Pilih rentang tanggal terlebih dahulu!"); return; }
    if (tglAwal > tglAkhir) { alert("Tanggal Awal tidak boleh lebih besar dari Tanggal Akhir!"); return; }

    try {
        alert(`Sedang menyusun rekap jurnal ${tipe.toUpperCase()}, mohon tunggu...`);
        await window.loadExportLibsJurnal();

        let headers = [];
        let reportData = [];
        let namaKelas = "Semua Kelas";
        let fileName = "";

        if (tipe === 'mengajar') {
            const elKls = document.getElementById('rekap-kelas-mengajar');
            const idKelas = elKls ? elKls.value : '';
            if (idKelas && elKls) {
                namaKelas = elKls.options[elKls.selectedIndex].text;
            }

            let query = supabase.from('jurnalmengajar').select('*, kelas(nama_kelas)').gte('tanggal', tglAwal).lte('tanggal', tglAkhir).order('tanggal', {ascending: true});
            if (idKelas) query = query.eq('id_kelas', idKelas);

            const { data, error } = await query;
            if (error) throw error;

            headers = [["No", "Tanggal", "Kelas", "Pertemuan", "Jam", "Judul Materi", "Deskripsi", "Refleksi"]];
            data.forEach((d, idx) => {
                reportData.push([idx + 1, d.tanggal, d.kelas ? d.kelas.nama_kelas : '-', d.pertemuan_ke || '-', d.jam_ke || '-', d.judul_materi || '-', d.deskripsi_materi || '-', d.refleksi || '-']);
            });
            fileName = `Rekap_Jurnal_MENGAJAR_${namaKelas.replace(/ /g, '_')}_${tglAwal}_sd_${tglAkhir}`;
        } 
        else if (tipe === 'sikap') {
            const elKls = document.getElementById('rekap-kelas-sikap');
            const idKelas = elKls ? elKls.value : '';
            if (idKelas && elKls) {
                namaKelas = elKls.options[elKls.selectedIndex].text;
            }

            const [resJurnal, resSiswa, resKelas] = await Promise.all([
                supabase.from('jurnalsikap').select('*').gte('tanggal', tglAwal).lte('tanggal', tglAkhir).order('tanggal', { ascending: true }),
                supabase.from('siswa').select('id, nama_siswa'),
                supabase.from('kelas').select('id, nama_kelas')
            ]);

            if (resJurnal.error) throw resJurnal.error;

            const mapSiswa = new Map((resSiswa.data || []).map(s => [s.id, s.nama_siswa]));
            const mapKelas = new Map((resKelas.data || []).map(k => [k.id, k.nama_kelas]));

            let listSikap = resJurnal.data || [];
            if (idKelas) {
                listSikap = listSikap.filter(d => d.id_kelas === idKelas);
            }

            headers = [["No", "Tanggal", "Kelas", "Nama Siswa", "Jenis", "Kategori", "Deskripsi Kejadian", "Tindak Lanjut / Refleksi"]];
            listSikap.forEach((d, idx) => {
                let nama = d.id_siswa ? (mapSiswa.get(d.id_siswa) || '-') : 'Siswa Luar Kelas';
                let kelas = d.id_kelas ? (mapKelas.get(d.id_kelas) || '-') : 'Luar Kelas';
                reportData.push([idx + 1, d.tanggal, kelas, nama, d.jenis_sikap, d.kategori_sikap || '-', d.deskripsi_sikap || '-', d.refleksi_sikap || '-']);
            });
            fileName = `Rekap_Jurnal_SIKAP_${namaKelas.replace(/ /g, '_')}_${tglAwal}_sd_${tglAkhir}`;
        } 
        else if (tipe === 'wali') {
            const [resJurnal, resSiswa] = await Promise.all([
                supabase.from('jurnalwali').select('*').gte('tanggal', tglAwal).lte('tanggal', tglAkhir).order('tanggal', {ascending: true}),
                supabase.from('siswaguruwali').select('id, nama_siswa, kelas_saatini')
            ]);

            if (resJurnal.error) throw resJurnal.error;
            if (resSiswa.error) throw resSiswa.error;

            const mapSiswa = new Map(resSiswa.data.map(s => [s.id, s]));

            headers = [["No", "Tanggal", "Kelas Saat Ini", "Nama Siswa Wali", "Deskripsi Pembinaan", "Tindak Lanjut", "Refleksi"]];
            resJurnal.data.forEach((d, idx) => {
                const sw = mapSiswa.get(d.id_siswa) || { nama_siswa: '-', kelas_saatini: '-' };
                reportData.push([idx + 1, d.tanggal, sw.kelas_saatini || '-', sw.nama_siswa || '-', d.deskripsi_pembinaan || '-', d.tindak_lanjut || '-', d.refleksi || '-']);
            });
            fileName = `Rekap_Jurnal_GURU_WALI_${tglAwal}_sd_${tglAkhir}`;
        }

        if (reportData.length === 0) {
            alert("Tidak ada data pada rentang tanggal tersebut.");
            return;
        }

        if (format === 'excel') {
            const ws = window.XLSX.utils.aoa_to_sheet([...headers, ...reportData]);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, `Rekap ${tipe}`);
            window.XLSX.writeFile(wb, `${fileName}.xlsx`);
        } 
        else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4');
            
            doc.setFontSize(14);
            doc.text(`Rekapitulasi Jurnal ${tipe.toUpperCase()}`, 40, 40);
            doc.setFontSize(10);
            doc.text(`Periode: ${tglAwal} s.d ${tglAkhir}`, 40, 60);

            doc.autoTable({
                startY: 75,
                head: headers,
                body: reportData,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [5, 213, 138], textColor: 255 } 
            });

            doc.save(`${fileName}.pdf`);
        }
    } catch (e) {
        alert("Gagal membuat rekapitulasi data: " + e.message);
    }
};