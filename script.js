import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── إعدادات SUPABASE ───────────────────────────────────────────────────────
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── وظائف الحماية والتحميل ──────────────────────────────────────────────────
if (window.location.pathname.includes('admin.html')) {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) window.location.replace('login.html');
        else {
            document.getElementById('admin-main').style.display = 'block';
            loadSongs();
        }
    };
    checkUser();
}

// ─── جلب وعرض القصائد بتنسيق احترافي ──────────────────────────────────────────
async function loadSongs() {
    const adminList = document.getElementById('admin-songs-list');
    const publicList = document.getElementById('songs-list');
    
    const { data, error } = await supabase.from('songs').select('*').order('id', { ascending: false });
    if (error) return console.error(error);

    const renderCard = (song, isAdmin) => {
        // إضافة معامل التحميل لفرض التنزيل بدلاً من التشغيل في صفحة جديدة
        const downloadLink = `${song.audioUrl}?download=${encodeURIComponent(song.name)}.mp3`;

        return `
        <div class="song-card">
            <img src="${song.imageUrl}" class="song-image" alt="${song.name}">
            <div class="song-info">
                <h3 class="song-title">${song.name}</h3>
                ${!isAdmin ? `
                    <div class="audio-player">
                        <audio controls controlsList="nodownload">
                            <source src="${song.audioUrl}" type="audio/mpeg">
                        </audio>
                    </div>
                ` : ''}
                <div class="song-controls">
                    ${isAdmin ? `
                        <button class="btn edit-btn" onclick="window.prepareEdit('${song.id}', '${song.name}')">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn delete-btn" onclick="window.deleteSong('${song.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    ` : `
                        <a href="${downloadLink}" class="download-btn">
                            <i class="fas fa-download"></i> تحميل MP3
                        </a>
                    `}
                </div>
            </div>
        </div>`;
    };

    if (adminList) adminList.innerHTML = data.map(s => renderCard(s, true)).join('');
    if (publicList) publicList.innerHTML = data.map(s => renderCard(s, false)).join('');
}

// ─── تسجيل الدخول ────────────────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        });
        if (error) document.getElementById('error-msg').textContent = error.message;
        else window.location.assign('admin.html');
    });
}

// استدعاء العرض للصفحة الرئيسية
if (document.getElementById('songs-list')) loadSongs();

// إتاحة الدوال للنافذة العالمية (Global Scope)
window.deleteSong = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذه القصيدة؟')) {
        await supabase.from('songs').delete().eq('id', id);
        location.reload();
    }
};
