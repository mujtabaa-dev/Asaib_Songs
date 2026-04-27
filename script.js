import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── حماية صفحة الإدارة ──────────────────────────────────────────────────────
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

// ─── دالة إضافة أغنية (مع إصلاح عدم الاستجابة) ──────────────────────────────────
const addBtn = document.getElementById('add-song-btn');
if (addBtn) {
    addBtn.addEventListener('click', async () => {
        const name = document.getElementById('song-name').value;
        const audioFile = document.getElementById('song-audio').files[0];
        const imageFile = document.getElementById('song-image').files[0];

        // التحقق من الحقول
        if (!name || !audioFile || !imageFile) {
            alert('يرجى ملء كافة الحقول واختيار الملفات');
            return;
        }

        // تغيير حالة الزر لمنع الضغط المتكرر
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';

        try {
            console.log("بدء عملية الرفع...");

            // 1. رفع الصورة
            const imgPath = `${Date.now()}_img_${imageFile.name}`;
            const { error: imgErr } = await supabase.storage.from('images').upload(imgPath, imageFile);
            if (imgErr) throw new Error("خطأ في رفع الصورة: " + imgErr.message);
            const imageUrl = supabase.storage.from('images').getPublicUrl(imgPath).data.publicUrl;

            // 2. رفع الصوت
            const audPath = `${Date.now()}_aud_${audioFile.name}`;
            const { error: audErr } = await supabase.storage.from('audio').upload(audPath, audioFile);
            if (audErr) throw new Error("خطأ في رفع الملف الصوتي: " + audErr.message);
            const audioUrl = supabase.storage.from('audio').getPublicUrl(audPath).data.publicUrl;

            // 3. الحفظ في قاعدة البيانات
            const { error: dbErr } = await supabase.from('songs').insert([
                { name: name, imageUrl: imageUrl, audioUrl: audioUrl }
            ]);
            if (dbErr) throw new Error("خطأ في حفظ البيانات: " + dbErr.message);

            alert('تمت إضافة القصيدة بنجاح!');
            location.reload();

        } catch (err) {
            console.error(err);
            alert(err.message);
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="fas fa-upload"></i> ارفع الآن';
        }
    });
}

// ─── جلب وعرض القصائد ───────────────────────────────────────────────────
async function loadSongs() {
    const adminList = document.getElementById('admin-songs-list');
    const publicList = document.getElementById('songs-list');
    
    const { data, error } = await supabase.from('songs').select('*').order('id', { ascending: false });
    if (error) return console.error('خطأ في جلب البيانات:', error);

    const renderCard = (song, isAdmin) => {
        const downloadUrl = `${song.audioUrl}?download=${encodeURIComponent(song.name)}.mp3`;
        return `
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
                        <a href="${downloadUrl}" class="download-btn">تحميل MP3</a>
                    `}
                </div>
            </div>
        </div>`;
    };

    if (adminList) adminList.innerHTML = data.map(s => renderCard(s, true)).join('');
    if (publicList) publicList.innerHTML = data.map(s => renderCard(s, false)).join('');
}

// ─── الدوال العالمية (Global) ────────────────────────────────────────────────
window.deleteSong = async (id) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        const { error } = await supabase.from('songs').delete().eq('id', id);
        if (error) alert('فشل الحذف'); else location.reload();
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
    const newImg = document.getElementById('edit-song-image').files[0];
    
    let updateData = { name: newName };
    try {
        if (newImg) {
            const path = `${Date.now()}_${newImg.name}`;
            await supabase.storage.from('images').upload(path, newImg);
            updateData.imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
        }
        await supabase.from('songs').update(updateData).eq('id', id);
        location.reload();
    } catch (e) { alert(e.message); }
};

// تشغيل العرض للصفحة الرئيسية
if (document.getElementById('songs-list')) loadSongs();
