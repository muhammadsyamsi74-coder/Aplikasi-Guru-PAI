// js/modules/paiapps-dashboard.js
import supabase from '../supabase.js';

let chartQuranInstance = null;
let sholatIntervalTimer = null;

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

window.selesaiPengingat = async function(btnEl, idPengingat, judul, siklus, tgl) {
    if (!confirm(`Tandai agenda "${judul}" sebagai selesai?`)) return;
    try {
        if (btnEl) { btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btnEl.disabled = true; }
        const { error } = await supabase.from('pengingat_kegiatan').update({ status_selesai: true }).eq('id', idPengingat);
        if (error) throw error;

        const itemRow = document.getElementById(`reminder-${idPengingat}`);
        if (itemRow) { itemRow.style.opacity = '0.3'; itemRow.style.transform = 'scale(0.95)'; }
        setTimeout(() => { loadPengingatKegiatan(); }, 300);
    } catch (e) {
        alert("Gagal menyelesaikan pengingat: " + e.message);
        if (btnEl) { btnEl.innerHTML = '<i class="fa-solid fa-check"></i>'; btnEl.disabled = false; }
    }
};

window.loadDashboardPaiApps = async function() {
    const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    let indexHari = now.getDay();
    if (now.getHours() >= 17) indexHari = (indexHari + 1) % 7;
    
    let hariJadwalDefault = hariList[indexHari];
    if (hariJadwalDefault === 'Sabtu' || hariJadwalDefault === 'Minggu') hariJadwalDefault = 'Senin';

    const elNamaHari = document.getElementById('dash-nama-hari');
    if (elNamaHari) elNamaHari.innerText = hariJadwalDefault;

    const selectHari = document.getElementById('pilih-hari-jadwal');
    if (selectHari) selectHari.value = hariJadwalDefault;

    // Load API eksternal mandiri agar tidak membuat blank saat offline
    loadWaktuSholatDanCountdown().catch(e => console.warn('Waktu sholat tertunda:', e));

    try {
        await Promise.all([
            loadRingkasanMetrikDanAlert(),
            loadJadwalHariIni(hariJadwalDefault),
            loadPengingatKegiatan(), 
            loadGrafikMembacaQuran(),
            loadAnalitikKehadiranPerKelas(),
            loadAnalitikKetuntasanTugas(),
            loadInfoSistem()
        ]);
    } catch (e) {
        console.error("Gagal load data dashboard:", e);
    }
};

window.gantiHariJadwal = function(hariDipilih) {
    const elNamaHari = document.getElementById('dash-nama-hari');
    if (elNamaHari) elNamaHari.innerText = hariDipilih;
    loadJadwalHariIni(hariDipilih);
};

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
                    <span><i class="fa-solid fa-triangle-exclamation" style="margin-right:8px;"></i> Terdapat <b>${listDraftAktif.length} sesi jurnal</b> di kelas aktif yang masih draft.</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            `;
        }

        const tugasKelasAktif = (resTugas.data || []).filter(t => setKelasAktifId.has(t.id_kelas));
        const allNilai = resNilai.data || [];
        let tugasBelumSelesai = 0;

        tugasKelasAktif.forEach(t => {
            if (allNilai.filter(n => n.id_tugas === t.id).length === 0) tugasBelumSelesai++;
        });

        if (tugasBelumSelesai > 0) {
            alertsHtml += `
                <div class="alert-card alert-info" onclick="loadPage('penilaian', 'Penilaian')">
                    <span><i class="fa-solid fa-clock-rotate-left" style="margin-right:8px;"></i> Terdapat <b>${tugasBelumSelesai} tugas</b> yang belum dinilai.</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            `;
        }

        if (!alertsHtml) {
            alertsHtml = `<div class="alert-card alert-success"><span><i class="fa-solid fa-circle-check" style="margin-right:8px;"></i> Administrasi jurnal dan tugas terpantau tertib!</span></div>`;
        }
        if (alertBox) alertBox.innerHTML = alertsHtml;
    } catch (e) { console.error("Gagal load metrik:", e); }
}

async function loadJadwalHariIni(hari) {
    const container = document.getElementById('dash-list-jadwal-hari-ini');
    if (!container) return;
    if (hari === 'Minggu') { container.innerHTML = `<li style="text-align:center; padding:15px; color:var(--text-abu); font-size:12px;"><i class="fa-solid fa-mug-hot" style="color:var(--neon-green); font-size:18px; margin-bottom:6px; display:block;"></i>Hari libur, tidak ada KBM.</li>`; return; }

    try {
        const [resKelasAktif, resJadwal] = await Promise.all([
            supabase.from('kelas').select('id, nama_kelas, tingkat').eq('status_kelas', true),
            supabase.from('jadwalmengajar').select('*').eq('hari', hari)
        ]);

        const listKelasAktif = resKelasAktif.data || [];
        const mapKelasAktif = new Map(listKelasAktif.map(k => [k.id, k]));
        const jadwalAktif = (resJadwal.data || []).filter(j => mapKelasAktif.has(j.id_kelas));

        if (jadwalAktif.length === 0) {
            container.innerHTML = `<li style="text-align:center; padding:15px; color:var(--text-abu); font-size:12px;"><i class="fa-regular fa-calendar-xmark" style="font-size:16px; margin-bottom:4px; display:block;"></i>Tidak ada jadwal mengajar pada hari ${hari}.</li>`;
            return;
        }

        jadwalAktif.sort((a, b) => String(a.jam_ke).localeCompare(String(b.jam_ke)));
        const now = new Date();
        const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const hariAsliSekarang = hariList[now.getDay()];
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let html = '';
        jadwalAktif.forEach(item => {
            const namaKls = mapKelasAktif.get(item.id_kelas)?.nama_kelas || '-';
            const jM = item.jam_mulai?.substring(0, 5) || '';
            const jS = item.jam_selesai?.substring(0, 5) || '';
            const jamStr = (jM && jS) ? `${jM} - ${jS}` : 'Waktu Fleksibel';
            
            let isCurrentLive = (hari === hariAsliSekarang && jM && jS && currentTimeStr >= jM && currentTimeStr <= jS);
            html += `
                <li class="jadwal-item ${isCurrentLive ? 'jadwal-item-aktif' : ''}">
                    <div>
                        <div style="display:flex; align-items:center; flex-wrap:wrap;">
                            <b style="color:var(--text-putih); font-size:13px;"><i class="fa-solid fa-chalkboard" style="color:var(--neon-yellow); margin-right:6px;"></i> Kelas ${namaKls}</b>
                            ${isCurrentLive ? '<span class="badge-live-kbm"><i class="fa-solid fa-circle-play"></i> SEDANG BERLANGSUNG</span>' : ''}
                        </div>
                        <div style="font-size:10px; color:var(--text-abu); margin-top:2px;">JP ${item.jam_ke} (${item.jumlah_jp || 1} JP) ${item.keterangan ? '| '+item.keterangan : ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:11px; font-weight:700; color:var(--neon-green); background:rgba(5,213,138,0.1); padding:4px 8px; border-radius:6px; border:1px solid rgba(5,213,138,0.2);"><i class="fa-regular fa-clock"></i> ${jamStr}</span>
                    </div>
                </li>
            `;
        });
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<li style="color:var(--neon-red); text-align:center; font-size:11px; padding:10px;">Gagal memuat jadwal: ${e.message}</li>`; }
}

async function loadPengingatKegiatan() {
    const container = document.getElementById('dash-list-reminder');
    const cardContainer = document.getElementById('dash-card-reminder');
    if (!container || !cardContainer) return;

    try {
        const { data, error } = await supabase.from('pengingat_kegiatan').select('*').eq('status_selesai', false).order('tanggal_pelaksanaan', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            cardContainer.style.display = 'none';
            if (typeof window.updateAppBadge === 'function') window.updateAppBadge(0);
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
            const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays <= item.ingatkan_h_min) {
                countVisible++;
                let statusWaktu = '', warnaWaktu = 'color: var(--text-abu);';
                
                if (diffDays > 0) { statusWaktu = `(H-${diffDays})`; warnaWaktu = 'color: var(--neon-yellow); font-weight:700;'; } 
                else if (diffDays === 0) { statusWaktu = `(Hari Ini!)`; warnaWaktu = 'color: var(--neon-red); font-weight:700;'; } 
                else {
                    statusWaktu = item.siklus === '1 Kali' ? `(Lewat ${Math.abs(diffDays)}hr)` : `(Rutin)`; 
                    warnaWaktu = item.siklus === '1 Kali' ? 'color: var(--neon-red); font-weight:700;' : 'color: var(--neon-green); font-weight:700;';
                }

                html += `
                    <li class="reminder-item" id="reminder-${item.id}">
                        <span class="reminder-title" title="${item.judul_pengingat}">${item.judul_pengingat}</span>
                        <div class="reminder-meta-compact">
                            <span style="color: var(--text-abu);"><i class="fa-regular fa-calendar" style="margin-right:2px;"></i>${tglParts[2]}/${tglParts[1]}</span>
                            <span style="${warnaWaktu}">${statusWaktu}</span>
                        </div>
                        ${item.siklus === '1 Kali' ? `<button class="reminder-action" onclick="selesaiPengingat(this, '${item.id}', '${item.judul_pengingat}', '${item.siklus}', '${item.tanggal_pelaksanaan}')" title="Tandai Selesai"><i class="fa-solid fa-check"></i></button>` : ''}
                    </li>
                `;
            }
        });

        if (typeof window.updateAppBadge === 'function') window.updateAppBadge(countVisible);

        if (countVisible === 0) cardContainer.style.display = 'none';
        else { cardContainer.style.display = 'block'; container.innerHTML = html; }
    } catch (e) {
        cardContainer.style.display = 'block';
        container.innerHTML = `<li style="color:var(--neon-red); text-align:center; font-size:11px; padding:10px;">Gagal memuat pengingat: ${e.message}</li>`;
    }
}

async function loadWaktuSholatDanCountdown() {
    const elLabel = document.getElementById('sholat-next-label');
    const elTimer = document.getElementById('sholat-timer');
    if (!elLabel || !elTimer) return;
    if (sholatIntervalTimer) clearInterval(sholatIntervalTimer);

    try {
        const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Balikpapan&country=Indonesia&method=20');
        const json = await res.json();
        const timings = json.data.timings;
        const hijri = json.data.date.hijri;
        const namaBulanIndo = { "Muharram": "Muharram", "Safar": "Safar", "Rabi' al-awwal": "Rabiul Awal", "Rabi' al-thani": "Rabiul Akhir", "Jumada al-awwal": "Jumadil Awal", "Jumada al-thani": "Jumadil Akhir", "Rajab": "Rajab", "Sha'ban": "Sya'ban", "Ramadan": "Ramadhan", "Shawwal": "Syawal", "Dhu al-Qi'dah": "Dzulqa'dah", "Dhu al-Hijjah": "Dzulhijjah" };
        
        const elHijri = document.getElementById('sholat-hijri-date');
        if (elHijri) elHijri.innerText = `${hijri.day} ${namaBulanIndo[hijri.month.en] || hijri.month.en} ${hijri.year} H`;

        const sholatList = [
            { id: 'subuh', nama: 'Subuh', time: timings.Fajr }, { id: 'dzuhur', nama: 'Dzuhur', time: timings.Dhuhr },
            { id: 'ashar', nama: 'Ashar', time: timings.Asr }, { id: 'maghrib', nama: 'Maghrib', time: timings.Maghrib }, { id: 'isya', nama: 'Isya', time: timings.Isha }
        ];

        sholatList.forEach(s => {
            const elPillTime = document.getElementById(`time-${s.id}`);
            if (elPillTime) elPillTime.innerText = s.time.substring(0, 5);
        });

        function updateCountdown() {
            const now = new Date();
            let activeSholat = null, nextSholat = null, targetDate = null;
            sholatList.forEach(s => { const p = document.getElementById(`pill-${s.id}`); if (p) p.classList.remove('sholat-pill-active'); });

            for (let s of sholatList) {
                const [jam, mnt] = s.time.split(':').map(Number);
                const sDate = new Date(); sDate.setHours(jam, mnt, 0, 0);
                const diffMnit = (now - sDate) / 60000;
                if (diffMnit >= 0 && diffMnit <= 10) { activeSholat = s; break; }
            }

            if (activeSholat) {
                const activePill = document.getElementById(`pill-${activeSholat.id}`);
                if (activePill) activePill.classList.add('sholat-pill-active');
                elLabel.innerHTML = `<span style="color:var(--neon-green);">Sedang Memasuki Waktu Sholat ${activeSholat.nama}</span>`;
                elTimer.innerText = "00:00:00";
                return;
            }

            for (let s of sholatList) {
                const [jam, mnt] = s.time.split(':').map(Number);
                const sDate = new Date(); sDate.setHours(jam, mnt, 0, 0);
                if (sDate > now) { nextSholat = s; targetDate = sDate; break; }
            }

            if (!nextSholat) {
                nextSholat = sholatList[0];
                targetDate = new Date(); targetDate.setDate(targetDate.getDate() + 1);
                targetDate.setHours(...nextSholat.time.split(':').map(Number), 0, 0);
            }

            const activePill = document.getElementById(`pill-${nextSholat.id}`);
            if (activePill) activePill.classList.add('sholat-pill-active');

            const diffSecTotal = Math.floor((targetDate - now) / 1000);
            elLabel.innerText = `Menuju Waktu ${nextSholat.nama}`;
            elTimer.innerText = `${String(Math.floor(diffSecTotal / 3600)).padStart(2, '0')}:${String(Math.floor((diffSecTotal % 3600) / 60)).padStart(2, '0')}:${String(diffSecTotal % 60).padStart(2, '0')}`;
        }
        updateCountdown();
        sholatIntervalTimer = setInterval(updateCountdown, 1000);
    } catch (e) {
        elLabel.innerText = "Jadwal Sholat Offline"; elTimer.innerText = "--:--:--";
    }
}

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
        if (listKelasAktif.length === 0) {
            canvas.style.display = 'none'; if (msgKosong) msgKosong.style.display = 'block'; return;
        }

        const labelsKelas = [], persenBelum = [], persenTerbata = [], persenCepat = [], persenLancarMahir = [];
        const countBelumArr = [], countTerbataArr = [], countCepatArr = [], countLancarMahirArr = [];

        listKelasAktif.forEach(kls => {
            const anggotaKls = (resAnggota.data || []).filter(a => a.id_kelas === kls.id);
            const totalSiswa = anggotaKls.length;
            if (totalSiswa > 0) {
                labelsKelas.push(kls.nama_kelas);
                let cBelum = 0, cTerbata = 0, cCepat = 0, cLancar = 0;
                anggotaKls.forEach(agt => {
                    const rowBaca = (resBaca.data || []).find(b => b.id_kelas === kls.id && b.id_siswa === agt.id_siswa);
                    const val = rowBaca?.kelancaran_membaca?.trim() || '';
                    if (!val) cBelum++;
                    else if (val.includes('Tidak bisa') || val.includes('Terbata-bata')) cTerbata++;
                    else if (val.includes('Cepat') || val.includes('cepat')) cCepat++;
                    else if (val.includes('Lancar') || val.includes('lancar') || val.includes('Mahir')) cLancar++;
                    else cBelum++;
                });
                persenBelum.push(Math.round((cBelum / totalSiswa) * 100)); persenTerbata.push(Math.round((cTerbata / totalSiswa) * 100));
                persenCepat.push(Math.round((cCepat / totalSiswa) * 100)); persenLancarMahir.push(Math.round((cLancar / totalSiswa) * 100));
                countBelumArr.push(cBelum); countTerbataArr.push(cTerbata); countCepatArr.push(cCepat); countLancarMahirArr.push(cLancar);
            }
        });

        canvas.style.display = 'block'; if (msgKosong) msgKosong.style.display = 'none';
        if (chartQuranInstance) chartQuranInstance.destroy();

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const ctx = canvas.getContext('2d');
        chartQuranInstance = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsKelas,
                datasets: [
                    { label: 'Belum Dinilai', data: persenBelum, counts: countBelumArr, backgroundColor: '#64748b', borderRadius: 6 },
                    { label: 'Belum Bisa & Terbata-bata', data: persenTerbata, counts: countTerbataArr, backgroundColor: '#ef4444', borderRadius: 6 },
                    { label: 'Cepat (Banyak/Sedikit Salah)', data: persenCepat, counts: countCepatArr, backgroundColor: '#f59e0b', borderRadius: 6 },
                    { label: 'Lancar & Mahir', data: persenLancarMahir, counts: countLancarMahirArr, backgroundColor: '#05d58a', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: isLight ? '#64748b' : '#8494a8', font: { size: 10, family: 'Poppins' } } },
                           tooltip: { callbacks: { label: function(c) { return ` ${c.dataset.label}: ${c.dataset.counts[c.dataIndex]} Siswa (${c.raw}%)`; } } } },
                scales: {
                    x: { grid: { color: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)' }, ticks: { color: isLight ? '#0f172a' : '#ffffff', font: { family: 'Poppins', size: 11 } } },
                    y: { beginAtZero: true, max: 100, grid: { color: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)' }, ticks: { color: isLight ? '#64748b' : '#8494a8', stepSize: 20, callback: function(v) { return v + '%'; }, font: { family: 'Poppins', size: 10 } } }
                }
            }
        });
    } catch (e) { console.error("Gagal merender grafik Quran:", e); }
}

async function loadAnalitikKehadiranPerKelas() {
    const container = document.getElementById('dash-list-analitik-kehadiran');
    if (!container) return;
    try {
        const { data, error } = await supabase.from('view_analitik_kehadiran').select('*');
        if (error) throw error;
        if (!data || data.length === 0) { container.innerHTML = '<div style="color:var(--text-abu); font-size:12px; text-align:center;">Belum ada kelas aktif.</div>'; return; }

        let html = '';
        data.forEach(kls => {
            const jmlHadir = parseInt(kls.total_hadir) || 0, jmlValid = parseInt(kls.total_valid) || 0;
            const persen = jmlValid > 0 ? Math.round((jmlHadir / jmlValid) * 100) : 0;
            const clr = persen < 75 ? 'var(--neon-red)' : (persen < 85 ? 'var(--neon-yellow)' : 'var(--neon-green)');
            html += `<div><div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600;"><span style="color:var(--text-putih);">${kls.nama_kelas}</span><span style="color:${clr}; font-weight:700;">${persen}% Hadir (${jmlValid} data)</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${persen}%; background:${clr};"></div></div></div>`;
        });
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div style="color:var(--neon-red); font-size:11px;">Gagal memuat data kehadiran: ${e.message}</div>`; }
}

async function loadAnalitikKetuntasanTugas() {
    const container = document.getElementById('dash-list-analitik-tugas');
    if (!container) return;
    try {
        const { data, error } = await supabase.from('view_analitik_tugas').select('*');
        if (error) throw error;
        if (!data || data.length === 0) { container.innerHTML = '<div style="color:var(--text-abu); font-size:12px; text-align:center;">Belum ada kelas aktif.</div>'; return; }

        let html = '';
        data.forEach(kls => {
            const totalSlot = parseInt(kls.total_slot) || 0, totalTuntas = parseInt(kls.total_tuntas) || 0, totalTugas = parseInt(kls.total_tugas) || 0;
            const persen = totalSlot > 0 ? Math.round((totalTuntas / totalSlot) * 100) : 0;
            const clr = persen < 70 ? 'var(--neon-red)' : (persen < 85 ? 'var(--neon-yellow)' : (persen === 100 ? 'var(--neon-green)' : 'var(--neon-purple)'));
            html += `<div><div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600;"><span style="color:var(--text-putih);">${kls.nama_kelas} (${totalTugas} Tugas)</span><span style="color:${clr}; font-weight:700;">${persen}% Tuntas (${totalTuntas}/${totalSlot} data)</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${persen}%; background:${clr};"></div></div></div>`;
        });
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div style="color:var(--neon-red); font-size:11px;">Gagal memuat ketuntasan tugas: ${e.message}</div>`; }
}

async function loadInfoSistem() {
    const el = document.getElementById('dash-info-sistem');
    if (!el) return;
    try {
        const { data, error } = await supabase.from('profilaplikasi').select('*').limit(1).maybeSingle();
        if (error) throw error;
        const p = data || {};
        el.innerHTML = `<b>Sekolah:</b> ${p.nama_sekolah || '-'}<br><b>Guru Pengampu:</b> ${p.nama_guru || '-'}<br><b>NIP:</b> ${p.nip_guru || '-'}<br><b>Tahun Ajaran / Semester:</b> ${p.tahun_ajaran_aktif || '-'} (${p.semester_aktif || '-'})<br><b>Status Database:</b> <span style="color:var(--neon-green); font-weight:700;"><i class="fa-solid fa-circle-dot"></i> Terhubung</span>`;
    } catch (e) { el.innerHTML = 'Gagal memuat identitas sistem.'; }
}