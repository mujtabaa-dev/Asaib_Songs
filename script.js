// Supabase SDK
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── تسجيل الدخول ────────────────────────────────────────────────────────────
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorMsg.textContent = 'خطأ: ' + error.message;
    } else {
        window.location.href = 'admin.html';
    }
});

// ─── حماية صفحة الإدارة (فحص الجلسة الحقيقية) ───────────────────────────────────
async function checkAuth() {
    if (window.location.href.includes('admin.html')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.replace('login.html');
        } else {
            const adminMain = document.getElementById('admin-main');
            if(adminMain) adminMain.style.display = 'block';
        }
    }
}
checkAuth();

// ─── إضافة أغنية جديدة ───────────────────────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];
    const btn = document.getElementById('add-song-btn');

    if (!name || !audioFile || !imageFile) {
        alert('الرجاء ملء جميع الحقول واختيار الملفات');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'جاري الرفع...';

        // 1. رفع الصورة باسم فريد
        const imageExt = imageFile.name.split('.').pop();
        const imagePath = `${Date.now()}_img.${imageExt}`;
        
        const { error: imgErr } = await supabase.storage
            .from('images')
            .upload(imagePath, imageFile);
        if (imgErr) throw new Error('فشل رفع الصورة: ' + imgErr.message);

        const imageUrl = supabase.storage.from('images').getPublicUrl(imagePath).data.publicUrl;

        // 2. رفع الأغنية باسم فريد
        const audioExt = audioFile.name.split('.').pop();
        const audioPath = `${Date.now()}_audio.${audioExt}`;

        const { error: audErr } = await supabase.storage
            .from('audio')
            .upload(audioPath, audioFile);
        if (audErr) throw new Error('فشل رفع الأغنية: ' + audErr.message);

        const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;

        // 3. حفظ البيانات في جدول songs
        const { error: dbErr } = await supabase
            .from('songs')
            .insert([{ name, imageUrl, audioUrl }]);
        if (dbErr) throw dbErr;

        alert('تمت الإضافة بنجاح!');
        location.reload();

    } catch (err) {
        console.error('Full Error:', err);
        alert(err.message || 'حدث خطأ غير متوقع');
    } finally {
        btn.disabled = false;
        btn.textContent = 'إضافة الأغنية';
    }
});

// ─── عرض الأغاني ─────────────────────────────────────────────────────────────
async function displaySongs() {
    const songsList = document.getElementById('songs-list');
    const adminSongsList = document.getElementById('admin-songs-list');

    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error('Error:', error);

    const render = (container, isAdmin) => {
        if (!container) return;
        container.innerHTML = data.map(song => `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls">
                        <audio controls><source src="${song.audioUrl}" type="audio/mpeg"></audio>
                        ${isAdmin 
                            ? `<button class="btn btn-danger" onclick="deleteSong('${song.id}')">حذف</button>`
                            : `<a href="${song.audioUrl}" download class="btn">تنزيل</a>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    };

    render(songsList, false);
    render(adminSongsList, true);
}

// ─── وظيفة الحذف (Global لتصل إليها الأزرار) ───────────────────────────────────
window.deleteSong = async (songId) => {
    if (!confirm('هل أنت متأكد؟')) return;

    try {
        const { error } = await supabase.from('songs').delete().eq('id', songId);
        if (error) throw error;
        alert('تم الحذف');
        location.reload();
    } catch (err) {
        alert('خطأ في الحذف: ' + err.message);
    }
};

displaySongs();
