// js/app.js
import supabase from './supabase.js';

let currentProfileId = null;

// ================= LOGIKA NAVIGASI HALAMAN =================
window.loadPage = function(pageName, pageTitle) {
    document.getElementById('page-title').innerText = pageTitle;

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const navEl = document.getElementById('nav-' + pageName);
    if (navEl) navEl.classList.add('active');

    fetch(`pages/${pageName}.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Halaman belum dibuat');
            }
            return response.text();
        })
        .then(html => {
            document.getElementById('main-content').innerHTML = html;

            setTimeout(() => {
                if (pageName === 'master' && typeof window.loadDataKelas === 'function') {
                    window.loadDataKelas();
                }
                if (pageName === 'presensi' && typeof window.loadKelasUntukPresensi === 'function') {
                    window.loadKelasUntukPresensi();
                    const tglInput = document.getElementById('input-tgl-absen-kelas');
                    if (tglInput) tglInput.valueAsDate = new Date();
                }
                if (pageName === 'penilaian' && typeof window.loadKelasUntukPenilaian === 'function') {
                    window.loadKelasUntukPenilaian();
                }
                if (pageName === 'jurnal' && typeof window.initJurnal === 'function') {
                    window.initJurnal();
                }
                if (pageName === 'paiapps' && typeof window.initPaiApps === 'function') {
                    window.initPaiApps();
                }
            }, 50);
        })
        .catch(error => {
            document.getElementById('main-content').innerHTML = `
                <div style="text-align:center; padding: 50px 20px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--neon-red);">
                    <i class="fa-solid fa-person-digging" style="font-size: 50px; color: var(--neon-red); margin-bottom:15px;"></i>
                    <h3 style="color:var(--text-putih); font-size: 16px; font-weight: 600;">Modul ${pageTitle} Belum Tersedia</h3>
                    <p style="color:var(--text-abu); font-size: 12px; margin-top: 5px;">Kita belum membuat file <b>${pageName}.html</b>.</p>
                </div>
            `;
        });
};

// ================= FITUR KOMPRESI GAMBAR (CANVAS API) =================
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

// ================= FETCH DATA PROFIL & UPDATE HEADER/SIDEBAR =================
window.fetchProfile = async function() {
    try {
        const { data, error } = await supabase.from('profilaplikasi').select('*').limit(1).maybeSingle();
        const profBtn = document.getElementById('profile-btn');     
        const subtitle = document.getElementById('header-subtitle'); 
        const sidebarBrand = document.getElementById('sidebar-brand'); 

        if (error) throw error;

        if (data) {
            currentProfileId = data.id;
            
            // 1. UBAH LOGO HEADER (Mobile) dengan object-position: top
            if (data.foto_profil) {
                if(profBtn) profBtn.innerHTML = `<img src="${data.foto_profil}" style="width:100%; height:100%; object-fit:cover; object-position:top; border-radius:50%;">`;
            } else {
                if(profBtn) profBtn.innerHTML = '<i class="fa-solid fa-user" style="font-size:18px;"></i>';
            }

            // 2. UBAH PROFIL SIDEBAR (Desktop)
            if (sidebarBrand) {
                const namaGuru = data.nama_guru || 'Nama Guru PAI';
                const namaSekolah = data.nama_sekolah || 'Nama Sekolah';
                let sidebarHTML = '';
                
                if (data.foto_profil) {
                    sidebarHTML += `<img src="${data.foto_profil}" alt="Foto Profil">`;
                } else {
                    sidebarHTML += `<div class="default-icon"><i class="fa-solid fa-user" style="font-size:30px; color:var(--neon-green);"></i></div>`;
                }
                
                sidebarHTML += `<h3>${namaGuru}</h3><p>${namaSekolah}</p>`;
                sidebarBrand.innerHTML = sidebarHTML;
            }

            // 3. UBAH SUBTITLE TAHUN AJARAN
            if (subtitle) {
                const ta = data.tahun_ajaran_aktif || '-';
                const sm = data.semester_aktif || '-';
                subtitle.innerText = `TA ${ta} - Semester ${sm}`;
            }

            // 4. ISI DATA KE FORM MODAL
            if(document.getElementById('prof-nama-guru')) document.getElementById('prof-nama-guru').value = data.nama_guru || '';
            if(document.getElementById('prof-nip')) document.getElementById('prof-nip').value = data.nip_guru || '';
            if(document.getElementById('prof-email')) document.getElementById('prof-email').value = data.email_guru || '';
            if(document.getElementById('prof-wa')) document.getElementById('prof-wa').value = data.whatsapp_guru || '';
            if(document.getElementById('prof-sekolah')) document.getElementById('prof-sekolah').value = data.nama_sekolah || '';
            if(document.getElementById('prof-npsn')) document.getElementById('prof-npsn').value = data.npsn_sekolah || '';
            if(document.getElementById('prof-ta')) document.getElementById('prof-ta').value = data.tahun_ajaran_aktif || '';
            if(document.getElementById('prof-semester')) document.getElementById('prof-semester').value = data.semester_aktif || 'Ganjil';
            if(document.getElementById('prof-alamat')) document.getElementById('prof-alamat').value = data.alamat_sekolah || '';
            if(document.getElementById('current-foto-url')) document.getElementById('current-foto-url').value = data.foto_profil || '';

        } else {
            if (profBtn) profBtn.innerHTML = '<i class="fa-solid fa-user" style="font-size:18px;"></i>';
            if (subtitle) subtitle.innerText = `Profil belum diatur`;
            if (sidebarBrand) {
                sidebarBrand.innerHTML = `
                    <div class="default-icon"><i class="fa-solid fa-user" style="font-size:30px; color:var(--neon-green);"></i></div>
                    <h3>Guru Agama Islam</h3><p>Sistem Administrasi</p>
                `;
            }
        }
    } catch (e) {
        console.log("Sistem memuat default. Profil belum terisi penuh atau terjadi kesalahan:", e.message);
    }
};

// ================= LOGIKA KLIK 7x (BUKA MODAL PENGATURAN PROFIL) =================
let clickCount = 0;
let clickTimeout = null;

window.handleProfileClick = function() {
    clickCount++;
    if (clickTimeout) clearTimeout(clickTimeout);
    
    if (clickCount >= 7) {
        document.getElementById('modal-profil').style.display = 'flex';
        clickCount = 0; 
    } else {
        clickTimeout = setTimeout(() => { 
            clickCount = 0; 
        }, 500);
    }
};

// ================= SIMPAN PROFIL & UPLOAD FOTO =================
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
            const file = fileInput.files[0];
            const compressedBlob = await compressImage(file, 300); 
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...';
            const fileExt = 'jpg'; 
            const fileName = `profil_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('foto-siswa').upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('foto-siswa').getPublicUrl(fileName);
            fotoUrl = publicUrlData.publicUrl;
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

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Database...';

        if (currentProfileId) {
            const { error } = await supabase.from('profilaplikasi').update(payload).eq('id', currentProfileId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('profilaplikasi').insert([payload]).select();
            if (error) throw error;
            if(data && data.length > 0) currentProfileId = data[0].id;
        }

        alert("Profil berhasil diperbarui!");
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

// ================= INIT PADA SAAT WEBSITE DIMUAT =================
document.addEventListener('DOMContentLoaded', () => {
    // Memuat modul PAI-APPS (Dashboard) secara default saat aplikasi dibuka
    loadPage('paiapps', 'PAI-APPS');
    fetchProfile(); 
});