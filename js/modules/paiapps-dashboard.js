// js/modules/paiapps-dashboard.js
import supabase from '../supabase.js';

let chartQuranInstance = null;

// ================= DYNAMIC LOADER: CHART.JS =================
async function loadChartJSLib() {
    if (window.Chart) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Gagal memuat library grafik"));
        document.head.appendChild(script);
    });
}

// ================= FUNGSI UTAMA INISIALISASI DASHBOARD =================
window.loadDashboardPaiApps = async function() {
    const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const hariIni = hariList[new Date().getDay()];

    const hariJadwalDefault = (hariIni === 'Minggu') ? 'Senin' : hariIni;

    const elNamaHari = document.getElementById('dash-nama-hari');
    if (elNamaHari) elNamaHari.innerText = hariJadwalDefault;

    const selectHari = document.getElementById('pilih-hari-jadwal');
    if (selectHari) selectHari.value = hariJadwalDefault;

    await Promise.all([
        loadRingkasanMetrikDanAlert(),
        loadJadwalHariIni(hariJadwalDefault),
        loadPengingatKegiatan(), 
        loadGrafikMembacaQuran(),
        loadAnalitikKehadiranPerKelas(),
        loadAnalitikKetuntasanTugas(),
        loadInfoSistem()
    ]);
};

// ================= GANTI HARI JADWAL MENGAJAR =================
window.gantiHariJadwal = function(hariDipilih) {
    const elNamaHari = document.getElementById('dash-nama-hari');
    if (elNamaHari) elNamaHari.innerText = hariDipilih;
    loadJadwalHariIni(hariDipilih);
};

// ================= 1. METRIK UTAMA & ACTIONABLE ALERTS =================
async function loadRingkasanMetrikDanAlert() {
    const elJmlSiswa = document.getElementById('dash-jml-siswa');
    const elJmlKelas = document.getElementById('dash-jml-kelas');
    const alertBox = document.getElementById('dash-alert-container');

    try {
        const [resKelasAktif, resAnggota, resJurnalDraft, resTugas, resNilai] = await Promise.all([
            supabase.from('kelas').select('id, nama_kelas').eq('status_kelas', true),
            supabase.from('anggota_kelas').select('id_kelas, id_siswa'),
            supabase.from('jurnalmengajar').select('id, judul_materi, id_kelas').like('judul_materi', '%[Draft]%'),
            supabase.from('namatugas').select('id, id_kelas'),
            supabase.from('penilaiantugas').select('id_tugas')
        ]);

        const listKelasAktif = resKelasAktif.data || [];
        const setKelasAktifId = new Set(listKelasAktif.map(k => k.id));

        const anggotaKelasAktif = (resAnggota.data || []).filter(a => setKelasAktifId.has(a.id_kelas));
        const setSiswaAktif = new Set(anggotaKelasAktif.map(a => a.id_siswa));

        if (elJmlSiswa) elJmlSiswa.innerText = setSiswaAktif.size;
        if (elJmlKelas) elJmlKelas.innerText = listKelasAktif.length;

        let alertsHtml = '';

        const listDraftAktif = (resJurnalDraft.data || []).filter(j => setKelasAktifId.has(j.id_kelas));
        if (listDraftAktif.length > 0) {
            alertsHtml += `
                <div class="alert-card alert-warning" onclick="loadPage('jurnal', 'Jurnal Guru')">
                    <span><i class="fa-solid fa-triangle-exclamation" style="margin-right:8px;"></i> Terdapat <b>${listDraftAktif.length} sesi jurnal</b> di kelas aktif yang masih berstatus draft.</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            `;
        }

        const tugasKelasAktif = (resTugas.data || []).filter(t => setKelasAktifId.has(t.id_kelas));
        const allNilai = resNilai.data || [];
        let tugasBelumSelesai = 0;

        tugasKelasAktif.forEach(t => {
            const jmlTersimpan = allNilai.filter(n => n.id_tugas === t.id).length;
            if (jmlTersimpan === 0) tugasBelumSelesai++;
        });

        if (tugasBelumSelesai > 0) {
            alertsHtml += `
                <div class="alert-card alert-info" onclick="loadPage('penilaian', 'Penilaian')">
                    <span><i class="fa-solid fa-clock-rotate-left" style="margin-right:8px;"></i> Terdapat <b>${tugasBelumSelesai} tugas</b> di kelas aktif yang belum memiliki nilai siswa.</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            `;
        }

        if (!alertsHtml) {
            alertsHtml = `
                <div class="alert-card alert-success">
                    <span><i class="fa-solid fa-circle-check" style="margin-right:8px;"></i> Semua administrasi jurnal dan tugas kelas aktif dalam status tertib!</span>
                </div>
            `;
        }

        if (alertBox) alertBox.innerHTML = alertsHtml;

    } catch (e) {
        console.error("Gagal load metrik & alerts:", e);
    }
}

// ================= 2. PENGINGAT JADWAL MENGAJAR =================
async function loadJadwalHariIni(hari) {
    const container = document.getElementById('dash-list-jadwal-hari-ini');
    if (!container) return;

    if (hari === 'Minggu') {
        container.innerHTML = `
            <li style="text-align:center; padding:15px; color:var(--text-abu); font-size:12px;">
                <i class="fa-solid fa-mug-hot" style="color:var(--neon-green); font-size:18px; margin-bottom:6px; display:block;"></i>
                Hari Minggu adalah hari libur. Tidak ada jadwal KBM.
            </li>
        `;
        return;
    }

    try {
        const [resKelasAktif, resJadwal] = await Promise.all([
            supabase.from('kelas').select('id, nama_kelas, tingkat').eq('status_kelas', true),
            supabase.from('jadwalmengajar').select('*').eq('hari', hari)
        ]);

        const listKelasAktif = resKelasAktif.data || [];
        const mapKelasAktif = new Map(listKelasAktif.map(k => [k.id, k]));

        const jadwalAktif = (resJadwal.data || []).filter(j => mapKelasAktif.has(j.id_kelas));

        if (jadwalAktif.length === 0) {
            container.innerHTML = `
                <li style="text-align:center; padding:15px; color:var(--text-abu); font-size:12px;">
                    <i class="fa-regular fa-calendar-xmark" style="font-size:16px; margin-bottom:4px; display:block;"></i>
                    Tidak ada jadwal mengajar kelas aktif pada hari ${hari}.
                </li>
            `;
            return;
        }

        jadwalAktif.sort((a, b) => String(a.jam_ke).localeCompare(String(b.jam_ke)));

        const now = new Date();
        const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const hariAsliSekarang = hariList[now.getDay()];
        const nowJam = String(now.getHours()).padStart(2, '0');
        const nowMenit = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${nowJam}:${nowMenit}`;

        let html = '';
        jadwalAktif.forEach(item => {
            const kls = mapKelasAktif.get(item.id_kelas);
            const namaKls = kls ? kls.nama_kelas : '-';
            const jM = item.jam_mulai ? item.jam_mulai.substring(0, 5) : '';
            const jS = item.jam_selesai ? item.jam_selesai.substring(0, 5) : '';
            const jamStr = (jM && jS) ? `${jM} - ${jS}` : 'Waktu Fleksibel';
            const ketStr = item.keterangan ? ` | ${item.keterangan}` : '';

            let isCurrentLive = false;
            if (hari === hariAsliSekarang && jM && jS) {
                if (currentTimeStr >= jM && currentTimeStr <= jS) {
                    isCurrentLive = true;
                }
            }

            const liveClass = isCurrentLive ? 'jadwal-item-aktif' : '';
            const liveBadge = isCurrentLive ? '<span class="badge-live-kbm"><i class="fa-solid fa-circle-play"></i> SEDANG BERLANGSUNG</span>' : '';

            html += `
                <li class="jadwal-item ${liveClass}">
                    <div>
                        <div style="display:flex; align-items:center; flex-wrap:wrap;">
                            <b style="color:var(--text-putih); font-size:13px;">
                                <i class="fa-solid fa-chalkboard" style="color:var(--neon-yellow); margin-right:6px;"></i> Kelas ${namaKls}
                            </b>
                            ${liveBadge}
                        </div>
                        <div style="font-size:10px; color:var(--text-abu); margin-top:2px;">
                            JP ${item.jam_ke} (${item.jumlah_jp || 1} JP) ${ketStr}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:11px; font-weight:700; color:var(--neon-green); background:rgba(5,213,138,0.1); padding:4px 8px; border-radius:6px; border:1px solid rgba(5,213,138,0.2);">
                            <i class="fa-regular fa-clock"></i> ${jamStr}
                        </span>
                    </div>
                </li>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<li style="color:var(--neon-red); text-align:center; font-size:11px; padding:10px;">Gagal memuat jadwal: ${e.message}</li>`;
    }
}

// ================= 3. PENGINGAT KEGIATAN BERDASARKAN HARI INI =================
async function loadPengingatKegiatan() {
    const container = document.getElementById('dash-list-reminder');
    const cardContainer = document.getElementById('dash-card-reminder');
    if (!container || !cardContainer) return;

    try {
        const { data, error } = await supabase
            .from('pengingat_kegiatan')
            .select('*')
            .eq('status_selesai', false)
            .order('tanggal_pelaksanaan', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            cardContainer.style.display = 'none';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '';
        let countVisible = 0;

        data.forEach(item => {
            let tglParts = item.tanggal_pelaksanaan.split('-');
            const targetDate = new Date(tglParts[0], tglParts[1] - 1, tglParts[2]);
            targetDate.setHours(0, 0, 0, 0);

            const diffTime = targetDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= item.ingatkan_h_min) {
                countVisible++;
                
                let badgeClass = 'cycle-once';
                if (item.siklus === 'Mingguan') badgeClass = 'cycle-weekly';
                if (item.siklus === 'Bulanan') badgeClass = 'cycle-monthly';
                if (item.siklus === 'Tahunan') badgeClass = 'cycle-yearly';

                let statusWaktu = '';
                let iconWaktu = '<i class="fa-regular fa-clock"></i>';
                let warnaWaktu = 'color: var(--text-abu);';
                
                if (diffDays > 0) {
                    statusWaktu = `H-${diffDays} (Tgl: ${item.tanggal_pelaksanaan})`;
                    warnaWaktu = 'color: var(--neon-yellow); font-weight:700;';
                } else if (diffDays === 0) {
                    statusWaktu = `Hari Ini!`;
                    iconWaktu = '<i class="fa-solid fa-triangle-exclamation"></i>';
                    warnaWaktu = 'color: var(--neon-red); font-weight:700;';
                } else {
                    if (item.siklus === '1 Kali') {
                        statusWaktu = `Terlewat ${Math.abs(diffDays)} Hari`;
                        iconWaktu = '<i class="fa-solid fa-circle-exclamation"></i>';
                        warnaWaktu = 'color: var(--neon-red); font-weight:700; text-decoration: underline;';
                    } else {
                        statusWaktu = `Tiba Waktunya (Rutin)`; 
                        iconWaktu = '<i class="fa-solid fa-rotate"></i>';
                        warnaWaktu = 'color: var(--neon-green); font-weight:700;';
                    }
                }

                // LOGIKA TOMBOL SELESAI: Hanya muncul jika siklus adalah '1 Kali'
                let actionButton = '';
                if (item.siklus === '1 Kali') {
                    actionButton = `
                        <button class="reminder-action" onclick="selesaiPengingat(this, '${item.id}', '${item.judul_pengingat}', '${item.siklus}', '${item.tanggal_pelaksanaan}')" title="Tandai Selesai">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    `;
                }

                html += `
                    <li class="reminder-item" id="reminder-${item.id}">
                        <div class="reminder-info">
                            <span class="reminder-title">${item.judul_pengingat}</span>
                            <div class="reminder-meta">
                                <span class="badge-cycle ${badgeClass}">${item.siklus}</span>
                                <span style="${warnaWaktu}">${iconWaktu} ${statusWaktu}</span>
                            </div>
                        </div>
                        ${actionButton}
                    </li>
                `;
            }
        });

        if (countVisible === 0) {
            cardContainer.style.display = 'none';
        } else {
            cardContainer.style.display = 'block';
            container.innerHTML = html;
        }

    } catch (e) {
        console.error("Gagal memuat pengingat:", e);
        cardContainer.style.display = 'block';
        container.innerHTML = `<li style="color:var(--neon-red); text-align:center; font-size:11px; padding:10px;">Gagal memuat pengingat: ${e.message}</li>`;
    }
}

window.selesaiPengingat = async function(btnElement, idPengingat, judul, siklus, currentTanggal) {
    if (!confirm(`Tandai selesai untuk agenda "${judul}"?`)) {
        return;
    }

    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnElement.disabled = true;

    try {
        if (siklus === '1 Kali') {
            const { error } = await supabase
                .from('pengingat_kegiatan')
                .update({ status_selesai: true })
                .eq('id', idPengingat);
            if (error) throw error;
        } else {
            let tglParts = currentTanggal.split('-');
            let nextDate = new Date(tglParts[0], tglParts[1] - 1, tglParts[2]);

            if (siklus === 'Mingguan') {
                nextDate.setDate(nextDate.getDate() + 7);
            } else if (siklus === 'Bulanan') {
                nextDate.setMonth(nextDate.getMonth() + 1);
            } else if (siklus === 'Tahunan') {
                nextDate.setFullYear(nextDate.getFullYear() + 1);
            }

            const yyyy = nextDate.getFullYear();
            const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
            const dd = String(nextDate.getDate()).padStart(2, '0');
            const nextDateStr = `${yyyy}-${mm}-${dd}`;

            const { error } = await supabase
                .from('pengingat_kegiatan')
                .update({ tanggal_pelaksanaan: nextDateStr })
                .eq('id', idPengingat);
            if (error) throw error;
        }

        const li = btnElement.closest('.reminder-item');
        if (li) {
            li.style.transition = 'all 0.3s ease';
            li.style.transform = 'scale(0.95)';
            li.style.opacity = '0';
            
            setTimeout(() => {
                li.remove();
                loadPengingatKegiatan(); 
            }, 300);
        }

    } catch (e) {
        console.error("Gagal menyelesaikan pengingat:", e);
        alert("Gagal menyelesaikan pengingat: " + e.message);
        btnElement.innerHTML = originalHtml;
        btnElement.disabled = false;
    }
};

// ================= 4. GRAFIK KELANCARAN MEMBACA =================
async function loadGrafikMembacaQuran() {
    const canvas = document.getElementById('chart-quran-dashboard');
    const msgKosong = document.getElementById('chart-quran-kosong');
    if (!canvas) return;

    try {
        await loadChartJSLib();

        const [resKelas, resAnggota, resBaca] = await Promise.all([
            supabase.from('kelas').select('id, nama_kelas, tingkat').eq('status_kelas', true).order('tingkat').order('nama_kelas'),
            supabase.from('anggota_kelas').select('id_kelas, id_siswa'),
            supabase.from('penilaianmembaca').select('id_kelas, id_siswa, kelancaran_membaca')
        ]);

        const listKelasAktif = resKelas.data || [];
        const listAnggota = resAnggota.data || [];
        const dataBaca = resBaca.data || [];

        if (listKelasAktif.length === 0) {
            canvas.style.display = 'none';
            if (msgKosong) msgKosong.style.display = 'block';
            return;
        }

        const labelsKelas = [];
        const persenBelum = [];
        const persenTerbata = [];
        const persenCepat = [];
        const persenLancarMahir = [];

        listKelasAktif.forEach(kls => {
            const anggotaKls = listAnggota.filter(a => a.id_kelas === kls.id);
            const totalSiswa = anggotaKls.length;

            if (totalSiswa > 0) {
                labelsKelas.push(kls.nama_kelas);

                let countBelum = 0;
                let countTerbata = 0;
                let countCepat = 0;
                let countLancarMahir = 0;

                anggotaKls.forEach(agt => {
                    const rowBaca = dataBaca.find(b => b.id_kelas === kls.id && b.id_siswa === agt.id_siswa);
                    const val = rowBaca && rowBaca.kelancaran_membaca ? rowBaca.kelancaran_membaca.trim() : '';

                    if (!val) {
                        countBelum++;
                    } else if (
                        val === 'Tidak bisa baca' || 
                        val === 'Terbata-bata ada salah' || 
                        val === 'Terbata-bata bacaan benar' ||
                        val === 'Terbata-bata'
                    ) {
                        countTerbata++;
                    } else if (
                        val === 'Cepat namun banyak salah' || 
                        val === 'cepat namun banyak salah' || 
                        val === 'Cepat dengan sedikit salah' ||
                        val === 'cepat dengan sedikit salah'
                    ) {
                        countCepat++;
                    } else if (
                        val === 'Lancar' || 
                        val === 'lancar' || 
                        val === 'Mahir tanpa kesalahan'
                    ) {
                        countLancarMahir++;
                    } else {
                        countBelum++;
                    }
                });

                persenBelum.push(Math.round((countBelum / totalSiswa) * 100));
                persenTerbata.push(Math.round((countTerbata / totalSiswa) * 100));
                persenCepat.push(Math.round((countCepat / totalSiswa) * 100));
                persenLancarMahir.push(Math.round((countLancarMahir / totalSiswa) * 100));
            }
        });

        if (labelsKelas.length === 0) {
            canvas.style.display = 'none';
            if (msgKosong) msgKosong.style.display = 'block';
            return;
        }

        canvas.style.display = 'block';
        if (msgKosong) msgKosong.style.display = 'none';

        if (chartQuranInstance) {
            chartQuranInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        chartQuranInstance = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsKelas,
                datasets: [
                    { label: 'Belum Dinilai', data: persenBelum, backgroundColor: '#64748b', borderRadius: 6 },
                    { label: 'Belum Bisa & Terbata-bata', data: persenTerbata, backgroundColor: '#ef4444', borderRadius: 6 },
                    { label: 'Cepat (Banyak/Sedikit Salah)', data: persenCepat, backgroundColor: '#f59e0b', borderRadius: 6 },
                    { label: 'Lancar & Mahir', data: persenLancarMahir, backgroundColor: '#05d58a', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#8494a8', boxWidth: 12, font: { size: 10, family: 'Poppins' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) { return ` ${context.dataset.label}: ${context.raw}%`; }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#ffffff', font: { family: 'Poppins', size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#8494a8',
                            stepSize: 20,
                            callback: function(value) { return value + '%'; },
                            font: { family: 'Poppins', size: 10 }
                        }
                    }
                }
            }
        });

    } catch (e) {
        console.error("Gagal merender grafik Quran:", e);
    }
}

// ================= 5. ANALITIK KEHADIRAN (MENGGUNAKAN POSTGRESQL VIEW) =================
async function loadAnalitikKehadiranPerKelas() {
    const container = document.getElementById('dash-list-analitik-kehadiran');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('view_analitik_kehadiran')
            .select('*');

        if (error) throw error;

        const listKelas = data || [];

        if (listKelas.length === 0) {
            container.innerHTML = '<div style="color:var(--text-abu); font-size:12px; text-align:center;">Belum ada kelas aktif.</div>';
            return;
        }

        let html = '';
        listKelas.forEach(kls => {
            const jmlHadir = parseInt(kls.total_hadir) || 0;
            const jmlValid = parseInt(kls.total_valid) || 0;

            let persen = 0;
            if (jmlValid > 0) {
                persen = Math.round((jmlHadir / jmlValid) * 100);
            }

            let clr = 'var(--neon-green)';
            if (persen < 75) clr = 'var(--neon-red)';
            else if (persen < 85) clr = 'var(--neon-yellow)';

            html += `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600;">
                        <span style="color:var(--text-putih);">${kls.nama_kelas}</span>
                        <span style="color:${clr}; font-weight:700;">${persen}% Hadir (${jmlValid} data)</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width:${persen}%; background:${clr};"></div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        console.error("Gagal memuat view kehadiran:", e);
        container.innerHTML = `<div style="color:var(--neon-red); font-size:11px;">Gagal memuat data kehadiran: ${e.message}</div>`;
    }
}

// ================= 6. ANALITIK KETUNTASAN TUGAS (PERSENTASE SISWA TUNTAS / T) =================
async function loadAnalitikKetuntasanTugas() {
    const container = document.getElementById('dash-list-analitik-tugas');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('view_analitik_tugas')
            .select('*');

        if (error) throw error;

        const listKelas = data || [];

        if (listKelas.length === 0) {
            container.innerHTML = '<div style="color:var(--text-abu); font-size:12px; text-align:center;">Belum ada kelas aktif.</div>';
            return;
        }

        let html = '';
        listKelas.forEach(kls => {
            const totalSlot = parseInt(kls.total_slot) || 0;
            const totalTuntas = parseInt(kls.total_tuntas) || 0;
            const totalTugas = parseInt(kls.total_tugas) || 0;

            let persen = 0;
            if (totalSlot > 0) {
                persen = Math.round((totalTuntas / totalSlot) * 100);
            }

            let clr = 'var(--neon-purple)';
            if (persen < 70) clr = 'var(--neon-red)';
            else if (persen < 85) clr = 'var(--neon-yellow)';
            else if (persen === 100) clr = 'var(--neon-green)';

            html += `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600;">
                        <span style="color:var(--text-putih);">${kls.nama_kelas} (${totalTugas} Tugas)</span>
                        <span style="color:${clr}; font-weight:700;">${persen}% Tuntas (${totalTuntas}/${totalSlot} data)</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width:${persen}%; background:${clr};"></div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        console.error("Gagal memuat view tugas:", e);
        container.innerHTML = `<div style="color:var(--neon-red); font-size:11px;">Gagal memuat ketuntasan tugas: ${e.message}</div>`;
    }
}

// ================= 7. INFORMASI SISTEM =================
async function loadInfoSistem() {
    const el = document.getElementById('dash-info-sistem');
    if (!el) return;

    try {
        const { data, error } = await supabase.from('profilaplikasi').select('*').limit(1).maybeSingle();
        if (error) throw error;

        const p = data || {};
        el.innerHTML = `
            <b>Sekolah:</b> ${p.nama_sekolah || '-'}<br>
            <b>Guru Pengampu:</b> ${p.nama_guru || '-'}<br>
            <b>NIP:</b> ${p.nip_guru || '-'}<br>
            <b>Tahun Ajaran / Semester:</b> ${p.tahun_ajaran_aktif || '-'} (${p.semester_aktif || '-'})<br>
            <b>Status Database:</b> <span style="color:var(--neon-green); font-weight:700;"><i class="fa-solid fa-circle-dot"></i> Terhubung ke Supabase</span>
        `;
    } catch (e) {
        el.innerHTML = 'Gagal memuat identitas sistem.';
    }
}