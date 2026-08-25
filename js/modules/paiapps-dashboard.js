// js/modules/paiapps-dashboard.js
import supabase from '../supabase.js';

let chartQuranInstance = null;
let sholatIntervalTimer = null;

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
        loadWaktuSholatDanCountdown(), // Inisialisasi API & Countdown Waktu Sholat
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

                let statusWaktu = '';
                let warnaWaktu = 'color: var(--text-abu);';
                
                if (diffDays > 0) {
                    statusWaktu = `(H-${diffDays})`;
                    warnaWaktu = 'color: var(--neon-yellow); font-weight:700;';
                } else if (diffDays === 0) {
                    statusWaktu = `(Hari Ini!)`;
                    warnaWaktu = 'color: var(--neon-red); font-weight:700;';
                } else {
                    if (item.siklus === '1 Kali') {
                        statusWaktu = `(Lewat ${Math.abs(diffDays)}hr)`;
                        warnaWaktu = 'color: var(--neon-red); font-weight:700;';
                    } else {
                        statusWaktu = `(Rutin)`; 
                        warnaWaktu = 'color: var(--neon-green); font-weight:700;';
                    }
                }

                // Format tampilan tanggal ringkas (DD/MM)
                const tglDeadline = `${tglParts[2]}/${tglParts[1]}`;

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
                        <span class="reminder-title" title="${item.judul_pengingat}">${item.judul_pengingat}</span>
                        <div class="reminder-meta-compact">
                            <span style="color: var(--text-abu);"><i class="fa-regular fa-calendar" style="margin-right:2px;"></i>${tglDeadline}</span>
                            <span style="${warnaWaktu}">${statusWaktu}</span>
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

// ================= 4. WIDGET WAKTU SHOLAT & REAL-TIME COUNTDOWN =================
async function loadWaktuSholatDanCountdown() {
    const elLabel = document.getElementById('sholat-next-label');
    const elTimer = document.getElementById('sholat-timer');
    if (!elLabel || !elTimer) return;

    if (sholatIntervalTimer) {
        clearInterval(sholatIntervalTimer);
    }

    try {
        // Menggunakan AlAdhan API (Kota: Balikpapan, Metode Kemenag: 20)
        const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Balikpapan&country=Indonesia&method=20');
        const json = await res.json();
        
        if (!json || !json.data || !json.data.timings) {
            throw new Error("Gagal mengambil data jadwal sholat");
        }

        const timings = json.data.timings;
        const sholatList = [
            { id: 'subuh', nama: 'Subuh', time: timings.Fajr },
            { id: 'dzuhur', nama: 'Dzuhur', time: timings.Dhuhr },
            { id: 'ashar', nama: 'Ashar', time: timings.Asr },
            { id: 'maghrib', nama: 'Maghrib', time: timings.Maghrib },
            { id: 'isya', nama: 'Isya', time: timings.Isha }
        ];

        // Tampilkan jam di pill masing-masing
        sholatList.forEach(s => {
            const elPillTime = document.getElementById(`time-${s.id}`);
            if (elPillTime) elPillTime.innerText = s.time.substring(0, 5);
        });

        function updateCountdown() {
            const now = new Date();
            let activeSholat = null; // Sholat yang sedang masuk waktunya (dalam rentang 10 menit)
            let nextSholat = null;
            let targetDate = null;

            // Reset semua border aktif
            sholatList.forEach(s => {
                const p = document.getElementById(`pill-${s.id}`);
                if (p) p.classList.remove('sholat-pill-active');
            });

            // 1. Cek apakah saat ini sedang berada dalam rentang 10 menit setelah masuk waktu sholat
            for (let s of sholatList) {
                const [jam, mnt] = s.time.split(':').map(Number);
                const sDate = new Date();
                sDate.setHours(jam, mnt, 0, 0);

                const diffMs = now - sDate; // Waktu sekarang dikurangi waktu sholat
                const diffMnit = diffMs / (1000 * 60);

                // Jika sudah masuk dan belum lewat dari 10 menit
                if (diffMnit >= 0 && diffMnit <= 10) {
                    activeSholat = s;
                    break;
                }
            }

            // 2. Jika sedang dalam rentang 10 menit waktu sholat
            if (activeSholat) {
                const activePill = document.getElementById(`pill-${activeSholat.id}`);
                if (activePill) activePill.classList.add('sholat-pill-active');

                elLabel.innerHTML = `<span style="color:var(--neon-green);"><i class="fa-solid fa-mosque"></i> Sedang Memasuki Waktu Sholat ${activeSholat.nama}...</span>`;
                elTimer.innerText = "00:00:00";
                return;
            }

            // 3. Jika tidak dalam rentang 10 menit, cari sholat berikutnya seperti biasa untuk hitung mundur
            for (let s of sholatList) {
                const [jam, mnt] = s.time.split(':').map(Number);
                const sDate = new Date();
                sDate.setHours(jam, mnt, 0, 0);

                if (sDate > now) {
                    nextSholat = s;
                    targetDate = sDate;
                    break;
                }
            }

            // Jika semua sholat hari ini sudah lewat, target sholat berikutnya adalah Subuh esok hari
            if (!nextSholat) {
                nextSholat = sholatList[0];
                const [jam, mnt] = nextSholat.time.split(':').map(Number);
                targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + 1);
                targetDate.setHours(jam, mnt, 0, 0);
            }

            // Tandai pill sholat berikutnya
            const activePill = document.getElementById(`pill-${nextSholat.id}`);
            if (activePill) activePill.classList.add('sholat-pill-active');

            // Hitung selisih detik mundur
            const diffMs = targetDate - now;
            const diffSecTotal = Math.floor(diffMs / 1000);
            const hours = String(Math.floor(diffSecTotal / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((diffSecTotal % 3600) / 60)).padStart(2, '0');
            const seconds = String(diffSecTotal % 60).padStart(2, '0');

            elLabel.innerText = `Menuju Waktu ${nextSholat.nama}`;
            elTimer.innerText = `${hours}:${minutes}:${seconds}`;
        }

        updateCountdown();
        sholatIntervalTimer = setInterval(updateCountdown, 1000);

    } catch (e) {
        console.error("Gagal inisialisasi sholat:", e);
        elLabel.innerText = "Jadwal Sholat Offline";
        elTimer.innerText = "--:--:--";
    }
}

// ================= 5. GRAFIK KELANCARAN MEMBACA =================
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

// ================= 6. ANALITIK KEHADIRAN (MENGGUNAKAN POSTGRESQL VIEW) =================
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

// ================= 7. ANALITIK KETUNTASAN TUGAS (PERSENTASE SISWA TUNTAS / T) =================
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

// ================= 8. INFORMASI SISTEM =================
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