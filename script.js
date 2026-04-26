// Supabase SDK
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// إعداد Supabase
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── تسجيل الدخول ────────────────────────────────────────────────────────────
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        document.getElementById('error-msg').textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    } else {
        window.location.href = 'admin.html';
    }
});

// ─── حماية صفحة الإدارة ──────────────────────────────────────────────────────
// The <main> in admin.html starts as display:none.
// We only reveal it AFTER Supabase confirms a live session.
// This means: no JS = stays hidden, wrong/no session = redirect immediately.
if (window.location.href.includes('admin.html')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Not authenticated — send to login, keep page blank
        window.location.replace('login.html');
    } else {
        // Authenticated — reveal the admin UI
        document.getElementById('admin-main').style.display = '';
    }
}

// ─── إضافة أغنية جديدة ───────────────────────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];

    if (!name || !audioFile || !imageFile) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }

    try {
        // رفع الصورة
        const { error: imageError } = await supabase.storage
            .from('images')
            .upload(imageFile.name, imageFile);
        if (imageError) throw imageError;

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/images/${imageFile.name}`;

        // رفع الأغنية
        const { error: audioError } = await supabase.storage
            .from('audio')
            .upload(audioFile.name, audioFile);
        if (audioError) throw audioError;

        const audioUrl = `${supabaseUrl}/storage/v1/object/public/audio/${audioFile.name}`;

        // حفظ في قاعدة البيانات
        const { error } = await supabase
            .from('songs')
            .insert([{ name, imageUrl, audioUrl }]);
        if (error) throw error;

        alert('تم إضافة الأغنية بنجاح!');
        location.reload();
    } catch (err) {
        console.error('Error adding song:', err);
        alert('حدث خطأ أثناء رفع الأغنية');
    }
});

// ─── عرض الأغاني ─────────────────────────────────────────────────────────────
async function displaySongs() {
    const songsList     = document.getElementById('songs-list');       // index.html
    const adminSongsList = document.getElementById('admin-songs-list'); // admin.html

    if (!songsList && !adminSongsList) return;

    const { data, error } = await supabase.from('songs').select('*');
    if (error) {
        console.error('Error fetching songs:', error);
        return;
    }

    // عرض في الصفحة الرئيسية
    if (songsList) {
        songsList.innerHTML = '';
        data.forEach(song => {
            const card = document.createElement('div');
            card.className = 'song-card';
            card.innerHTML = `
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls">
                        <audio controls>
                            <source src="${song.audioUrl}" type="audio/mpeg">
                        </audio>
                        <a href="${song.audioUrl}" download>
                            <i class="fas fa-download"></i> تنزيل
                        </a>
                    </div>
                </div>
            `;
            songsList.appendChild(card);
        });
    }

    // عرض في لوحة الإدارة
    if (adminSongsList) {
        adminSongsList.innerHTML = '';
        data.forEach(song => {
            const card = document.createElement('div');
            card.className = 'song-card';
            // FIX: onclick="deleteSong(...)" requires deleteSong on window.
            //      Since this file is a module, functions are not auto-global.
            //      We assign it to window below.
            card.innerHTML = `
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls">
                        <button class="btn" onclick="window.deleteSong('${song.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
            adminSongsList.appendChild(card);
        });
    }
}

// ─── حذف أغنية ───────────────────────────────────────────────────────────────
async function deleteSong(songId) {
    if (!confirm('هل أنت متأكد من حذف هذه الأغنية؟')) return;

    const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

    if (error) {
        console.error('Error deleting song:', error);
        alert('حدث خطأ أثناء حذف الأغنية');
    } else {
        alert('تم حذف الأغنية بنجاح!');
        location.reload();
    }
}

// FIX: ES modules don't expose functions to global scope automatically.
//      Expose deleteSong so inline onclick handlers in admin.html can call it.
window.deleteSong = deleteSong;

// ─── تشغيل العرض عند التحميل ─────────────────────────────────────────────────
displaySongs();
