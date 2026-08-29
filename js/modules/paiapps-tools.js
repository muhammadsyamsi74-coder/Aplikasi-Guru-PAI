// js/modules/paiapps-tools.js
import supabase from '../supabase.js';

// ================= IMPORT 6 SUB-MODUL TOOLS =================
import './tools/tools-alat-bantu.js';
import './tools/tools-materi-ajar.js';
import './tools/tools-dalil.js';
import './tools/tools-ceramah.js';
import './tools/tools-perangkat-ajar.js';
import './tools/tools-whatsapp.js';

// ================= KONTROL SUB-TAB INDUK =================
window.initPaiApps = function() {
    window.bukaSubTabPaiApps('dashboard');
};

window.bukaSubTabPaiApps = async function(subTab) {
    const btnDash = document.getElementById('btn-subtab-dashboard');
    const btnTools = document.getElementById('btn-subtab-tools');
    const container = document.getElementById('paiapps-sub-content');

    if (!container) return;

    if (btnDash) btnDash.classList.remove('active');
    if (btnTools) btnTools.classList.remove('active');

    const activeBtn = document.getElementById(`btn-subtab-${subTab}`);
    if (activeBtn) activeBtn.classList.add('active');

    container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--neon-green);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat halaman...</div>';

    try {
        const response = await fetch(`pages/paiapps-${subTab}.html`);
        if (!response.ok) throw new Error('Halaman tidak ditemukan');
        const html = await response.text();
        container.innerHTML = html;

        if (subTab === 'dashboard' && typeof window.loadDashboardPaiApps === 'function') {
            window.loadDashboardPaiApps();
        } else if (subTab === 'tools') {
            if (typeof window.initToolsAlatBantu === 'function') window.initToolsAlatBantu();
            if (typeof window.loadCardsMateriAjar === 'function') window.loadCardsMateriAjar();
            if (typeof window.resetStatePencarianDalil === 'function') window.resetStatePencarianDalil();
            window.setTahunAjaranOtomatis();
        }
    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--neon-red);">Gagal memuat sub-tab: ${e.message}</div>`;
    }
};

// ================= AKSI GLOBAL: TOGGLE PIN, COPY LINK, HAPUS & TAHUN AJARAN =================
window.togglePinDoc = async function(tabel, id, statusSekarang) {
    const statusBaru = !statusSekarang;

    try {
        if (statusBaru) {
            const { count, error: errCount } = await supabase
                .from(tabel)
                .select('*', { count: 'exact', head: true })
                .eq('is_pinned', true);
            if (errCount) throw errCount;
            if (count >= 25) {
                alert("Batas maksimal 25 Pin telah tercapai!");
                return;
            }
        }

        const { error } = await supabase.from(tabel).update({ is_pinned: statusBaru }).eq('id', id);
        if (error) throw error;

        if (tabel === 'materiajar' && typeof window.loadCardsMateriAjar === 'function') {
            window.loadCardsMateriAjar();
        } else if (tabel === 'konsepceramah' && typeof window.loadCardsKonsepCeramah === 'function') {
            window.loadCardsKonsepCeramah();
        } else if (tabel === 'perangkatajar' && typeof window.loadCardsPerangkatAjar === 'function') {
            window.loadCardsPerangkatAjar();
        }

    } catch (e) {
        alert("Gagal mengubah status pin: " + e.message);
    }
};

window.copyLinkDoc = async function(link) {
    if (!link) {
        alert("Link tidak valid!");
        return;
    }
    try {
        await navigator.clipboard.writeText(link);
        alert("Tautan berhasil disalin ke clipboard!");
    } catch (err) {
        const tempInput = document.createElement("input");
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert("Tautan berhasil disalin!");
    }
};

window.hapusDocItem = async function(tabel, id, namaItem) {
    if (!confirm(`Yakin ingin MENGHAPUS "${namaItem}"?`)) return;

    try {
        const { error } = await supabase.from(tabel).delete().eq('id', id);
        if (error) throw error;
        alert("Item berhasil dihapus!");

        if (tabel === 'materiajar' && typeof window.loadCardsMateriAjar === 'function') {
            window.loadCardsMateriAjar();
        } else if (tabel === 'konsepceramah' && typeof window.loadCardsKonsepCeramah === 'function') {
            window.loadCardsKonsepCeramah();
        } else if (tabel === 'perangkatajar' && typeof window.loadCardsPerangkatAjar === 'function') {
            window.loadCardsPerangkatAjar();
        }

    } catch (e) {
        alert("Gagal menghapus: " + e.message);
    }
};

window.setTahunAjaranOtomatis = async function() {
    const elTahunMat = document.getElementById('mat-tahun');
    const elTahunPer = document.getElementById('per-tahun');

    try {
        const { data } = await supabase.from('profilaplikasi').select('tahun_ajaran_aktif').limit(1).maybeSingle();
        const thn = data && data.tahun_ajaran_aktif ? data.tahun_ajaran_aktif : '2025/2026';
        if (elTahunMat) elTahunMat.value = thn;
        if (elTahunPer) elTahunPer.value = thn;
    } catch (e) {
        if (elTahunMat) elTahunMat.value = '2025/2026';
        if (elTahunPer) elTahunPer.value = '2025/2026';
    }
};