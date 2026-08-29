// js/modules/tools/tools-ceramah.js
import supabase from '../../supabase.js';

let cacheKonsepCeramah = [];
let isExpandedCeramah = false;
let isCeramahLoaded = false;

// ================= TOGGLE SECTION & FORM =================
window.toggleSectionCeramah = function() {
    const content = document.getElementById('section-ceramah-content');
    const icon = document.getElementById('icon-chevron-ceramah');
    const btn = document.getElementById('btn-toggle-ceramah-section');
    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (icon) icon.className = 'fa-solid fa-chevron-up';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-up" id="icon-chevron-ceramah"></i>';

        if (!isCeramahLoaded) {
            window.loadCardsKonsepCeramah();
            isCeramahLoaded = true;
        }
    } else {
        content.style.display = 'none';
        if (icon) icon.className = 'fa-solid fa-chevron-down';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down" id="icon-chevron-ceramah"></i>';
    }
};

window.toggleFormKonsepCeramah = function() {
    const wrap = document.getElementById('form-wrap-ceramah');
    if (wrap) wrap.style.display = (wrap.style.display === 'none') ? 'block' : 'none';
};

// ================= SIMPAN KONSEP CERAMAH =================
window.simpanKonsepCeramah = async function(event) {
    event.preventDefault();
    const judul = document.getElementById('cer-judul').value.trim();
    const link = document.getElementById('cer-link').value.trim();
    const isPinned = document.getElementById('cer-pin').checked;

    if (!judul || !link) { 
        alert("Judul dan link materi wajib diisi!"); 
        return; 
    }

    const btn = document.getElementById('btn-simpan-ceramah');
    const txtAsli = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            btn.disabled = true;
        }

        if (isPinned) {
            const { count, error: errCount } = await supabase
                .from('konsepceramah')
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) { 
                alert("Batas maksimal 25 Pin tercapai!"); 
                return; 
            }
        }

        const { error } = await supabase.from('konsepceramah').insert([{
            judul_konsep: judul,
            link_materi: link,
            is_pinned: isPinned
        }]);

        if (error) throw error;

        alert("Konsep ceramah/khutbah berhasil disimpan!");
        event.target.reset();
        
        const formWrap = document.getElementById('form-wrap-ceramah');
        if (formWrap) formWrap.style.display = 'none';
        
        window.loadCardsKonsepCeramah();

    } catch (e) {
        alert("Gagal menyimpan konsep ceramah: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = txtAsli;
            btn.disabled = false;
        }
    }
};

// ================= LOAD & RENDER KONSEP CERAMAH =================
window.loadCardsKonsepCeramah = async function() {
    const container = document.getElementById('list-cards-ceramah');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('konsepceramah')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        cacheKonsepCeramah = data || [];
        renderKonsepCeramahUI(cacheKonsepCeramah);
    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--neon-red); font-size:11px;">Gagal: ${e.message}</div>`;
    }
};

function renderKonsepCeramahUI(dataList) {
    const container = document.getElementById('list-cards-ceramah');
    const btnExpand = document.getElementById('btn-expand-ceramah');
    if (!container) return;

    if (!dataList || dataList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-abu); font-size:11px;">Belum ada konsep ceramah yang tersimpan.</div>';
        if (btnExpand) btnExpand.style.display = 'none';
        return;
    }

    const dataTampil = isExpandedCeramah ? dataList : dataList.slice(0, 9);
    let html = '';
    dataTampil.forEach(item => {
        const pinClass = item.is_pinned ? 'pinned' : '';
        const iconPinBtn = item.is_pinned 
            ? '<i class="fa-solid fa-thumbtack" style="color:var(--neon-yellow);"></i>' 
            : '<i class="fa-regular fa-thumbtack" style="color:var(--text-abu);"></i>';

        html += `
            <div class="item-doc-row ${pinClass}">
                <div class="doc-left-area">
                    <button onclick="togglePinDoc('konsepceramah', '${item.id}', ${item.is_pinned})" class="btn-icon-doc" title="Pin ke atas">${iconPinBtn}</button>
                    <div class="doc-text-wrap">
                        <b style="font-size:11px; color:var(--text-putih); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.judul_konsep}">
                            <i class="fa-solid fa-book-quran" style="color:var(--neon-purple); margin-right:4px;"></i>${item.judul_konsep}
                        </b>
                    </div>
                </div>
                <div class="doc-actions-wrap">
                    <button onclick="window.open('${item.link_materi}', '_blank')" class="btn-icon-doc" style="color:var(--neon-green); border-color:rgba(5,213,138,0.3);" title="Buka Link"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                    <button onclick="copyLinkDoc('${item.link_materi}')" class="btn-icon-doc" style="color:var(--neon-blue); border-color:rgba(59,130,246,0.3);" title="Salin Link"><i class="fa-solid fa-copy"></i></button>
                    <button onclick="hapusDocItem('konsepceramah', '${item.id}', '${item.judul_konsep}')" class="btn-icon-doc" style="color:var(--neon-red); border-color:rgba(239,68,68,0.3);" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    if (btnExpand) {
        if (dataList.length > 9) {
            btnExpand.style.display = 'flex';
            btnExpand.innerHTML = isExpandedCeramah ? '<i class="fa-solid fa-chevron-up"></i> Tampilkan Lebih Sedikit' : `<i class="fa-solid fa-chevron-down"></i> Tampilkan Semua (${dataList.length})`;
        } else {
            btnExpand.style.display = 'none';
        }
    }
}

// ================= PENCARIAN / FILTER KATA KUNCI =================
window.cariKonsepCeramah = function(keyword) {
    const query = (keyword || '').trim().toLowerCase();
    if (!query) {
        renderKonsepCeramahUI(cacheKonsepCeramah);
        return;
    }
    const hasilFilter = cacheKonsepCeramah.filter(item => (item.judul_konsep || '').toLowerCase().includes(query));
    renderKonsepCeramahUI(hasilFilter);
};

window.toggleExpandCeramah = function() {
    isExpandedCeramah = !isExpandedCeramah;
    const inputCari = document.getElementById('cari-konsep-ceramah');
    window.cariKonsepCeramah(inputCari ? inputCari.value : '');
};