// js/app.js
import supabase from './supabase.js';

let currentProfileId = null;

// ================= FITUR APP BADGE (NOTIFIKASI IKON APLIKASI) =================
window.updateAppBadge = function(count) {
    const num = parseInt(count) || 0;
    try {
        if ('setAppBadge' in navigator) {
            if (num > 0) {
                navigator.setAppBadge(num).catch(e => console.warn('Badge tidak didukung'));
            } else {
                navigator.clearAppBadge().catch(e => console.warn('Badge tidak didukung'));
            }
        }
    } catch (e) {
        console.warn('API Badge Error:', e);
    }
};

window.clearAppBadge = function() {
    try {
        if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(e => console.warn('Badge tidak didukung'));
        }
    } catch (e) {
        console.warn('API Badge Error:', e);
    }
};

// ================= LOGIKA NAVIGASI HALAMAN =================
window.loadPage = function(pageName, pageTitle) {
    document.getElementById('page-title').innerText = pageTitle;

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const navEl = document.getElementById('nav-' + pageName);
    if (navEl) navEl.classList.add('active');

    fetch(`pages/${pageName}.html`)
        .then(response => {
            if (!response.ok) throw new Error('Halaman belum dibuat');
            return response.text();
        })
        .then(html => {
            document.getElementById('main-content').innerHTML = html;

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
            document.getElementById('main-content').innerHTML = `<p style="color:var(--neon-red); text-align:center;">Gagal memuat modul: ${error.message}</p>`;
        });
};

// ================= LOGIKA SUB-TAB PAI-APPS (PENTING AGAR TIDAK STUCK MEMUAT) =================
window.initPaiApps = function() {
    if (typeof window.bukaSubTabPaiApps === 'function') {
        window.bukaSubTabPaiApps('dashboard');
    }
};

window.bukaSubTabPaiApps = function(subPage) {
    const btns = document.querySelectorAll('.subtab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById('btn-subtab-' + subPage);
    if (activeBtn) activeBtn.classList.add('active');

    const contentArea = document.getElementById('paiapps-sub-content');
    if (!contentArea) return;

    contentArea.innerHTML = '<div style="text-align:center; padding: 40px 10px; color: var(--neon-green);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="font-size: 12px; margin-top: 10px; color: var(--text-abu);">Memuat antarmuka...</p></div>';

    fetch(`pages/paiapps-${subPage}.html`)
        .then(res => {
            if (!res.ok) throw new Error('Sub-halaman tidak ditemukan');
            return res.text();
        })
        .then(html => {
            contentArea.innerHTML = html;
            setTimeout(() => {
                if (subPage === 'dashboard' && typeof window.loadDashboardPaiApps === 'function') {
                    window.loadDashboardPaiApps();
                }
            }, 50);
        })
        .catch(err => {
            contentArea.innerHTML = `<div style="color:var(--neon-red); text-align:center; padding:20px;">Gagal memuat: ${err.message}</div>`;
        });
};

// ================= FITUR KOMPRESI GAMBAR =================
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
    try {
        const { data, error } = await supabase.from('profilaplikasi').select('*').limit(1).maybeSingle();
        if (error) throw error;

        const profBtn = document.getElementById('profile-btn');     
        const subtitle = document.getElementById('header-subtitle'); 
        const sidebarBrand = document.getElementById('sidebar-brand'); 

        if (data) {
            currentProfileId = data.id;
            if (profBtn && data.foto_profil) profBtn.innerHTML = `<img src="${data.foto_profil}" style="width:100%; height:100%; object-fit:cover; object-position:top; border-radius:50%;">`;
            else if (profBtn) profBtn.innerHTML = '<i class="fa-solid fa-user" style="font-size:18px;"></i>';

            if (sidebarBrand) {
                const namaGuru = data.nama_guru || 'Nama Guru PAI';
                const namaSekolah = data.nama_sekolah || 'Nama Sekolah';
                let sidebarHTML = data.foto_profil ? `<img src="${data.foto_profil}" alt="Foto Profil">` : `<div class="default-icon"><i class="fa-solid fa-user" style="font-size:30px; color:var(--neon-green);"></i></div>`;
                sidebarBrand.innerHTML = sidebarHTML + `<h3>${namaGuru}</h3><p>${namaSekolah}</p>`;
            }

            if (subtitle) subtitle.innerText = `TA ${data.tahun_ajaran_aktif || '-'} - Semester ${data.semester_aktif || '-'}`;

            if(document.getElementById('prof-nama-guru')) document.getElementById('prof-nama-guru').value = data.nama_guru || '';
            if(document.getElementById('prof-nip')) document.getElementById('prof-nip').value = data.nip_guru || '';
            if(document.getElementById('prof-email')) document.getElementById('prof-email').value = data.email_guru || '';
            if(document.getElementById('prof-wa')) document.getElementById('prof-wa').value = data.whatsapp_guru || '';
            if(document.getElementById('prof-sekolah')) document.getElementById('prof-sekolah').value = data.nama_sekolah || 'SMPN 8 Balikpapan';
            if(document.getElementById('prof-npsn')) document.getElementById('prof-npsn').value = data.npsn_sekolah || '';
            if(document.getElementById('prof-ta')) document.getElementById('prof-ta').value = data.tahun_ajaran_aktif || '';
            if(document.getElementById('prof-semester')) document.getElementById('prof-semester').value = data.semester_aktif || 'Ganjil';
            if(document.getElementById('prof-alamat')) document.getElementById('prof-alamat').value = data.alamat_sekolah || '';
            if(document.getElementById('current-foto-url')) document.getElementById('current-foto-url').value = data.foto_profil || '';
        }
    } catch (e) {
        console.log("Profil default:", e.message);
    }
};

let clickCount = 0;
let clickTimeout = null;
window.handleProfileClick = function() {
    clickCount++;
    if (clickTimeout) clearTimeout(clickTimeout);
    if (clickCount >= 7) {
        document.getElementById('modal-profil').style.display = 'flex';
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
            if(data && data.length > 0) currentProfileId = data[0].id;
        }

        alert("Profil diperbarui!");
        document.getElementById('modal-profil').style.display = 'none';
        if(document.getElementById('prof-foto')) document.getElementById('prof-foto').value = ''; 
        fetchProfile(); 
    } catch (error) {
        alert("Gagal menyimpan profil: " + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadPage('paiapps', 'PAI-APPS');
    fetchProfile(); 
});

document.addEventListener('DOMContentLoaded', () => {
    // Meminta izin notifikasi agar App Badge diizinkan oleh OS
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            console.log('Status Izin Notifikasi:', permission);
        });
    }

    loadPage('paiapps', 'PAI-APPS');
    fetchProfile(); 
});