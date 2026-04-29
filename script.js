// Supabase SDK
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// إعداد Supabase
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── تسجيل الدخول ───────────────────────────────────────────
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

// ─── حماية صفحة الإدارة ──────────────────────────────────────
if (window.location.href.includes('admin.html')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.replace('login.html');
    } else {
        document.getElementById('admin-main').style.display = '';
    }
}

// ─── وظيفة تجهيز التعديل (تحميل البيانات للنموذج) ─────────────────────────────
window.prepareEdit = (id, name) => {
    document.getElementById('song-name').value = name;
    const btn = document.getElementById('add-song-btn');
    btn.innerHTML = '<i class="fas fa-save"></i> تحديث القصيدة الحالية';
    btn.style.background = '#f39c12'; // تغيير اللون للتمييز
    btn.dataset.editId = id; // تخزين المعرف للتعديل
    window.scrollTo({ top: 0, behavior: 'smooth' }); // الصعود للنموذج
};

// ─── إضافة أو تحديث أغنية ────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];
    const btn = document.getElementById('add-song-btn');
    const editId = btn.dataset.editId;

    if (!name) {
        alert('الرجاء إدخال اسم القصيدة على الأقل');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'جاري المعالجة...';

        let songData = { name };

        // رفع الصورة فقط إذا تم اختيار ملف جديد
        if (imageFile) {
            const imgPath = `img_${Date.now()}_${imageFile.name}`;
            const { error: imgErr } = await supabase.storage.from('images').upload(imgPath, imageFile);
            if (imgErr) throw imgErr;
            songData.imageUrl = supabase.storage.from('images').getPublicUrl(imgPath).data.publicUrl;
        }

        // رفع الصوت فقط إذا تم اختيار ملف جديد
        if (audioFile) {
            const audPath = `aud_${Date.now()}_${audioFile.name}`;
            const { error: audErr } = await supabase.storage.from('audio').upload(audPath, audioFile);
            if (audErr) throw audErr;
            songData.audioUrl = supabase.storage.from('audio').getPublicUrl(audPath).data.publicUrl;
        }

        if (editId) {
            // تنفيذ التحديث (Update)
            const { error } = await supabase.from('songs').update(songData).eq('id', editId);
            if (error) throw error;
            alert('تم تحديث القصيدة بنجاح!');
        } else {
            // تنفيذ الإضافة (Insert)
            if (!audioFile || !imageFile) throw new Error('يجب اختيار ملفات للقصيدة الجديدة');
            const { error } = await supabase.from('songs').insert([songData]);
            if (error) throw error;
            alert('تمت إضافة القصيدة بنجاح!');
        }

        location.reload();
    } catch (err) {
        console.error('Operation failed:', err);
        alert('حدث خطأ: ' + err.message);
    } finally {
        btn.disabled = false;
    }
});

// ─── عرض الأغاني ─────────────────────────────────────────────
async function displaySongs() {
    const songsList = document.getElementById('songs-list'); 
    const adminSongsList = document.getElementById('admin-songs-list');

    if (!songsList && !adminSongsList) return;

    // جلب البيانات مرتبة حسب الأحدث
    const { data, error } = await supabase.from('songs').select('*').order('createdAt', { ascending: false });
    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    // عرض في الصفحة الرئيسية
    if (songsList) {
        songsList.innerHTML = data.map(song => `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls">
                        <audio controls><source src="${song.audioUrl}" type="audio/mpeg"></audio>
                        <a href="${song.audioUrl}" download><i class="fas fa-download"></i> تنزيل</a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // عرض في لوحة الإدارة مع أزرار التعديل والحذف
    if (adminSongsList) {
        adminSongsList.innerHTML = data.map(song => `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls" style="display: flex; flex-direction: column; gap: 5px;">
                        <button class="btn" style="background:#f39c12; width:100%;" onclick="window.prepareEdit('${song.id}', '${song.name}')">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger" style="background:#e74c3c; width:100%;" onclick="window.deleteSong('${song.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// ─── حذف أغنية ──────────────────────────────────────
async function deleteSong(songId) {
    if (!confirm('هل أنت متأكد من حذف هذه القصيدة؟')) return;
    const { error } = await supabase.from('songs').delete().eq('id', songId);
    if (error) alert('خطأ في الحذف');
    else location.reload();
}

window.deleteSong = deleteSong;
displaySongs();
