// js/modules/tools/tools-whatsapp.js
import supabase from '../../supabase.js';

let cacheSiswaPerKelasMap = new Map();
let isWaLoaded = false;

// ================= TOGGLE SECTION WA GROUP =================
window.toggleSectionWaGroup = function() {
    const content = document.getElementById('section-wa-content');
    const icon = document.getElementById('icon-chevron-wa');
    const btn = document.getElementById('btn-toggle-wa-section');
    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-wa"></i>';

        if (!isWaLoaded) {
            window.loadWhatsAppGroupKelas();
            isWaLoaded = true;
        }
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-wa"></i>';
    }
};

function formatNomorWaInternasional(no) {
    if (!no) return '';
    let clean = no.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '62' + clean;
    return clean;
}

// ================= LOAD & RENDER WHATSAPP GROUP KELAS =================
window.loadWhatsAppGroupKelas = async function() {
    const container = document.getElementById('container-wa-kelas');
    if (!container) return;

    try {
        const [resKelas, resAnggota] = await Promise.all([
            supabase.from('kelas')
                .select(`id, nama_kelas, tingkat, link_wa_group, nama_walikelas, wa_walikelass, ketua:id_ketua(id, nama_siswa, nomor_wa), sekretaris:id_sekretaris(id, nama_siswa, nomor_wa), bendahara:id_bendahara(id, nama_siswa, nomor_wa)`)
                .eq('status_kelas', true).order('tingkat').order('nama_kelas'),
            supabase.from('anggota_kelas').select('id_kelas, id_siswa, siswa(id, nama_siswa, nomor_wa)')
        ]);

        if (resKelas.error) throw resKelas.error;

        const listKelas = resKelas.data || [];
        const allAnggota = resAnggota.data || [];

        cacheSiswaPerKelasMap.clear();
        listKelas.forEach(kls => {
            const siswaKls = allAnggota.filter(a => a.id_kelas === kls.id && a.siswa).map(a => a.siswa);
            siswaKls.sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
            cacheSiswaPerKelasMap.set(kls.id, { klsInfo: kls, siswa: siswaKls });
        });

        if (listKelas.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada kelas aktif.</div>';
            return;
        }

        let html = '';
        listKelas.forEach(item => {
            const linkGrup = item.link_wa_group || '';
            const btnGroupAttr = linkGrup ? `onclick="window.open('${linkGrup}', '_blank')"` : `onclick="bukaModalEditWaKelas('${item.id}')" title="Klik untuk menambahkan link grup"`;
            const btnGroupClass = linkGrup ? '' : 'disabled';
            const btnGroupText = linkGrup ? '<i class="fa-solid fa-users"></i> Buka Grup WA' : '<i class="fa-solid fa-link-slash"></i> Belum Ada Link Grup (Atur)';

            const renderWaliKelas = () => {
                if (!item.nama_walikelas) {
                    return `<div class="pengurus-item" style="border-left: 2px solid var(--neon-green);"><span style="color:var(--text-abu);">🌿 <b>Wali Kelas:</b> -</span><span style="font-size:9px; color:var(--text-abu);">-</span></div>`;
                }
                const noWaFormatted = formatNomorWaInternasional(item.wa_walikelass);
                const pesan = encodeURIComponent(`Assalamu'alaikum Bapak/Ibu ${item.nama_walikelas} (Wali Kelas ${item.nama_kelas}), mohon informasi terkait pembelajaran PAI.`);
                const linkWaPersonal = noWaFormatted ? `https://wa.me/${noWaFormatted}?text=${pesan}` : '';
                const btnWa = linkWaPersonal ? `<a href="${linkWaPersonal}" target="_blank" class="btn-wa-personal"><i class="fa-brands fa-whatsapp"></i> WA</a>` : `<span style="font-size:8.5px; color:var(--text-abu);">No WA (-)</span>`;

                return `
                    <div class="pengurus-item" style="border-left: 2px solid var(--neon-green);">
                        <span style="color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px;" title="${item.nama_walikelas}">🌿 <b style="color:var(--neon-green);">Wali Kelas:</b> ${item.nama_walikelas}</span>
                        ${btnWa}
                    </div>
                `;
            };

            const renderPengurus = (label, icon, color, objSiswa) => {
                if (!objSiswa) {
                    return `<div class="pengurus-item"><span style="color:var(--text-abu);">${icon} <b>${label}:</b> -</span><span style="font-size:9px; color:var(--text-abu);">-</span></div>`;
                }
                const noWaFormatted = formatNomorWaInternasional(objSiswa.nomor_wa);
                const pesan = encodeURIComponent(`Assalamu'alaikum ${objSiswa.nama_siswa} (${label} Kelas ${item.nama_kelas}), mohon informasi terkait pembelajaran PAI.`);
                const linkWaPersonal = noWaFormatted ? `https://wa.me/${noWaFormatted}?text=${pesan}` : '';
                const btnWa = linkWaPersonal ? `<a href="${linkWaPersonal}" target="_blank" class="btn-wa-personal"><i class="fa-brands fa-whatsapp"></i> WA</a>` : `<span style="font-size:8.5px; color:var(--text-abu);">No WA (-)</span>`;

                return `
                    <div class="pengurus-item">
                        <span style="color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px;" title="${objSiswa.nama_siswa}">${icon} <b style="color:${color};">${label}:</b> ${objSiswa.nama_siswa}</span>
                        ${btnWa}
                    </div>
                `;
            };

            html += `
                <div class="card-wa-kelas">
                    <div class="header-wa-kelas">
                        <b><i class="fa-solid fa-chalkboard" style="color:var(--neon-green);"></i> Kelas ${item.nama_kelas}</b>
                        <button onclick="bukaModalEditWaKelas('${item.id}')" class="btn-compact" style="background:transparent; border:1px solid rgba(5,213,138,0.3); color:var(--neon-green); padding:3px 8px !important;">
                            <i class="fa-solid fa-pen-to-square"></i> Edit Link
                        </button>
                    </div>
                    <button ${btnGroupAttr} class="btn-open-group ${btnGroupClass}">${btnGroupText}</button>
                    <div class="pengurus-list">
                        <span style="font-size:9px; font-weight:700; color:var(--text-abu); text-transform:uppercase; letter-spacing:0.5px;">Wali & Pengurus Kelas:</span>
                        ${renderWaliKelas()}
                        ${renderPengurus('Ketua', '☀️', 'var(--neon-yellow)', item.ketua)}
                        ${renderPengurus('Sekretaris', '🌙', 'var(--neon-blue)', item.sekretaris)}
                        ${renderPengurus('Bendahara', '⭕', 'var(--neon-red)', item.bendahara)}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal memuat WhatsApp Kelas: ${e.message}</div>`;
    }
};

// ================= MODAL & KONFIGURASI PENGURUS =================
window.bukaModalEditWaKelas = function(idKelas) {
    const dataKls = cacheSiswaPerKelasMap.get(idKelas);
    if (!dataKls) return;

    const modal = document.getElementById('modal-edit-wa-kelas');
    const title = document.getElementById('modal-wa-title-kelas');
    const inpId = document.getElementById('modal-wa-id-kelas');
    const inpLink = document.getElementById('modal-wa-link-grup');

    const inpNamaWali = document.getElementById('modal-wa-nama-walikelas');
    const inpNoWali = document.getElementById('modal-wa-no-walikelas');

    const selKetua = document.getElementById('modal-wa-id-ketua');
    const selSekre = document.getElementById('modal-wa-id-sekretaris');
    const selBenda = document.getElementById('modal-wa-id-bendahara');

    const inpNoKetua = document.getElementById('modal-wa-no-ketua');
    const inpNoSekre = document.getElementById('modal-wa-no-sekretaris');
    const inpNoBenda = document.getElementById('modal-wa-no-bendahara');

    title.innerText = `Kelas ${dataKls.klsInfo.nama_kelas}`;
    inpId.value = idKelas;
    inpLink.value = dataKls.klsInfo.link_wa_group || '';

    if (inpNamaWali) inpNamaWali.value = dataKls.klsInfo.nama_walikelas || '';
    if (inpNoWali) inpNoWali.value = dataKls.klsInfo.wa_walikelass || '';

    let optSiswa = '<option value="">-- Pilih Siswa --</option>';
    dataKls.siswa.forEach(s => { optSiswa += `<option value="${s.id}" data-wa="${s.nomor_wa || ''}">${s.nama_siswa}</option>`; });

    selKetua.innerHTML = optSiswa;
    selSekre.innerHTML = optSiswa;
    selBenda.innerHTML = optSiswa;

    const k = dataKls.klsInfo.ketua;
    const s = dataKls.klsInfo.sekretaris;
    const b = dataKls.klsInfo.bendahara;

    selKetua.value = k ? k.id : '';
    inpNoKetua.value = k ? (k.nomor_wa || '') : '';

    selSekre.value = s ? s.id : '';
    inpNoSekre.value = s ? (s.nomor_wa || '') : '';

    selBenda.value = b ? b.id : '';
    inpNoBenda.value = b ? (b.nomor_wa || '') : '';

    modal.style.display = 'flex';
};

window.sinkronNomorPengurus = function(role) {
    const sel = document.getElementById(`modal-wa-id-${role}`);
    const inpNo = document.getElementById(`modal-wa-no-${role}`);
    const selectedOpt = sel ? sel.options[sel.selectedIndex] : null;

    if (selectedOpt && selectedOpt.value) {
        const wa = selectedOpt.getAttribute('data-wa');
        if (inpNo) inpNo.value = wa || '';
    } else {
        if (inpNo) inpNo.value = '';
    }
};

window.simpanKonfigurasiWaKelas = async function(event) {
    event.preventDefault();
    const idKelas = document.getElementById('modal-wa-id-kelas').value;
    const linkGrup = document.getElementById('modal-wa-link-grup').value.trim();

    const namaWali = document.getElementById('modal-wa-nama-walikelas').value.trim() || null;
    const noWali = document.getElementById('modal-wa-no-walikelas').value.trim() || null;

    const idKetua = document.getElementById('modal-wa-id-ketua').value || null;
    const noKetua = document.getElementById('modal-wa-no-ketua').value.trim() || null;

    const idSekre = document.getElementById('modal-wa-id-sekretaris').value || null;
    const noSekre = document.getElementById('modal-wa-no-sekretaris').value.trim() || null;

    const idBenda = document.getElementById('modal-wa-id-bendahara').value || null;
    const noBenda = document.getElementById('modal-wa-no-bendahara').value.trim() || null;

    const btn = document.getElementById('btn-simpan-wa-modal');
    const txtAsli = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            btn.disabled = true;
        }

        const { error: errKelas } = await supabase
            .from('kelas')
            .update({
                link_wa_group: linkGrup || null,
                nama_walikelas: namaWali,
                wa_walikelass: noWali,
                id_ketua: idKetua,
                id_sekretaris: idSekre,
                id_bendahara: idBenda
            })
            .eq('id', idKelas);

        if (errKelas) throw errKelas;

        const updatePromises = [];
        if (idKetua) updatePromises.push(supabase.from('siswa').update({ nomor_wa: noKetua }).eq('id', idKetua));
        if (idSekre) updatePromises.push(supabase.from('siswa').update({ nomor_wa: noSekre }).eq('id', idSekre));
        if (idBenda) updatePromises.push(supabase.from('siswa').update({ nomor_wa: noBenda }).eq('id', idBenda));

        if (updatePromises.length > 0) await Promise.all(updatePromises);

        alert("Pengaturan WhatsApp dan Pengurus Kelas berhasil disimpan!");
        document.getElementById('modal-edit-wa-kelas').style.display = 'none';
        window.loadWhatsAppGroupKelas();

    } catch (e) {
        alert("Gagal menyimpan konfigurasi: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = txtAsli;
            btn.disabled = false;
        }
    }
};