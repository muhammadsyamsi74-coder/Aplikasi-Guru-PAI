// js/modules/tools/tools-dalil.js
import supabase from '../../supabase.js';

let kategoriDalilAktif = 'quran'; // 'quran' | 'hadis'
let modePencarianAktif = 'kata';  // 'kata' | 'spesifik'
let cacheHasilPencarianDalil = [];

const DAFTAR_114_SURAH = [
    { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 },
    { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 },
    { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 },
    { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 },
    { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 },
    { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 },
    { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Ta-Ha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 },
    { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 },
    { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 },
    { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 },
    { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 },
    { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Ya-Sin", ayat: 83 },
    { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 },
    { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 },
    { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 },
    { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 },
    { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 },
    { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 },
    { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 },
    { no: 58, nama: "Al-Mujadilah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 },
    { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 },
    { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 },
    { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 },
    { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 },
    { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 },
    { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 },
    { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 },
    { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 },
    { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, nama: "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 },
    { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 },
    { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 },
    { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 },
    { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 },
    { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 },
    { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 },
    { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 },
    { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Lahab", ayat: 5 },
    { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 }
];

// ================= INISIALISASI & KONTROL UI DALIL =================
window.resetStatePencarianDalil = function() {
    cacheHasilPencarianDalil = [];
    window.initDropdownSurahQuran();
};

window.initDropdownSurahQuran = function() {
    const sel = document.getElementById('pilih-surah-quran');
    if (!sel || sel.children.length > 0) return;
    let opt = '';
    DAFTAR_114_SURAH.forEach(s => { 
        opt += `<option value="${s.no}">${s.no}. QS. ${s.nama} (${s.ayat} Ayat)</option>`; 
    });
    sel.innerHTML = opt;
};

window.toggleSectionDalil = function() {
    const content = document.getElementById('section-dalil-content');
    const icon = document.getElementById('icon-chevron-dalil');
    const btn = document.getElementById('btn-toggle-dalil-section');
    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-dalil"></i>';
        window.initDropdownSurahQuran();
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-dalil"></i>';
    }
};

window.gantiKategoriDalil = function(kategori) {
    kategoriDalilAktif = kategori;
    const tabQ = document.getElementById('tab-cari-quran');
    const tabH = document.getElementById('tab-cari-hadis');
    const lblSpesifik = document.getElementById('label-mode-spesifik');

    if (kategori === 'quran') {
        if (tabQ) tabQ.classList.add('active');
        if (tabH) tabH.classList.remove('active');
        if (lblSpesifik) lblSpesifik.innerText = 'surat';
    } else {
        if (tabH) tabH.classList.add('active');
        if (tabQ) tabQ.classList.remove('active');
        if (lblSpesifik) lblSpesifik.innerText = 'Kitab Hadist';
    }
    window.gantiModePencarian(modePencarianAktif);
};

window.gantiModePencarian = function(mode) {
    modePencarianAktif = mode;
    const boxKata = document.getElementById('box-cari-kata');
    const boxSpesifikQuran = document.getElementById('box-cari-spesifik-quran');
    const boxSpesifikHadis = document.getElementById('box-cari-spesifik-hadis');

    if (mode === 'kata') {
        if (boxKata) boxKata.style.display = 'block';
        if (boxSpesifikQuran) boxSpesifikQuran.style.display = 'none';
        if (boxSpesifikHadis) boxSpesifikHadis.style.display = 'none';
    } else {
        if (boxKata) boxKata.style.display = 'none';
        if (kategoriDalilAktif === 'quran') {
            if (boxSpesifikQuran) boxSpesifikQuran.style.display = 'flex';
            if (boxSpesifikHadis) boxSpesifikHadis.style.display = 'none';
            window.initDropdownSurahQuran();
        } else {
            if (boxSpesifikQuran) boxSpesifikQuran.style.display = 'none';
            if (boxSpesifikHadis) boxSpesifikHadis.style.display = 'flex';
        }
    }
};

// ================= HELPER PENCARIAN DALIL =================
function acakUrutanHasil(array) {
    if (!Array.isArray(array) || array.length <= 1) return array || [];
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function pisahkanSanadDanMatan(teksArab, teksIndo) {
    let arabHtml = teksArab || '';
    let indoHtml = teksIndo || '';

    const regexIndo = /^(.*?(?:bersabda|berkata|katanya)\s*:\s*)(.*)$/is;
    const matchIndo = indoHtml.match(regexIndo);

    if (matchIndo && matchIndo[1] && matchIndo[2]) {
        indoHtml = `<span class="sanad-text">${matchIndo[1]}</span><span class="matan-text">"${matchIndo[2].replace(/^["“]|["”]$/g, '').trim()}"</span>`;
    } else {
        indoHtml = `<span class="matan-text">"${indoHtml}"</span>`;
    }

    if (arabHtml) {
        const regexArab = /^(.*?(?:قَالَ رَسُولُ اللَّهِ|قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ|عَنْ.*?قَالَ|قَالَ)\s*:\s*)(.*)$/is;
        const matchArab = arabHtml.match(regexArab);

        if (matchArab && matchArab[1] && matchArab[2]) {
            arabHtml = `<span class="sanad-text">${matchArab[1]}</span><span class="matan-text">${matchArab[2].trim()}</span>`;
        } else {
            arabHtml = `<span class="matan-text">${arabHtml}</span>`;
        }
    }
    return { arabHtml, indoHtml };
}

function beriStabiloKata(teks, kataKunci) {
    if (!teks || !kataKunci) return teks || '';
    const listKata = kataKunci.trim().split(/\s+/).filter(k => k.length > 0).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (listKata.length === 0) return teks;
    const polaRegex = new RegExp(`(${listKata.join('|')})`, 'gi');
    return teks.replace(polaRegex, '<mark class="highlight-kata">$1</mark>');
}

window.salinTeksDalil = async function(index) {
    const item = cacheHasilPencarianDalil[index];
    if (!item) return;

    let teksDisalin = '';
    if (kategoriDalilAktif === 'quran') {
        const teksArab = item.teks_arab ? `${item.teks_arab}\n\n` : '';
        teksDisalin = `${teksArab}Artinya: "${item.terjemahan_id || ''}"\n(QS. ${item.nama_surah} [${item.surah_no}:${item.ayat_no}])`;
    } else {
        const teksArab = item.teks_arab ? `${item.teks_arab}\n\n` : '';
        teksDisalin = `${teksArab}Artinya: "${item.terjemahan_id || ''}"\n(${item.kitab} No. ${item.nomor_hadis})`;
    }

    try {
        await navigator.clipboard.writeText(teksDisalin.trim());
        alert("Teks dalil berhasil disalin!");
    } catch (err) {
        const temp = document.createElement("textarea");
        temp.value = teksDisalin.trim();
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        alert("Teks dalil berhasil disalin!");
    }
};

// ================= EKSEKUSI PENCARIAN UTAMA =================
window.eksekusiCariDalil = async function() {
    const container = document.getElementById('hasil-pencarian-dalil');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--neon-green); font-size:11px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat dalil...</div>';

    try {
        // ================= JALUR 1: AL-QUR'AN =================
        if (kategoriDalilAktif === 'quran') {
            let dataAyat = [];
            let kataHighlight = '';

            if (modePencarianAktif === 'kata') {
                const inputKata = document.getElementById('input-keyword-dalil');
                const raw = inputKata ? inputKata.value.trim() : '';
                if (!raw) { alert("Masukkan minimal 1 kata kunci!"); container.innerHTML = ''; return; }
                kataHighlight = raw.split(/\s+/).slice(0, 5).join(' ');

                const { data, error } = await supabase.rpc('cari_quran_multikata', { kata_kunci: kataHighlight, limit_hasil: 30 });
                if (error) throw error;
                dataAyat = acakUrutanHasil(data || []).slice(0, 30);
            } else {
                const surahNo = parseInt(document.getElementById('pilih-surah-quran').value) || 1;
                let ayatMulai = parseInt(document.getElementById('input-ayat-mulai').value) || 1;
                let ayatSampai = parseInt(document.getElementById('input-ayat-sampai').value) || ayatMulai;

                if (ayatSampai < ayatMulai) {
                    const temp = ayatMulai;
                    ayatMulai = ayatSampai;
                    ayatSampai = temp;
                }

                if ((ayatSampai - ayatMulai + 1) > 10) {
                    ayatSampai = ayatMulai + 9;
                    alert(`Rentang ayat dibatasi maksimal 10 ayat. Menampilkan ayat ${ayatMulai} sampai ${ayatSampai}.`);
                }

                const { data, error } = await supabase
                    .from('quran_lengkap')
                    .select('id, surah_no, nama_surah, ayat_no, teks_arab, terjemahan_id')
                    .eq('surah_no', surahNo)
                    .gte('ayat_no', ayatMulai)
                    .lte('ayat_no', ayatSampai)
                    .order('ayat_no', { ascending: true });
                    
                if (error) throw error;
                dataAyat = data || [];
            }

            if (dataAyat.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Tidak ada ayat yang cocok dengan kriteria pencarian.</div>';
                return;
            }

            cacheHasilPencarianDalil = dataAyat;
            let html = '';
            cacheHasilPencarianDalil.forEach((item, index) => {
                const terjemahanStabilo = kataHighlight ? beriStabiloKata(item.terjemahan_id, kataHighlight) : item.terjemahan_id;
                html += `
                    <div class="quran-hadis-item-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="badge-info-dalil"><i class="fa-solid fa-book-quran"></i> QS. ${item.nama_surah} [${item.surah_no}:${item.ayat_no}]</span>
                            <button onclick="salinTeksDalil(${index})" class="btn-icon-doc" title="Salin Lengkap"><i class="fa-solid fa-copy"></i></button>
                        </div>
                        <div class="text-arab-box">${item.teks_arab || ''}</div>
                        <div class="text-terjemahan-box"><b style="color:var(--text-abu);">Artinya:</b> "${terjemahanStabilo}"</div>
                    </div>
                `;
            });
            container.innerHTML = html;

        // ================= JALUR 2: HADITS =================
        } else {
            let dataHadis = [];
            let kataHighlight = '';

            if (modePencarianAktif === 'kata') {
                const inputKata = document.getElementById('input-keyword-dalil');
                const raw = inputKata ? inputKata.value.trim() : '';
                if (!raw) { alert("Masukkan minimal 1 kata kunci!"); container.innerHTML = ''; return; }
                kataHighlight = raw.split(/\s+/).slice(0, 5).join(' ');

                const { data, error } = await supabase.rpc('cari_hadis_multikata', { kata_kunci: kataHighlight, limit_hasil: 30 });
                if (error) throw error;
                dataHadis = acakUrutanHasil(data || []).slice(0, 30);
            } else {
                const namaKitab = document.getElementById('pilih-kitab-hadis').value;
                const noHadis = parseInt(document.getElementById('input-nomor-hadis').value);

                if (!noHadis || noHadis <= 0) { alert("Masukkan nomor hadits yang valid!"); container.innerHTML = ''; return; }

                const { data, error } = await supabase
                    .from('bank_hadis')
                    .select('id, kitab, nomor_hadis, bab, teks_arab, terjemahan_id, derajat_hadis')
                    .ilike('kitab', `%${namaKitab}%`)
                    .eq('nomor_hadis', noHadis)
                    .limit(1);
                    
                if (error) throw error;
                dataHadis = data || [];
            }

            if (dataHadis.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Hadits tidak ditemukan pada kriteria tersebut.</div>';
                return;
            }

            cacheHasilPencarianDalil = dataHadis;
            let html = '';
            cacheHasilPencarianDalil.forEach((item, index) => {
                const terjemahanStabilo = kataHighlight ? beriStabiloKata(item.terjemahan_id, kataHighlight) : item.terjemahan_id;
                const { arabHtml, indoHtml } = pisahkanSanadDanMatan(item.teks_arab, terjemahanStabilo);
                const blockArab = item.teks_arab ? `<div class="text-arab-box">${arabHtml}</div>` : '';

                html += `
                    <div class="quran-hadis-item-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="badge-info-dalil" style="color:var(--neon-yellow); border-color:rgba(245,158,11,0.3); background:rgba(245,158,11,0.15);"><i class="fa-solid fa-scroll"></i> ${item.kitab} No. ${item.nomor_hadis} (${item.derajat_hadis || 'Shahih'})</span>
                            <button onclick="salinTeksDalil(${index})" class="btn-icon-doc" title="Salin Hadits"><i class="fa-solid fa-copy"></i></button>
                        </div>
                        ${blockArab}
                        <div class="text-terjemahan-box"><b style="color:var(--text-abu);">Artinya:</b> ${indoHtml}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

    } catch (e) {
        console.error("Gagal pencarian dalil:", e);
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--neon-red); font-size:11px;">Gagal memuat pencarian: ${e.message}</div>`;
    }
};