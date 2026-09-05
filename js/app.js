// js/app.js
import supabase from './supabase.js';
import './modules/master.js';
import './modules/presensi.js';
import './modules/penilaian.js';
import './modules/jurnal.js';
import './modules/paiapps-dashboard.js';
import './modules/paiapps-tools.js';

let currentProfileId = null;

// ================= FITUR APP BADGE (NOTIFIKASI IKON APLIKASI) =================
window.updateAppBadge = function(count) {
    const num = parseInt(count) || 0;
    try {
        if ('setAppBadge' in navigator) {
            if (num > 0) navigator.setAppBadge(num).catch(e => console.warn('Badge warn:', e));
            else navigator.clearAppBadge().catch(e => console.warn('Badge warn:', e));
        }
    } catch (e) { console.warn('API Badge Error:', e); }
};

window.clearAppBadge = function() {
    try {
        if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(e => console.warn('Badge warn:', e));
    } catch (e) {}
};

// ================= GLOBAL WATCHDOG: PERTAHANKAN BADGE =================
window.checkGlobalBadge = async function() {
    try {
        const { data, error } = await supabase
            .from('pengingat_kegiatan')
            .select('tanggal_pelaksanaan, ingatkan_h_min')
            .eq('status_selesai', false);
        if (error) throw error;

        let countVisible = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (data && data.length > 0) {
            data.forEach(item => {
                let tglParts = item.tanggal_pelaksanaan.split('-');
                const targetDate = new Date(tglParts[0], tglParts[1] - 1, tglParts[2]);
                targetDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays <= item.ingatkan_h_min) countVisible++;
            });
        }
        window.updateAppBadge(countVisible);
    } catch (e) { console.warn("Cek badge:", e.message); }
};

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' || document.visibilityState === 'hidden') window.checkGlobalBadge();
});

// ================= LOGIKA NAVIGASI HALAMAN =================
window.loadPage = function(pageName, pageTitle) {
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = pageTitle;

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const navEl = document.getElementById('nav-' + pageName);
    if (navEl) navEl.classList.add('active');

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    fetch(`pages/${pageName}.html`)
        .then(response => {
            if (!response.ok) throw new Error(`Halaman pages/${pageName}.html tidak ditemukan (${response.status})`);
            return response.text();
        })
        .then(html => {
            mainContent.innerHTML = html;
            setTimeout(() => {
                if (pageName === 'master' && typeof window.loadDataKelas === 'function') window.loadDataKelas();
                if (pageName === 'presensi' && typeof window.loadKelasUntukPresensi === 'function') {
                    window.loadKelasUntukPresensi();
                    const tglInput = document.getElementById('input-tgl-absen-kelas');
                    if (tglInput) tglInput.valueAsDate = new Date();
                }
                if (pageName === 'penilaian' && typeof window.loadKelasUntukPenilaian === 'function') window.loadKelasUntukPenilaian();
                if (pageName === 'jurnal' && typeof window.initJurnal === 'function') window.initJurnal();
                if (pageName === 'paiapps' && typeof window.initPaiApps === 'function') window.initPaiApps();
            }, 50);
        })
        .catch(error => {
            mainContent.innerHTML = `<p style="color:var(--neon-red); text-align:center; padding: 20px;">Gagal memuat modul: ${error.message}</p>`;
        });
};

window.initPaiApps = function() { 
    window.bukaSubTabPaiApps('dashboard'); 
};

window.bukaSubTabPaiApps = async function(subPage) {
    const btns = document.querySelectorAll('.subtab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById('btn-subtab-' + subPage);
    if (activeBtn) activeBtn.classList.add('active');

    const contentArea = document.getElementById('paiapps-sub-content');
    if (!contentArea) return;

    contentArea.innerHTML = '<div style="text-align:center; padding: 40px 10px; color: var(--neon-green);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="font-size: 12px; margin-top: 10px; color: var(--text-abu);">Memuat antarmuka...</p></div>';

    try {
        const res = await fetch(`pages/paiapps-${subPage}.html`);
        if (!res.ok) throw new Error(`File pages/paiapps-${subPage}.html tidak ditemukan (${res.status})`);
        
        const html = await res.text();
        contentArea.innerHTML = html;

        setTimeout(async () => {
            if (subPage === 'dashboard' && typeof window.loadDashboardPaiApps === 'function') {
                try {
                    await window.loadDashboardPaiApps();
                } catch (renderErr) {
                    console.error("Gagal render dashboard:", renderErr);
                    contentArea.innerHTML += `<div style="color:var(--neon-red); text-align:center; padding:10px; font-size:12px;">Galat data dashboard: ${renderErr.message}</div>`;
                }
            } else if (subPage === 'tools') {
                if (typeof window.initToolsAlatBantu === 'function') window.initToolsAlatBantu();
                if (typeof window.loadCardsMateriAjar === 'function') window.loadCardsMateriAjar();
                if (typeof window.resetStatePencarianDalil === 'function') window.resetStatePencarianDalil();
                if (typeof window.setTahunAjaranOtomatis === 'function') window.setTahunAjaranOtomatis();
            }
        }, 50);
    } catch (err) {
        contentArea.innerHTML = `<div style="color:var(--neon-red); text-align:center; padding:20px; font-size:12px;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat: ${err.message}</div>`;
    }
};

async function compressImage(file, maxWidth = 300) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleSize = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.7);
            };
        };
    });
}

// ================= FETCH DATA PROFIL & UPDATE HEADER =================
window.fetchProfile = async function() {
    const profBtn = document.getElementById('profile-btn');     
    const subtitle = document.getElementById('header-subtitle'); 
    const sidebarBrand = document.getElementById('sidebar-brand'); 
    
    try {
        const { data, error } = await supabase.from('profilaplikasi').select('*').limit(1).maybeSingle();
        if (error) throw error;

        if (data) {
            currentProfileId = data.id;
            if (profBtn) profBtn.innerHTML = data.foto_profil ? `<img src="${data.foto_profil}" style="width:100%; height:100%; object-fit:cover; object-position:top; border-radius:50%;">` : '<i class="fa-solid fa-user" style="font-size:18px;"></i>';
            if (sidebarBrand) sidebarBrand.innerHTML = (data.foto_profil ? `<img src="${data.foto_profil}" alt="Foto Profil">` : `<div class="default-icon"><i class="fa-solid fa-user" style="font-size:30px; color:var(--neon-green);"></i></div>`) + `<h3>${data.nama_guru || 'Nama Guru'}</h3><p>${data.nama_sekolah || 'Nama Sekolah'}</p>`;
            if (subtitle) subtitle.innerText = `TA ${data.tahun_ajaran_aktif || '-'} - Semester ${data.semester_aktif || '-'}`;

            if (document.getElementById('prof-nama-guru')) document.getElementById('prof-nama-guru').value = data.nama_guru || '';
            if (document.getElementById('prof-nip')) document.getElementById('prof-nip').value = data.nip_guru || '';
            if (document.getElementById('prof-email')) document.getElementById('prof-email').value = data.email_guru || '';
            if (document.getElementById('prof-wa')) document.getElementById('prof-wa').value = data.whatsapp_guru || '';
            if (document.getElementById('prof-sekolah')) document.getElementById('prof-sekolah').value = data.nama_sekolah || '';
            if (document.getElementById('prof-npsn')) document.getElementById('prof-npsn').value = data.npsn_sekolah || '';
            if (document.getElementById('prof-ta')) document.getElementById('prof-ta').value = data.tahun_ajaran_aktif || '';
            if (document.getElementById('prof-semester')) document.getElementById('prof-semester').value = data.semester_aktif || 'Ganjil';
            if (document.getElementById('prof-alamat')) document.getElementById('prof-alamat').value = data.alamat_sekolah || '';
            if (document.getElementById('current-foto-url')) document.getElementById('current-foto-url').value = data.foto_profil || '';
        } else {
            if (profBtn) profBtn.innerHTML = '<i class="fa-solid fa-user" style="font-size:18px;"></i>';
            if (sidebarBrand) sidebarBrand.innerHTML = `<div class="default-icon"><i class="fa-solid fa-user-gear" style="font-size:30px; color:var(--text-abu);"></i></div><h3>Profil Guru</h3><p>Klik untuk melengkapi profil</p>`;
            if (subtitle) subtitle.innerText = `Profil Belum Disetel`;
        }
    } catch (e) {
        if (sidebarBrand) sidebarBrand.innerHTML = `<div class="default-icon"><i class="fa-solid fa-user" style="font-size:30px; color:var(--neon-green);"></i></div><h3>Guru PAI</h3><p>Sistem Administrasi</p>`;
    }
};

let clickCount = 0;
let clickTimeout = null;
window.handleProfileClick = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('profile-menu');
    const modal = document.getElementById('modal-profil');

    // Jika menu profil tersedia, gunakan menu baru.
    if (menu) {
        const open = menu.classList.toggle('show');
        menu.setAttribute('aria-hidden', open ? 'false' : 'true');
        return;
    }

    // Fallback kompatibilitas apabila menu belum ada.
    clickCount++;
    if (clickTimeout) clearTimeout(clickTimeout);
    if (clickCount >= 7 || !currentProfileId) {
        if (modal) modal.style.display = 'flex';
        clickCount = 0;
    } else {
        clickTimeout = setTimeout(() => { clickCount = 0; }, 500);
    }
};

window.simpanProfil = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-profil');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        const fileInput = document.getElementById('prof-foto');
        let fotoUrl = document.getElementById('current-foto-url').value;

        if (fileInput && fileInput.files.length > 0) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengompres Foto...';
            const compressedBlob = await compressImage(fileInput.files[0], 300); 
            const fileName = `profil_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('foto-siswa').upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;
            fotoUrl = supabase.storage.from('foto-siswa').getPublicUrl(fileName).data.publicUrl;
        }

        const payload = {
            nama_guru: document.getElementById('prof-nama-guru').value,
            nip_guru: document.getElementById('prof-nip').value || null,
            email_guru: document.getElementById('prof-email').value || null,
            whatsapp_guru: document.getElementById('prof-wa').value || null,
            nama_sekolah: document.getElementById('prof-sekolah').value || 'SMPN 8 Balikpapan',
            npsn_sekolah: document.getElementById('prof-npsn').value || null,
            tahun_ajaran_aktif: document.getElementById('prof-ta').value || null,
            semester_aktif: document.getElementById('prof-semester').value || 'Ganjil',
            alamat_sekolah: document.getElementById('prof-alamat').value || null,
            foto_profil: fotoUrl || null
        };

        if (currentProfileId) {
            const { error } = await supabase.from('profilaplikasi').update(payload).eq('id', currentProfileId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('profilaplikasi').insert([payload]).select();
            if (error) throw error;
            if (data && data.length > 0) currentProfileId = data[0].id;
        }

        alert("Profil berhasil diperbarui!");
        const modal = document.getElementById('modal-profil');
        if (modal) modal.style.display = 'none';
        if (document.getElementById('prof-foto')) document.getElementById('prof-foto').value = ''; 
        window.fetchProfile(); 
    } catch (error) {
        alert("Gagal menyimpan profil: " + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// ================= AUTENTIKASI + INISIALISASI APLIKASI =================
let appInitialized = false;
let authBusy = false;

function getEl(id) {
    return document.getElementById(id);
}

function setLoginMessage(message = '', isError = true) {
    const box = getEl('login-message');
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('show', !!message);
    box.classList.toggle('error', !!isError);
    box.classList.toggle('success', !!message && !isError);
}

function setLoginLoading(loading) {
    const btn = getEl('login-submit-btn');
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i> Memproses...'
        : '<i class="fa-solid fa-right-to-bracket" style="margin-right:8px;"></i> Masuk ke Aplikasi';
}

function showLoginScreen(message = '') {
    const login = getEl('login-screen');
    const header = document.querySelector('.app-header');
    const main = getEl('main-content');
    const nav = document.querySelector('.bottom-nav');
    const menu = getEl('profile-menu');
    const modal = getEl('modal-profil');

    if (login) login.style.display = 'flex';
    if (header) header.style.display = 'none';
    if (main) main.style.display = 'none';
    if (nav) nav.style.display = 'none';
    if (menu) {
        menu.classList.remove('show');
        menu.setAttribute('aria-hidden', 'true');
    }
    if (modal) modal.style.display = 'none';
    if (message) setLoginMessage(message, true);
}

function hideLoginScreen() {
    const login = getEl('login-screen');
    const header = document.querySelector('.app-header');
    const main = getEl('main-content');
    const nav = document.querySelector('.bottom-nav');

    if (login) login.style.display = 'none';
    if (header) header.style.display = 'flex';
    if (main) main.style.display = '';
    if (nav) nav.style.display = 'flex';
}

window.toggleLoginPassword = function() {
    const input = getEl('login-password');
    const button = getEl('login-password-toggle');
    if (!input || !button) return;
    const icon = button.querySelector('i');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.setAttribute('aria-label', visible ? 'Tampilkan password' : 'Sembunyikan password');
    button.title = visible ? 'Tampilkan password' : 'Sembunyikan password';
    if (icon) icon.className = visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
};

window.openProfileSettings = function(event) {
    if (event) event.stopPropagation();
    const menu = getEl('profile-menu');
    const modal = getEl('modal-profil');
    if (menu) {
        menu.classList.remove('show');
        menu.setAttribute('aria-hidden', 'true');
    }
    if (modal) modal.style.display = 'flex';
};

window.toggleProfileMenu = function(event) {
    if (event) event.stopPropagation();
    const menu = getEl('profile-menu');
    if (!menu) return;
    const open = menu.classList.toggle('show');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
};

window.logout = async function(event) {
    if (event) event.stopPropagation();
    if (authBusy) return;
    if (!window.confirm('Apakah Anda yakin ingin logout dari aplikasi?')) return;

    authBusy = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Logout gagal:', error);
        alert('Logout gagal: ' + (error.message || 'Terjadi kesalahan.'));
    } finally {
        authBusy = false;
    }
};

async function initializeAuthenticatedApp() {
    if (appInitialized) return;

    try {
        // Modul aplikasi sudah di-import seperti versi asli sehingga perilaku
        // aplikasi lama tetap dipertahankan dan risiko race import berkurang.
        appInitialized = true;
        hideLoginScreen();

        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        } catch (err) {}

        window.checkGlobalBadge();
        window.loadPage('paiapps', 'PAI-APPS');
        window.fetchProfile();
    } catch (error) {
        appInitialized = false;
        console.error('Gagal memuat aplikasi:', error);
        showLoginScreen('Aplikasi gagal dimuat. Silakan refresh halaman.');
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    if (authBusy) return;

    const email = (getEl('login-email')?.value || '').trim();
    const password = getEl('login-password')?.value || '';
    if (!email || !password) {
        setLoginMessage('Email dan password wajib diisi.', true);
        return;
    }

    authBusy = true;
    setLoginMessage('');
    setLoginLoading(true);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session) throw new Error('Session login tidak berhasil dibuat.');

        // Jangan menunggu event SIGNED_IN. Kita sudah memiliki session valid.
        // Ini mencegah race condition yang membuat login screen muncul kembali.
        await initializeAuthenticatedApp();
    } catch (error) {
        console.error('Login gagal:', error);
        setLoginMessage(error.message || 'Email atau password salah.', true);
    } finally {
        authBusy = false;
        setLoginLoading(false);
    }
}

function handleAuthStateChange(event) {
    if (event === 'SIGNED_OUT') {
        appInitialized = false;
        currentProfileId = null;
        showLoginScreen();
        setLoginMessage('Anda telah logout dari aplikasi.', false);
    }
    // SIGNED_IN, INITIAL_SESSION, dan TOKEN_REFRESHED sengaja tidak
    // menginisialisasi ulang aplikasi. Session sudah diverifikasi oleh
    // bootstrap di bawah dan login handler.
}

document.addEventListener('click', (event) => {
    const menu = getEl('profile-menu');
    if (!menu || !menu.classList.contains('show')) return;
    const profileBtn = getEl('profile-btn');
    const sidebarBrand = getEl('sidebar-brand');
    if (menu.contains(event.target) || profileBtn?.contains(event.target) || sidebarBrand?.contains(event.target)) return;
    menu.classList.remove('show');
    menu.setAttribute('aria-hidden', 'true');
});

document.addEventListener('DOMContentLoaded', async () => {
    showLoginScreen();

    const loginForm = getEl('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    try {
        supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Satu sumber kebenaran untuk menentukan apakah aplikasi boleh dibuka.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session) {
            await initializeAuthenticatedApp();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Inisialisasi autentikasi gagal:', error);
        showLoginScreen('Tidak dapat memeriksa session. Silakan coba lagi.');
    }
});
