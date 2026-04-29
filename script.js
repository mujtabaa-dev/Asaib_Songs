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

// ─── حماية صفحة الإدارة ──────────────────────────────────────────────────────
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

// ─── تحضير التعديل (ملء النموذج ببيانات الأغنية) ──────────────────────────────
window.prepareEdit = (id, name) => {
    document.getElementById('song-name').value = name;
    const btn = document.getElementById('add-song-btn');
    btn.textContent = 'تحديث الأغنية الحالية';
    btn.classList.add('btn-update'); // تمييز الزر لونياً
    btn.dataset.editId = id; // تخزين المعرف للتعديل
    
    // التمرير للأعلى للنموذج
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ─── إضافة أو تحديث أغنية ────────────────────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];
    const btn = document.getElementById('add-song-btn');
    const editId = btn.dataset.editId;

    if (!name) {
        alert('الرجاء إدخال اسم الأغنية');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'جاري المعالجة...';

        let updateData = { name };

        // رفع الصورة إذا تم اختيار ملف جديد
        if (imageFile) {
            const imgPath = `${Date.now()}_img.${imageFile.name.split('.').pop()}`;
            const { error: imgErr } = await supabase.storage.from('images').upload(imgPath, imageFile);
            if (imgErr) throw imgErr;
            updateData.imageUrl = supabase.storage.from('images').getPublicUrl(imgPath).data.publicUrl;
        }

        // رفع الأغنية إذا تم اختيار ملف جديد
        if (audioFile) {
            const audPath = `${Date.now()}_audio.${audioFile.name.split('.').pop()}`;
            const { error: audErr } = await supabase.storage.from('audio').upload(audPath, audioFile);
            if (audErr) throw audErr;
            updateData.audioUrl = supabase.storage.from('audio').getPublicUrl(audPath).data.publicUrl;
        }

        if (editId) {
            // حالة التعديل
            const { error } = await supabase.from('songs').update(updateData).eq('id', editId);
            if (error) throw error;
            alert('تم تحديث الأغنية بنجاح!');
        } else {
            // حالة إضافة جديدة
            if (!audioFile || !imageFile) {
                alert('الرجاء اختيار ملف الصوت والصورة للأغنية الجديدة');
                btn.disabled = false;
                btn.textContent = 'إضافة الأغنية';
                return;
            }
            const { error } = await supabase.from('songs').insert([updateData]);
            if (error) throw error;
            alert('تمت إضافة الأغنية بنجاح!');
        }

        location.reload();

    } catch (err) {
        console.error('Full Error:', err);
        alert('حدث خطأ: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = editId ? 'تحديث الأغنية الحالية' : 'إضافة الأغنية';
    }
});

// ─── عرض الأغاني ─────────────────────────────────────────────────────────────
async function displaySongs() {
    const songsList = document.getElementById('songs-list');
    const adminSongsList = document.getElementById('admin-songs-list');

    if (!songsList && !adminSongsList) return;

    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching songs:', error);
        return;
    }

    const render = (container, isAdmin) => {
        if (!container) return;
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:white; padding:20px;">لا توجد أغاني حالياً</p>';
            return;
        }

        container.innerHTML = data.map(song => `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls">
                        <audio controls><source src="${song.audioUrl}" type="audio/mpeg"></audio>
                        ${isAdmin 
                            ? `
                               <div style="display: flex; gap: 5px; margin-top: 10px;">
                                   <button class="btn" style="background:#f39c12" onclick="prepareEdit('${song.id}', '${song.name}')">
                                       تعديل
                                   </button>
                                   <button class="btn btn-danger" onclick="deleteSong('${song.id}')">
                                       حذف
                                   </button>
                               </div>
                              `
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

// ─── حذف الأغنية ─────────────────────────────────────────────────────────────
window.deleteSong = async (songId) => {
    if (!confirm('هل أنت متأكد من حذف هذه الأغنية؟')) return;

    try {
        const { error } = await supabase.from('songs').delete().eq('id', songId);
        if (error) throw error;
        alert('تم حذف الأغنية');
        location.reload();
    } catch (err) {
        alert('خطأ في الحذف: ' + err.message);
    }
};

// التشغيل عند التحميل
document.addEventListener('DOMContentLoaded', displaySongs);
