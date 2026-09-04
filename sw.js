// sw.js

// 1. Service worker pasif agar memenuhi syarat instalasi PWA
self.addEventListener('fetch', (event) => {
    // Pass-through request fetch default
});

// 2. Listener untuk mengontrol App Badge dari latar belakang
self.addEventListener('message', (event) => {
    if (!event.data) return;

    try {
        if (event.data.action === 'set-badge') {
            const count = parseInt(event.data.count) || 0;
            if ('setAppBadge' in self.navigator) {
                if (count > 0) {
                    self.navigator.setAppBadge(count).catch(err => console.log('SW set badge warn:', err));
                } else {
                    self.navigator.clearAppBadge().catch(err => console.log('SW clear badge warn:', err));
                }
            }
        } else if (event.data.action === 'clear-badge') {
            if ('clearAppBadge' in self.navigator) {
                self.navigator.clearAppBadge().catch(err => console.log('SW clear badge warn:', err));
            }
        }
    } catch (error) {
        console.warn('Lencana latar belakang gagal:', error);
    }
});