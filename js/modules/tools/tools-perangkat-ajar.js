// js/modules/tools/tools-perangkat-ajar.js
import supabase from '../../supabase.js';

let cachePerangkatAjar = [];
let isExpandedPerangkat = false;
let isPerangkatLoaded = false;

// ================= TOGGLE SECTION & FORM =================
window.toggleSectionPerangkat = function() {
    const content = document.getElementById('section-perangkat-content');
    const icon = document.getElementById('icon-chevron-perangkat');
    const btn = document.getElementById('btn-toggle-perangkat-section');
    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-perangkat"></i>';

        if (!isPerangkatLoaded) {
            window.loadCardsPerangkatAjar();
            isPerangkatLoaded = true;
        }
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-perangkat"></i>';
    }
};

window.toggleFormPerangkatAjar = function() {
    const wrap = document.getElementById('form-wrap-perangkat');
    if (wrap) wrap.style.display = (wrap.style.display === 'none') ? 'block' : 'none';
};

window.toggleInputLainnyaPerangkat = function(el) {
    const inp = document.getElementById('per-jenis-kustom');
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

// ================= SIMPAN PERANGKAT AJAR =================
window.simpanPerangkatAjar = async function(event) {
    event.preventDefault();
    let jenis = document.getElementById('per-jenis').value;
    if (jenis === 'Lainnya') {
        jenis = document.getElementById('per-jenis-kustom').value.trim();
    }

    const semester = document.getElementById('per-semester').value;
    const deskripsi = document.getElementById('per-deskripsi').value.trim();
    const tahun = document.getElementById('per-tahun').value.trim();
    const isPinned = document.getElementById('per-pin').checked;
    const link = document.getElementById('per-link').value.trim();

    if (!jenis) {
        alert("Jenis perangkat ajar wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-simpan-perangkat');
    const txtAsli = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            btn.disabled = true;
        }

        if (isPinned) {
            const { count, error: errCount } = await supabase
                .from('perangkatajar')
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) {
                alert("Batas maksimal 25 Pin tercapai!");
                return;
            }
        }

        const { error } = await supabase.from('perangkatajar').insert([{
            jenis_perangkat: jenis,
            deskripsi_perangkat: deskripsi || null,
            tahun_ajaran: tahun,
            semester: semester,
            is_pinned: isPinned,
            link_perangkat: link
        }]);

        if (error) throw error;

        alert("Perangkat ajar berhasil disimpan!");
        event.target.reset();
        
        const inpKustom = document.getElementById('per-jenis-kustom');
        if (inpKustom) inpKustom.style.display = 'none';
        
        if (typeof window.setTahunAjaranOtomatis === 'function') {
            window.setTahunAjaranOtomatis();
        }
        
        const formWrap = document.getElementById('form-wrap-perangkat');
        if (formWrap) formWrap.style.display = 'none';
        
        window.loadCardsPerangkatAjar();

    } catch (e) {
        alert("Gagal menyimpan perangkat: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = txtAsli;
            btn.disabled = false;
        }
    }
};

// ================= LOAD & RENDER PERANGKAT AJAR =================
window.loadCardsPerangkatAjar = async function() {
    const container = document.getElementById('list-cards-perangkat');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('perangkatajar')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        cachePerangkatAjar = data || [];
        renderPerangkatAjarUI();

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal memuat perangkat: ${e.message}</div>`;
    }
};

function renderPerangkatAjarUI() {
    const container = document.getElementById('list-cards-perangkat');
    const btnExpand = document.getElementById('btn-expand-perangkat');
    if (!container) return;

    if (cachePerangkatAjar.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada perangkat ajar yang diunggah.</div>';
        if (btnExpand) btnExpand.style.display = 'none';
        return;
    }

    const dataTampil = isExpandedPerangkat ? cachePerangkatAjar : cachePerangkatAjar.slice(0, 9);

    let html = '';
    dataTampil.forEach(item => {
        const pinClass = item.is_pinned ? 'pinned' : '';
        const iconPinBtn = item.is_pinned 
            ? '<i class="fa-solid fa-thumbtack" style="color:var(--neon-yellow);"></i>' 
            : '<i class="fa-regular fa-thumbtack" style="color:var(--text-abu);"></i>';

        html += `
            <div class="item-doc-row ${pinClass}">
                <div class="doc-left-area">
                    <button onclick="togglePinDoc('perangkatajar', '${item.id}', ${item.is_pinned})" class="btn-icon-doc" title="Pin ke atas">${iconPinBtn}</button>
                    <div class="doc-text-wrap">
                        <span class="badge-doc-tag" style="color:var(--neon-purple); background:rgba(139,92,246,0.15); border-color:rgba(139,92,246,0.3);">${item.jenis_perangkat}</span>
                        <span style="font-size:11px; color:var(--text-abu); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.deskripsi_perangkat || ''}">
                            ${item.deskripsi_perangkat || '-'}
                        </span>
                    </div>
                </div>
                <div class="doc-actions-wrap">
                    <button onclick="window.open('${item.link_perangkat}', '_blank')" class="btn-icon-doc" style="color:var(--neon-green); border-color:rgba(5,213,138,0.3);" title="Buka Link">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button onclick="copyLinkDoc('${item.link_perangkat}')" class="btn-icon-doc" style="color:var(--neon-blue); border-color:rgba(59,130,246,0.3);" title="Salin Link">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="hapusDocItem('perangkatajar', '${item.id}', '${item.jenis_perangkat}')" class="btn-icon-doc" style="color:var(--neon-red); border-color:rgba(239,68,68,0.3);" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (btnExpand) {
        if (cachePerangkatAjar.length > 9) {
            btnExpand.style.display = 'flex';
            btnExpand.innerHTML = isExpandedPerangkat 
                ? '<i class="fa-solid fa-chevron-up"></i> Tampilkan Lebih Sedikit' 
                : `<i class="fa-solid fa-chevron-down"></i> Tampilkan Semua (${cachePerangkatAjar.length})`;
        } else {
            btnExpand.style.display = 'none';
        }
    }
}

window.toggleExpandPerangkat = function() {
    isExpandedPerangkat = !isExpandedPerangkat;
    renderPerangkatAjarUI();
};