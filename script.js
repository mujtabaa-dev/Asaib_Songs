// Supabase SDK
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// إعداد Supabase
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── 1. تسجيل الدخول ───────────────────────────────────────────
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

// ─── 2. حماية صفحة الإدارة ──────────────────────────────────────
if (window.location.href.includes('admin.html')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.replace('login.html');
    } else {
        const adminMain = document.getElementById('admin-main');
        if (adminMain) adminMain.style.display = 'block';
    }
}

// ─── 3. وظيفة عرض الأغاني (للزوار والمسؤول) ─────────────────────
async function displaySongs() {
    const songsList = document.getElementById('songs-list'); // الصفحة الرئيسية (index.html)
    const adminSongsList = document.getElementById('admin-songs-list'); // لوحة الإدارة (admin.html)

    if (!songsList && !adminSongsList) return;

    // جلب البيانات من جدول songs
    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching songs:', error);
        return;
    }

    // أ- العرض للزوار (تشغيل وتحميل فقط)
    if (songsList) {
        songsList.innerHTML = data.map(song => `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls" style="display: flex; flex-direction: column; gap: 10px;">
                        <audio controls style="width: 100%;">
                            <source src="${song.audioUrl}" type="audio/mpeg">
                        </audio>
                        <a href="${song.audioUrl}" download class="btn" style="width: 100%; text-align: center; justify-content: center;">
                            <i class="fas fa-download"></i> تنزيل القصيدة
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ب- العرض في لوحة الإدارة (تعديل وحذف)
    if (adminSongsList) {
        adminSongsList.innerHTML = data.map(song => `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls" style="display: flex; flex-direction: column; gap: 8px;">
                        <audio controls style="width: 100%; height: 30px;">
                            <source src="${song.audioUrl}" type="audio/mpeg">
                        </audio>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn" style="background:#f39c12; flex:1;" onclick="window.prepareEdit('${song.id}', '${song.name}')">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button class="btn btn-danger" style="background:#e74c3c; flex:1;" onclick="window.deleteSong('${song.id}')">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// ─── 4. إضافة أو تحديث أغنية ────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];
    const btn = document.getElementById('add-song-btn');
    const editId = btn.dataset.editId;

    if (!name) return alert('الرجاء كتابة الاسم');

    try {
        btn.disabled = true;
        btn.textContent = 'جاري المعالجة...';

        let songData = { name };

        if (imageFile) {
            const imgPath = `img_${Date.now()}`;
            await supabase.storage.from('images').upload(imgPath, imageFile);
            songData.imageUrl = supabase.storage.from('images').getPublicUrl(imgPath).data.publicUrl;
        }

        if (audioFile) {
            const audPath = `aud_${Date.now()}`;
            await supabase.storage.from('audio').upload(audPath, audioFile);
            songData.audioUrl = supabase.storage.from('audio').getPublicUrl(audPath).data.publicUrl;
        }

        if (editId) {
            const { error } = await supabase.from('songs').update(songData).eq('id', editId); //
            if (error) throw error;
            alert('تم التحديث');
        } else {
            if (!audioFile || !imageFile) throw new Error('يرجى اختيار الملفات');
            const { error } = await supabase.from('songs').insert([songData]); //
            if (error) throw error;
            alert('تمت الإضافة');
        }
        location.reload();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
    }
});

// ─── 5. وظائف الإدارة الإضافية ────────────────────────────────
window.prepareEdit = (id, name) => {
    document.getElementById('song-name').value = name;
    const btn = document.getElementById('add-song-btn');
    btn.dataset.editId = id;
    btn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
    btn.style.background = '#2ecc71';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteSong = async (id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    const { error } = await supabase.from('songs').delete().eq('id', id); //
    if (error) alert(error.message);
    else location.reload();
};

// تشغيل جلب الأغاني عند التحميل
displaySongs();
