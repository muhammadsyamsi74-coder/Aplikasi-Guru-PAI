// js/app.js

function loadPage(pageName, pageTitle) {
    document.getElementById('page-title').innerText = pageTitle;

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.getElementById('nav-' + pageName).classList.add('active');

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
                    const tglInput = document.getElementById('input-tgl-absen');
                    if (tglInput) tglInput.valueAsDate = new Date();
                }

                if (pageName === 'penilaian' && typeof window.loadKelasUntukPenilaian === 'function') {
                    window.loadKelasUntukPenilaian();
                    const tglInputNilai = document.getElementById('input-tgl-nilai');
                    if (tglInputNilai) tglInputNilai.valueAsDate = new Date();
                }

                // PENAMBAHAN BARU: Pemicu otomatis untuk modul jurnal
                if (pageName === 'jurnal' && typeof window.initJurnal === 'function') {
                    window.initJurnal();
                    const tglInputJurnal = document.getElementById('input-tgl-jurnal');
                    if (tglInputJurnal) tglInputJurnal.valueAsDate = new Date();
                }
            }, 50);
        })
        .catch(error => {
            document.getElementById('main-content').innerHTML = `
                <div style="text-align:center; padding: 50px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <i class="fa-solid fa-person-digging" style="font-size: 50px; color: #007bff; margin-bottom:15px;"></i>
                    <h3 style="color:#0056b3; font-size: 16px; font-weight: 600;">Modul ${pageTitle} Belum Tersedia</h3>
                    <p style="color:#495057; font-size: 12px; margin-top: 5px;">Kita belum membuat file <b>${pageName}.html</b>.</p>
                </div>
            `;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    loadPage('presensi', 'Presensi Siswa');
});

window.loadPage = loadPage;