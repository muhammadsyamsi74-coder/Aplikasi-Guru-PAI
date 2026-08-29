// js/modules/tools/tools-materi-ajar.js
import supabase from '../../supabase.js';

let cacheMateriAjar = [];
let isExpandedMateri = false;

// ================= TOGGLE FORM & INPUT LAINNYA =================
window.toggleFormMateriAjar = function() {
    const wrap = document.getElementById('form-wrap-materi');
    if (wrap) wrap.style.display = (wrap.style.display === 'none') ? 'block' : 'none';
};

window.toggleInputLainnyaMateri = function(el) {
    const inp = document.getElementById('mat-jenis-kustom');
    if (!inp) return;
    if (el.value === 'Lainnya') {
        inp.style.display = 'block';
        inp.required = true;
        inp.focus();
    } else {
        inp.style.display = 'none';
        inp.required = false;
        inp.value = '';
    }
};

// ================= SIMPAN MATERI AJAR =================
window.simpanMateriAjar = async function(event) {
    event.preventDefault();
    
    const elJenis = document.getElementById('mat-jenis');
    const elJenisKustom = document.getElementById('mat-jenis-kustom');
    const elSemester = document.getElementById('mat-semester');
    const elJudul = document.getElementById('mat-judul');
    const elDeskripsi = document.getElementById('mat-deskripsi');
    const elTahun = document.getElementById('mat-tahun');
    const elPin = document.getElementById('mat-pin');
    const elLink = document.getElementById('mat-link');

    let jenis = elJenis ? elJenis.value : '';
    if (jenis === 'Lainnya' && elJenisKustom) {
        jenis = elJenisKustom.value.trim();
    }

    const semester = elSemester ? elSemester.value : 'Ganjil';
    const judul = elJudul ? elJudul.value.trim() : '';
    const deskripsi = elDeskripsi ? elDeskripsi.value.trim() : '';
    const tahun = elTahun ? elTahun.value.trim() : '';
    const isPinned = elPin ? elPin.checked : false;
    const link = elLink ? elLink.value.trim() : '';

    if (!jenis) {
        alert("Jenis materi ajar wajib diisi!");
        return;
    }
    if (!judul || !link) {
        alert("Judul dan link materi wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-simpan-materi');
    const txtAsli = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            btn.disabled = true;
        }

        if (isPinned) {
            const { count, error: errCount } = await supabase
                .from('materiajar')
                .select('*', { count: 'exact' })
                .eq('is_pinned', true);
            if (!errCount && count >= 25) {
                alert("Batas maksimal 25 Pin tercapai!");
                if (btn) {
                    btn.innerHTML = txtAsli;
                    btn.disabled = false;
                }
                return;
            }
        }

        const { error } = await supabase.from('materiajar').insert([{
            jenis_materi: jenis,
            judul_materi: judul,
            deskripsi_singkat: deskripsi || null,
            tahun_ajaran: tahun,
            semester: semester,
            is_pinned: isPinned,
            link_materi: link
        }]);

        if (error) throw error;

        alert("Materi ajar berhasil disimpan!");
        event.target.reset();
        
        if (elJenisKustom) elJenisKustom.style.display = 'none';
        
        if (typeof window.setTahunAjaranOtomatis === 'function') {
            window.setTahunAjaranOtomatis();
        }
        
        const formWrap = document.getElementById('form-wrap-materi');
        if (formWrap) formWrap.style.display = 'none';
        
        window.loadCardsMateriAjar();

    } catch (e) {
        alert("Gagal menyimpan materi: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = txtAsli;
            btn.disabled = false;
        }
    }
};

// ================= LOAD & RENDER MATERI AJAR =================
window.loadCardsMateriAjar = async function() {
    const container = document.getElementById('list-cards-materi');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('materiajar')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        cacheMateriAjar = data || [];
        renderMateriAjarUI();

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal: ${e.message}</div>`;
    }
};

function renderMateriAjarUI() {
    const container = document.getElementById('list-cards-materi');
    const btnExpand = document.getElementById('btn-expand-materi');
    if (!container) return;

    if (cacheMateriAjar.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada materi ajar yang diunggah.</div>';
        if (btnExpand) btnExpand.style.display = 'none';
        return;
    }

    const dataTampil = isExpandedMateri ? cacheMateriAjar : cacheMateriAjar.slice(0, 9);

    let html = '';
    dataTampil.forEach(item => {
        const pinClass = item.is_pinned ? 'pinned' : '';
        const iconPinBtn = item.is_pinned 
            ? '<i class="fa-solid fa-thumbtack" style="color:var(--neon-yellow);"></i>' 
            : '<i class="fa-regular fa-thumbtack" style="color:var(--text-abu);"></i>';

        html += `
            <div class="item-doc-row ${pinClass}">
                <div class="doc-left-area">
                    <button onclick="togglePinDoc('materiajar', '${item.id}', ${item.is_pinned})" class="btn-icon-doc" title="Pin ke atas">${iconPinBtn}</button>
                    <div class="doc-text-wrap">
                        <span class="badge-doc-tag">${item.jenis_materi}</span>
                        <b style="font-size:11px; color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.judul_materi}">
                            ${item.judul_materi}
                        </b>
                    </div>
                </div>
                <div class="doc-actions-wrap">
                    <button onclick="window.open('${item.link_materi}', '_blank')" class="btn-icon-doc" style="color:var(--neon-green); border-color:rgba(5,213,138,0.3);" title="Buka Link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button onclick="copyLinkDoc('${item.link_materi}')" class="btn-icon-doc" style="color:var(--neon-blue); border-color:rgba(59,130,246,0.3);" title="Salin Link">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="hapusDocItem('materiajar', '${item.id}', '${item.judul_materi}')" class="btn-icon-doc" style="color:var(--neon-red); border-color:rgba(239,68,68,0.3);" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (btnExpand) {
        if (cacheMateriAjar.length > 9) {
            btnExpand.style.display = 'flex';
            btnExpand.innerHTML = isExpandedMateri 
                ? '<i class="fa-solid fa-chevron-up"></i> Tampilkan Lebih Sedikit' 
                : `<i class="fa-solid fa-chevron-down"></i> Tampilkan Semua (${cacheMateriAjar.length})`;
        } else {
            btnExpand.style.display = 'none';
        }
    }
}

window.toggleExpandMateri = function() {
    isExpandedMateri = !isExpandedMateri;
    renderMateriAjarUI();
};