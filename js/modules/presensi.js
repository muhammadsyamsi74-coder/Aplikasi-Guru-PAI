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
    
    if (selKelas) selKelas.innerHTML = loadingText;
    if (selSholat) selSholat.innerHTML = loadingText;

    try {
        // HANYA MENGAMBIL KELAS DENGAN STATUS AKTIF (status_kelas = true)
        const { data, error } = await supabase
            .from('kelas')
            .select('id, tingkat, nama_kelas')
            .eq('status_kelas', true)
            .order('tingkat', { ascending: true })
            .order('nama_kelas', { ascending: true });
            
        if (error) throw error;

        let options = '<option value="">-- Pilih Kelas --</option>';
        data.forEach(item => { options += `<option value="${item.id}">${item.nama_kelas} (Kelas ${item.tingkat})</option>`; });
        
        if (selKelas) selKelas.innerHTML = options;
        if (selSholat) selSholat.innerHTML = options;
    } catch (error) {
        if (selKelas) selKelas.innerHTML = '<option value="">Gagal memuat kelas</option>';
        if (selSholat) selSholat.innerHTML = '<option value="">Gagal memuat kelas</option>';
    }
};

// ================= FUNGSI HITUNG REKAP (SUMMARY) =================
function hitungRekapKelas() {
    let h = 0, s = 0, i = 0, a = 0;
    dataSiswaAbsenKelas.forEach(item => {
        if(item.kehadiran === 'Hadir') h++;
        else if(item.kehadiran === 'Sakit') s++;
        else if(item.kehadiran === 'Izin') i++;
        else if(item.kehadiran === 'Alpa') a++;
    });
    const elH = document.getElementById('sum-m-h');
    const elS = document.getElementById('sum-m-s');
    const elI = document.getElementById('sum-m-i');
    const elA = document.getElementById('sum-m-a');
    
    if(elH) elH.innerText = h;
    if(elS) elS.innerText = s;
    if(elI) elI.innerText = i;
    if(elA) elA.innerText = a;
}

function hitungRekapSholat() {
    let sh = 0, ts = 0;
    dataSiswaAbsenSholat.forEach(item => {
        if(item.kehadiran === 'SH' || item.kehadiran === 'HD') sh++; 
        else if(item.kehadiran === 'TS' || item.kehadiran === 'S' || item.kehadiran === 'I' || item.kehadiran === 'A') ts++;
    });
    
    const elSh = document.getElementById('sum-s-sh');
    const elTs = document.getElementById('sum-s-ts');
    
    if(elSh) elSh.innerText = sh;
    if(elTs) elTs.innerText = ts;
}

// ================= TAB 1: LOGIKA PRESENSI KELAS =================
window.bukaFormAbsenKelas = async function() {
    const idKelas = document.getElementById('pilih-kelas-absen-kelas').value;
    if (!idKelas) {
        document.getElementById('area-riwayat-kelas').style.display = 'none';
        document.getElementById('area-rekap-kelas').style.display = 'none';
        return;
    }

    editModeKelas = null;
    document.getElementById('btn-simpan-absen-kelas').innerHTML = '<i class="fa-solid fa-save"></i> Simpan Data Presensi';
    document.getElementById('input-tgl-absen-kelas').valueAsDate = new Date(); 

    document.getElementById('area-rekap-kelas').style.display = 'block';
    const elMulaiK = document.getElementById('rekap-kelas-mulai');
    const elAkhirK = document.getElementById('rekap-kelas-akhir');
    if(elMulaiK && !elMulaiK.value) elMulaiK.valueAsDate = new Date();
    if(elAkhirK && !elAkhirK.value) elAkhirK.valueAsDate = new Date();

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
                    <div class="absen-info">
                        <div class="absen-no">${item.nomor_absen || '-'}</div>
                        <div class="absen-nama" title="${item.siswa.nama_siswa}">${item.siswa.nama_siswa} ${ikonGender}</div>
                    </div>
                    
                    <div class="opsi-row">
                        <div>
                            <div class="opsi-group" id="kg-hadir-${index}">
                                <div class="btn-opsi active btn-hadir" onclick="pilihKehadiranKelas(${index}, 'Hadir')">H</div>
                                <div class="btn-opsi btn-sakit" onclick="pilihKehadiranKelas(${index}, 'Sakit')">S</div>
                                <div class="btn-opsi btn-izin" onclick="pilihKehadiranKelas(${index}, 'Izin')">I</div>
                                <div class="btn-opsi btn-alpa" onclick="pilihKehadiranKelas(${index}, 'Alpa')">A</div>
                            </div>
                            
                            <div class="opsi-group" id="kg-quran-${index}">
                                <div class="btn-opsi btn-bawa" onclick="pilihQuranKelas(${index}, 'Bawa')">B</div>
                                <div class="btn-opsi btn-tbawa" onclick="pilihQuranKelas(${index}, 'Tidak Bawa')">T</div>
                                <div class="btn-opsi active btn-strip" onclick="pilihQuranKelas(${index}, 'Kosong')">-</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = htmlContent;
        hitungRekapKelas(); 
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
    
    hitungRekapKelas(); 
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
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:8px; padding: 12px; background: rgba(255,255,255,0.9); border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <b style="color:#0f172a; font-size:13px;"><i class="fa-solid fa-chalkboard-user" style="color:var(--neon-blue); margin-right:4px;"></i> ${namaKelas} (Pert. ${g.pertemuan})</b>
                    <span style="font-size:10px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;"><i class="fa-regular fa-calendar"></i> ${g.tanggal}</span>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="font-size:11px; background:#f8fafc; padding:5px 8px; border-radius:6px; font-weight:700; display:flex; gap:8px; border:1px solid #e2e8f0; color:#475569;">
                        <span style="color:#10b981;">H:${g.Hadir}</span>
                        <span style="color:#f59e0b;">S:${g.Sakit}</span>
                        <span style="color:#3b82f6;">I:${g.Izin}</span>
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
        document.getElementById('btn-simpan-absen-kelas').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Perbarui Data Presensi';
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
        document.getElementById('area-rekap-sholat').style.display = 'none';
        return;
    }

    editModeSholat = null;
    document.getElementById('btn-simpan-absen-sholat').innerHTML = '<i class="fa-solid fa-save"></i> Simpan Presensi Sholat';
    document.getElementById('input-tgl-absen-sholat').valueAsDate = new Date(); 
    
    document.getElementById('area-rekap-sholat').style.display = 'block';
    const elMulai = document.getElementById('rekap-sholat-mulai');
    const elAkhir = document.getElementById('rekap-sholat-akhir');
    if(elMulai && !elMulai.value) elMulai.valueAsDate = new Date();
    if(elAkhir && !elAkhir.value) elAkhir.valueAsDate = new Date();

    const filterEl = document.getElementById('filter-gender-sholat');
    if (filterEl) filterEl.value = 'Semua';

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
        dataSiswaAbsenSholat = data.map(item => ({ id_siswa: item.id_siswa, kehadiran: 'SH' }));

        let htmlContent = '';
        data.forEach((item, index) => {
            const jk = item.siswa.jenis_kelamin;
            const ikonGender = jk === 'L' ? '<i class="fa-solid fa-mars" style="color:#007bff; font-size:10px;"></i>' : (jk === 'P' ? '<i class="fa-solid fa-venus" style="color:#e83e8c; font-size:10px;"></i>' : '');

            const disableHD = (jk === 'L') ? 'pointer-events: none; opacity: 0.4;' : '';
            const clickHD = (jk === 'L') ? '' : `onclick="pilihKehadiranSholat(${index}, 'HD')"`;

            htmlContent += `
                <div class="absen-card absen-card-sholat" data-jk="${jk}">
                    <div class="absen-info">
                        <div class="absen-no">${item.nomor_absen || '-'}</div>
                        <div class="absen-nama" title="${item.siswa.nama_siswa}">${item.siswa.nama_siswa} ${ikonGender}</div>
                    </div>
                    
                    <div class="opsi-row">
                        <div>
                            <div class="opsi-group" id="kg-sholat-${index}">
                                <div class="btn-opsi active btn-sh" onclick="pilihKehadiranSholat(${index}, 'SH')">SH</div>
                                <div class="btn-opsi btn-ts" onclick="pilihKehadiranSholat(${index}, 'TS')">TS</div>
                                <div class="btn-opsi btn-izin" onclick="pilihKehadiranSholat(${index}, 'I')">I</div>
                                <div class="btn-opsi btn-sakit" onclick="pilihKehadiranSholat(${index}, 'S')">S</div>
                                <div class="btn-opsi btn-alpa" onclick="pilihKehadiranSholat(${index}, 'A')">A</div>
                                <div class="btn-opsi btn-hd" ${clickHD} style="${disableHD}">HD</div>
                                <div class="btn-opsi btn-strip" onclick="pilihKehadiranSholat(${index}, '-')">-</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = htmlContent;
        hitungRekapSholat(); 
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
            card.style.setProperty('display', 'flex', 'important');
        } else {
            card.style.setProperty('display', 'none', 'important');
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
    
    hitungRekapSholat(); 
};

window.simpanPresensiSholat = async function() {
    if (dataSiswaAbsenSholat.length === 0) {
        alert("Data siswa masih kosong!");
        return; 
    }
    
    const tgl = document.getElementById('input-tgl-absen-sholat').value;
    const idKelas = document.getElementById('pilih-kelas-absen-sholat').value;
    const nmSholatFinal = document.getElementById('input-nama-sholat').value; 
    
    if (!idKelas || idKelas === '') { 
        alert("Kelas belum dipilih secara valid! Silakan pilih ulang kelas."); 
        return; 
    }
    if (!tgl) { 
        alert("Tanggal wajib diisi!"); 
        return; 
    }

    const btn = document.getElementById('btn-simpan-absen-sholat');
    const teksAsli = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        if (editModeSholat) {
            await supabase.from('absensholat').delete()
                .eq('id_kelas', idKelas)
                .eq('tanggal', editModeSholat.tanggal)
                .eq('nama_sholat', editModeSholat.nama_sholat);
        }

        const payloadInsert = dataSiswaAbsenSholat
            .filter(item => item.id_siswa) 
            .map(item => ({
                id_kelas: idKelas, 
                id_siswa: item.id_siswa, 
                tanggal: tgl,
                nama_sholat: nmSholatFinal, 
                kehadiran: item.kehadiran
            }));
            
        if (payloadInsert.length === 0) throw new Error("Tidak ada data presensi siswa yang valid untuk disimpan.");

        const { error } = await supabase.from('absensholat').insert(payloadInsert);
        
        if (error) {
            console.error("Detail Error Supabase:", error);
            throw new Error(`${error.message} - ${error.details || ''} (Kode: ${error.code})`);
        }

        alert(`Berhasil menyimpan presensi sholat ${nmSholatFinal} untuk ${payloadInsert.length} siswa!`);
        bukaFormAbsenSholat(); 
    } catch (error) {
        alert("Gagal menyimpan presensi sholat!\n\nPesan Asli Supabase: " + error.message);
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
            if(!grouped[key]) grouped[key] = { tanggal: item.tanggal, sholat: item.nama_sholat, SH:0, TS:0 };
            if(item.kehadiran === 'SH' || item.kehadiran === 'HD') grouped[key].SH++;
            else if(item.kehadiran === 'TS' || item.kehadiran === 'A' || item.kehadiran === 'S' || item.kehadiran === 'I') grouped[key].TS++;
        });

        const sortedKeys = Object.keys(grouped).sort((a,b) => new Date(grouped[b].tanggal) - new Date(grouped[a].tanggal));
        
        let html = '';
        sortedKeys.forEach(k => {
            const g = grouped[k];
            html += `
            <li style="flex-direction:column; align-items:flex-start; gap:8px; padding: 12px; background: rgba(255,255,255,0.9); border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <b style="color:#0f172a; font-size:13px;"><i class="fa-solid fa-mosque" style="color:var(--neon-green); margin-right:4px;"></i> ${namaKelas} (${g.sholat})</b>
                    <span style="font-size:10px; color:#64748b; font-weight:700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px;"><i class="fa-regular fa-calendar"></i> ${g.tanggal}</span>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="font-size:11px; background:#f8fafc; padding:5px 8px; border-radius:6px; font-weight:700; display:flex; gap:10px; border:1px solid #e2e8f0; color:#475569;">
                        <span style="color:#10b981;">Sholat: ${g.SH}</span>
                        <span style="color:#ef4444;">Tidak: ${g.TS}</span>
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
    
    const selNamaSholat = document.getElementById('input-nama-sholat');
    if (selNamaSholat) {
        const normalized = (sholat === 'Zuhur') ? 'Dzuhur' : sholat;
        selNamaSholat.value = normalized;
    }
    
    try {
        const { data, error } = await supabase.from('absensholat').select('*').eq('id_kelas', idKelas).eq('tanggal', tanggal).eq('nama_sholat', sholat);
        if(error) throw error;
        
        data.forEach(dbItem => {
            const index = dataSiswaAbsenSholat.findIndex(s => s.id_siswa === dbItem.id_siswa);
            if(index !== -1) {
                pilihKehadiranSholat(index, dbItem.kehadiran);
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

// ================= FITUR DOWNLOAD REKAP (MENGAJAR & SHOLAT) =================
window.loadExportLibs = async function() {
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
        throw new Error("Gagal memuat library export. Pastikan Anda terhubung ke internet.");
    }
};

window.downloadRekapKelas = async function(format) {
    const idKelas = document.getElementById('pilih-kelas-absen-kelas').value;
    const selKelas = document.getElementById('pilih-kelas-absen-kelas');
    const namaKelas = selKelas.options[selKelas.selectedIndex].text;
    const tglAwal = document.getElementById('rekap-kelas-mulai').value;
    const tglAkhir = document.getElementById('rekap-kelas-akhir').value;

    if (!idKelas) { alert("Pilih kelas terlebih dahulu!"); return; }
    if (!tglAwal || !tglAkhir) { alert("Pilih rentang tanggal (Dari & Hingga) terlebih dahulu!"); return; }
    if (tglAwal > tglAkhir) { alert("Tanggal Awal tidak boleh lebih besar dari Tanggal Akhir!"); return; }

    try {
        alert("Sedang menyusun rekap kelas, mohon tunggu...");
        await window.loadExportLibs();
        
        const { data: siswaData, error: errSiswa } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas).order('nomor_absen', { ascending: true });
        if (errSiswa) throw errSiswa;
        
        const { data: absenData, error: errAbsen } = await supabase.from('absenkelas').select('*').eq('id_kelas', idKelas).gte('tanggal', tglAwal).lte('tanggal', tglAkhir).order('tanggal');
        if (errAbsen) throw errAbsen;

        siswaData.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));

        const dateSet = new Set();
        absenData.forEach(a => dateSet.add(`${a.tanggal} (P.${a.pertemuan_ke})`));
        const uniqueDates = Array.from(dateSet).sort();

        let headers = ["No", "Nama Siswa", "L/P", ...uniqueDates, "Jml Hadir", "Jml Sakit", "Jml Izin", "Jml Alpa"];
        let reportData = [];

        siswaData.forEach((s, idx) => {
            let row = [s.nomor_absen || (idx + 1), s.siswa.nama_siswa, s.siswa.jenis_kelamin];
            let countH = 0, countS = 0, countI = 0, countA = 0;
            
            let absenSiswa = absenData.filter(a => a.id_siswa === s.id_siswa);
            
            uniqueDates.forEach(dateKey => {
                let record = absenSiswa.find(a => `${a.tanggal} (P.${a.pertemuan_ke})` === dateKey);
                let status = record ? record.kehadiran.charAt(0) : '-';
                row.push(status);
                
                if (record) {
                    if (record.kehadiran === 'Hadir') countH++;
                    else if (record.kehadiran === 'Sakit') countS++;
                    else if (record.kehadiran === 'Izin') countI++;
                    else if (record.kehadiran === 'Alpa') countA++;
                }
            });

            row.push(countH, countS, countI, countA);
            reportData.push(row);
        });

        const fileName = `Rekap_Mengajar_${namaKelas}_${tglAwal}_sd_${tglAkhir}`;

        if (format === 'excel') {
            const ws = window.XLSX.utils.aoa_to_sheet([headers, ...reportData]);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, "Rekap Kelas");
            window.XLSX.writeFile(wb, `${fileName}.xlsx`);
        } 
        else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4'); 
            
            doc.setFontSize(14);
            doc.text(`Rekapitulasi Presensi Mengajar - ${namaKelas}`, 40, 40);
            doc.setFontSize(10);
            doc.text(`Periode: ${tglAwal} s.d ${tglAkhir}`, 40, 60);

            doc.autoTable({
                startY: 75,
                head: [headers],
                body: reportData,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 3 },
                headStyles: { fillColor: [5, 213, 138], textColor: 255 } 
            });

            doc.save(`${fileName}.pdf`);
        }
    } catch (e) {
        alert("Gagal membuat rekapitulasi data: " + e.message);
    }
};

window.downloadRekapSholat = async function(format) {
    const idKelas = document.getElementById('pilih-kelas-absen-sholat').value;
    const selSholat = document.getElementById('pilih-kelas-absen-sholat');
    const namaKelas = selSholat.options[selSholat.selectedIndex].text;
    const tglAwal = document.getElementById('rekap-sholat-mulai').value;
    const tglAkhir = document.getElementById('rekap-sholat-akhir').value;

    if (!idKelas) { alert("Pilih kelas terlebih dahulu!"); return; }
    if (!tglAwal || !tglAkhir) { alert("Pilih rentang tanggal (Dari & Hingga) terlebih dahulu!"); return; }
    if (tglAwal > tglAkhir) { alert("Tanggal Awal tidak boleh lebih besar dari Tanggal Akhir!"); return; }

    try {
        alert("Sedang menyusun rekap sholat, mohon tunggu...");
        await window.loadExportLibs();
        
        const { data: siswaData, error: errSiswa } = await supabase.from('anggota_kelas').select(`id_siswa, nomor_absen, siswa ( nama_siswa, jenis_kelamin )`).eq('id_kelas', idKelas).order('nomor_absen', { ascending: true });
        if (errSiswa) throw errSiswa;
        
        const { data: absenData, error: errAbsen } = await supabase.from('absensholat').select('*').eq('id_kelas', idKelas).gte('tanggal', tglAwal).lte('tanggal', tglAkhir).order('tanggal');
        if (errAbsen) throw errAbsen;

        siswaData.sort((a, b) => a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa));

        const dateSet = new Set();
        absenData.forEach(a => dateSet.add(`${a.tanggal} (${a.nama_sholat})`));
        const uniqueDates = Array.from(dateSet).sort();

        let headers = ["No", "Nama Siswa", "L/P", ...uniqueDates, "Jml SH", "Jml TS", "Jml I", "Jml S", "Jml A", "Jml HD"];
        let reportData = [];

        siswaData.forEach((s, idx) => {
            let row = [s.nomor_absen || (idx + 1), s.siswa.nama_siswa, s.siswa.jenis_kelamin];
            let countSH = 0, countTS = 0, countI = 0, countS = 0, countA = 0, countHD = 0;
            
            let absenSiswa = absenData.filter(a => a.id_siswa === s.id_siswa);
            
            uniqueDates.forEach(dateKey => {
                let record = absenSiswa.find(a => `${a.tanggal} (${a.nama_sholat})` === dateKey);
                let status = record ? record.kehadiran : '-';
                row.push(status);
                
                if (record) {
                    if (record.kehadiran === 'SH') countSH++;
                    else if (record.kehadiran === 'TS') countTS++;
                    else if (record.kehadiran === 'I') countI++;
                    else if (record.kehadiran === 'S') countS++;
                    else if (record.kehadiran === 'A') countA++;
                    else if (record.kehadiran === 'HD') countHD++;
                }
            });

            row.push(countSH, countTS, countI, countS, countA, countHD);
            reportData.push(row);
        });

        const fileName = `Rekap_Sholat_${namaKelas}_${tglAwal}_sd_${tglAkhir}`;

        if (format === 'excel') {
            const ws = window.XLSX.utils.aoa_to_sheet([headers, ...reportData]);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, "Rekap Sholat");
            window.XLSX.writeFile(wb, `${fileName}.xlsx`);
        } 
        else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4'); 
            
            doc.setFontSize(14);
            doc.text(`Rekapitulasi Presensi Sholat - ${namaKelas}`, 40, 40);
            doc.setFontSize(10);
            doc.text(`Periode: ${tglAwal} s.d ${tglAkhir}`, 40, 60);

            doc.autoTable({
                startY: 75,
                head: [headers],
                body: reportData,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 3 },
                headStyles: { fillColor: [5, 213, 138], textColor: 255 } 
            });

            doc.save(`${fileName}.pdf`);
        }
    } catch (e) {
        alert("Gagal membuat rekapitulasi data: " + e.message);
    }
};