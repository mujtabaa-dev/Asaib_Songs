// Supabase SDK
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── وظيفة مساعدة لتوليد اسم ملف فريد ──────────────────────────────────────────
const generateUniqueName = (fileName) => {
    const ext = fileName.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}.${ext}`;
};

// ─── تسجيل الدخول ────────────────────────────────────────────────────────────
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        document.getElementById('error-msg').textContent = 'فشل تسجيل الدخول: ' + error.message;
    } else {
        window.location.href = 'admin.html';
    }
});

// ─── حماية صفحة الإدارة ──────────────────────────────────────────────────────
if (window.location.href.includes('admin.html')) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.replace('login.html');
    } else {
        const adminMain = document.getElementById('admin-main');
        if (adminMain) adminMain.style.display = 'block';
    }
}

// ─── إضافة أغنية جديدة ───────────────────────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];

    if (!name || !audioFile || !imageFile) {
        alert('الرجاء ملء جميع الحقول واختيار الملفات');
        return;
    }

    // إظهار حالة التحميل (اختياري)
    const btn = document.getElementById('add-song-btn');
    btn.disabled = true;
    btn.textContent = 'جاري الرفع...';

    try {
        // 1. رفع الصورة باسم فريد
        const imagePath = generateUniqueName(imageFile.name);
        const { error: imgErr } = await supabase.storage
            .from('images')
            .upload(imagePath, imageFile, { upsert: true });
        
        if (imgErr) throw new Error('خطأ في رفع الصورة: ' + imgErr.message);
        const imageUrl = supabase.storage.from('images').getPublicUrl(imagePath).data.publicUrl;

        // 2. رفع الأغنية باسم فريد
        const audioPath = generateUniqueName(audioFile.name);
        const { error: audErr } = await supabase.storage
            .from('audio')
            .upload(audioPath, audioFile, { upsert: true });

        if (audErr) throw new Error('خطأ في رفع الأغنية: ' + audErr.message);
        const audioUrl = supabase.storage.from('audio').getPublicUrl(audioPath).data.publicUrl;

        // 3. حفظ البيانات في جدول الـ Database
        const { error: dbErr } = await supabase
            .from('songs')
            .insert([{ 
                name: name, 
                imageUrl: imageUrl, 
                audioUrl: audioUrl 
            }]);

        if (dbErr) throw new Error('خطأ في حفظ البيانات: ' + dbErr.message);

        alert('تم رفع الأغنية وحفظ البيانات بنجاح!');
        location.reload();

    } catch (err) {
        console.error('Upload Process Error:', err);
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'إضافة الأغنية';
    }
});

// ─── عرض الأغاني ─────────────────────────────────────────────────────────────
async function displaySongs() {
    const songsList = document.getElementById('songs-list');
    const adminSongsList = document.getElementById('admin-songs-list');

    if (!songsList && !adminSongsList) return;

    const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
    
    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    const renderCard = (song, isAdmin) => `
        <div class="song-card">
            <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
            <div class="song-info">
                <h3 class="song-title">${song.name}</h3>
                <div class="song-controls">
                    <audio controls><source src="${song.audioUrl}" type="audio/mpeg"></audio>
                    ${isAdmin 
                        ? `<button class="btn delete-btn" onclick="window.deleteSong('${song.id}')">حذف</button>` 
                        : `<a href="${song.audioUrl}" download class="btn">تنزيل</a>`
                    }
                </div>
            </div>
        </div>`;

    if (songsList) songsList.innerHTML = data.map(s => renderCard(s, false)).join('');
    if (adminSongsList) adminSongsList.innerHTML = data.map(s => renderCard(s, true)).join('');
}

// ─── حذف أغنية ───────────────────────────────────────────────────────────────
window.deleteSong = async (songId) => {
    if (!confirm('هل أنت متأكد من حذف هذه الأغنية؟')) return;

    const { error } = await supabase.from('songs').delete().eq('id', songId);

    if (error) {
        alert('خطأ في الحذف: ' + error.message);
    } else {
        alert('تم الحذف بنجاح');
        location.reload();
    }
};

displaySongs();
