import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── إعدادات SUPABASE ───────────────────────────────────────────────────────
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── وظائف مساعدة ────────────────────────────────────────────────────────────
// توليد اسم فريد للملفات لتجنب أخطاء التكرار
const getUniqueFileName = (file) => `${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${file.name}`;

// ─── 1. نظام تسجيل الدخول ───────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            document.getElementById('error-msg').textContent = 'خطأ: ' + error.message;
        } else {
            window.location.assign('admin.html');
        }
    });
}

// ─── 2. حماية لوحة الإدارة ──────────────────────────────────────────────────
if (window.location.pathname.includes('admin.html')) {
    const initAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.replace('login.html');
        } else {
            document.getElementById('admin-main').style.display = 'block';
            loadSongs();
        }
    };
    initAdmin();
}

// ─── 3. إضافة قصيدة جديدة ───────────────────────────────────────────────────
const addBtn = document.getElementById('add-song-btn');
if (addBtn) {
    addBtn.addEventListener('click', async () => {
        const name = document.getElementById('song-name').value;
        const audioFile = document.getElementById('song-audio').files[0];
        const imageFile = document.getElementById('song-image').files[0];

        if (!name || !audioFile || !imageFile) return alert('يرجى ملء كافة الحقول');

        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';

        try {
            // رفع الصورة
            const imgPath = getUniqueFileName(imageFile);
            const { error: imgErr } = await supabase.storage.from('images').upload(imgPath, imageFile);
            if (imgErr) throw imgErr;
            const imageUrl = supabase.storage.from('images').getPublicUrl(imgPath).data.publicUrl;

            // رفع الملف الصوتي
            const audPath = getUniqueFileName(audioFile);
            const { error: audErr } = await supabase.storage.from('audio').upload(audPath, audioFile);
            if (audErr) throw audErr;
            const audioUrl = supabase.storage.from('audio').getPublicUrl(audPath).data.publicUrl;

            // الحفظ في قاعدة البيانات
            const { error: dbErr } = await supabase.from('songs').insert([{ name, imageUrl, audioUrl }]);
            if (dbErr) throw dbErr;

            alert('تمت الإضافة بنجاح');
            location.reload();
        } catch (err) {
            alert('حدث خطأ: ' + err.message);
            addBtn.disabled = false;
            addBtn.innerHTML = 'رفع القصيدة الآن';
        }
    });
}

// ─── 4. جلب وعرض القصائد ───────────────────────────────────────────────────
async function loadSongs() {
    const adminList = document.getElementById('admin-songs-list');
    const publicList = document.getElementById('songs-list');
    
    const { data, error } = await supabase.from('songs').select('*').order('id', { ascending: false });
    if (error) return console.error('Error:', error);

    const renderCard = (song, isAdmin) => `
        <div class="song-card">
            <img src="${song.imageUrl}" class="song-image">
            <div class="song-info">
                <h3 class="song-title">${song.name}</h3>
                ${!isAdmin ? `<audio controls controlsList="nodownload"><source src="${song.audioUrl}"></audio>` : ''}
                <div class="song-controls">
                    ${isAdmin ? `
                        <button class="btn edit-btn" onclick="window.prepareEdit('${song.id}', '${song.name}')">تعديل</button>
                        <button class="btn delete-btn" onclick="window.deleteSong('${song.id}')">حذف</button>
                    ` : `
                        <a href="${song.audioUrl}" download="${song.name}.mp3" class="download-btn">تحميل MP3</a>
                    `}
                </div>
            </div>
        </div>`;

    if (adminList) adminList.innerHTML = data.map(s => renderCard(s, true)).join('');
    if (publicList) publicList.innerHTML = data.map(s => renderCard(s, false)).join('');
}

// ─── 5. وظائف الحذف والتعديل (Global) ────────────────────────────────────────
window.deleteSong = async (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        const { error } = await supabase.from('songs').delete().eq('id', id);
        if (error) alert('فشل الحذف');
        else location.reload();
    }
};

window.prepareEdit = (id, name) => {
    document.getElementById('edit-song-id').value = id;
    document.getElementById('edit-song-name').value = name;
    document.getElementById('edit-modal').style.display = 'flex';
};

window.closeEditModal = () => {
    document.getElementById('edit-modal').style.display = 'none';
};

window.saveSongEdits = async () => {
    const id = document.getElementById('edit-song-id').value;
    const newName = document.getElementById('edit-song-name').value;
    const imageFile = document.getElementById('edit-song-image').files[0];
    
    let updateData = { name: newName };

    try {
        if (imageFile) {
            const imgPath = getUniqueFileName(imageFile);
            await supabase.storage.from('images').upload(imgPath, imageFile);
            updateData.imageUrl = supabase.storage.from('images').getPublicUrl(imgPath).data.publicUrl;
        }

        const { error } = await supabase.from('songs').update(updateData).eq('id', id);
        if (error) throw error;
        
        alert('تم التحديث بنجاح');
        location.reload();
    } catch (err) {
        alert('خطأ في التحديث: ' + err.message);
    }
};

// تشغيل العرض التلقائي للصفحة الرئيسية
if (document.getElementById('songs-list')) loadSongs();
