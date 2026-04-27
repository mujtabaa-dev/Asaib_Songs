import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── 1. إدارة تسجيل الدخول والتحويل ──────────────────────────────────────────
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
            // التحويل التلقائي إلى صفحة الإدارة بعد النجاح
            window.location.assign('admin.html');
        }
    });
}

// ─── 2. حماية صفحة الإدارة وإظهارها ──────────────────────────────────────────
if (window.location.pathname.includes('admin.html')) {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // إذا لم يسجل دخول، ارجعه لصفحة الدخول
            window.location.replace('login.html');
        } else {
            // إظهار اللوحة المخفية
            const adminMain = document.getElementById('admin-main');
            if (adminMain) adminMain.style.display = 'block';
            displaySongs(); // تشغيل عرض الأغاني للإدارة
        }
    };
    checkUser();
}

// ─── 3. وظيفة عرض الأغاني (إدارة + عامة) ──────────────────────────────────────
async function displaySongs() {
    const adminSongsList = document.getElementById('admin-songs-list');
    const publicSongsList = document.getElementById('songs-list');
    
    const { data, error } = await supabase.from('songs').select('*').order('id', { ascending: false });
    if (error) return console.error(error);

    const generateHTML = (song, isAdmin) => `
        <div class="song-card">
            <img src="${song.imageUrl}" class="song-image">
            <div class="song-info">
                <h3>${song.name}</h3>
                <div class="song-controls">
                    ${isAdmin ? `
                        <button class="btn edit-btn" onclick="window.openEditModal('${song.id}', '${song.name}')">تعديل</button>
                        <button class="btn delete-btn" onclick="window.deleteSong('${song.id}')">حذف</button>
                    ` : `<audio controls><source src="${song.audioUrl}"></audio>`}
                </div>
            </div>
        </div>`;

    if (adminSongsList) adminSongsList.innerHTML = data.map(s => generateHTML(s, true)).join('');
    if (publicSongsList) publicSongsList.innerHTML = data.map(s => generateHTML(s, false)).join('');
}

// ─── 4. إضافة أغنية جديدة ───────────────────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];

    if (!name || !audioFile || !imageFile) return alert('أكمل البيانات');

    try {
        const imgPath = `img_${Date.now()}`;
        await supabase.storage.from('images').upload(imgPath, imageFile);
        const { data: imgUrl } = supabase.storage.from('images').getPublicUrl(imgPath);

        const audPath = `aud_${Date.now()}`;
        await supabase.storage.from('audio').upload(audPath, audioFile);
        const { data: audUrl } = supabase.storage.from('audio').getPublicUrl(audPath);

        await supabase.from('songs').insert([{ name, imageUrl: imgUrl.publicUrl, audioUrl: audUrl.publicUrl }]);
        location.reload();
    } catch (e) { alert(e.message); }
});

// ─── 5. وظائف التعديل والحذف (Global) ────────────────────────────────────────
window.deleteSong = async (id) => {
    if (confirm('حذف؟')) {
        await supabase.from('songs').delete().eq('id', id);
        location.reload();
    }
};

window.openEditModal = (id, currentName) => {
    document.getElementById('edit-song-id').value = id;
    document.getElementById('edit-song-name').value = currentName;
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

    if (newImg) {
        const path = `img_${Date.now()}`;
        await supabase.storage.from('images').upload(path, newImg);
        updateData.imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
    }

    await supabase.from('songs').update(updateData).eq('id', id);
    location.reload();
};

// تشغيل العرض للصفحة الرئيسية
if (document.getElementById('songs-list')) displaySongs();
