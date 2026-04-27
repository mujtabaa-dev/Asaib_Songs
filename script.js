import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

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
        document.getElementById('error-msg').textContent = 'خطأ في الدخول: ' + error.message;
    } else {
        window.location.href = 'admin.html';
    }
});

// ─── حماية صفحة الإدارة ──────────────────────────────────────────────────────
if (window.location.href.includes('admin.html')) {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.replace('login.html');
        } else {
            document.getElementById('admin-main').style.display = 'block';
        }
    };
    checkUser();
}

// ─── إضافة أغنية جديدة (الإصلاح هنا) ──────────────────────────────────────────
document.getElementById('add-song-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('song-name').value;
    const audioFile = document.getElementById('song-audio').files[0];
    const imageFile = document.getElementById('song-image').files[0];

    if (!name || !audioFile || !imageFile) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }

    try {
        // 1. رفع الصورة مع اسم فريد لتجنب التكرار
        const imgName = `${Date.now()}_${imageFile.name}`;
        const { error: imgErr } = await supabase.storage.from('images').upload(imgName, imageFile);
        if (imgErr) throw imgErr;
        
        // جلب الرابط العام للصورة
        const { data: imgData } = supabase.storage.from('images').getPublicUrl(imgName);
        const imageUrl = imgData.publicUrl;

        // 2. رفع الأغنية مع اسم فريد
        const audName = `${Date.now()}_${audioFile.name}`;
        const { error: audErr } = await supabase.storage.from('audio').upload(audName, audioFile);
        if (audErr) throw audErr;

        // جلب الرابط العام للأغنية
        const { data: audData } = supabase.storage.from('audio').getPublicUrl(audName);
        const audioUrl = audData.publicUrl;

        // 3. الحفظ في قاعدة البيانات (تأكد أن اسم العمود createdAt أو created_at مطابق لجدولك)
        const { error: dbErr } = await supabase.from('songs').insert([
            { name, imageUrl, audioUrl }
        ]);
        if (dbErr) throw dbErr;

        alert('تمت إضافة القصيدة بنجاح!');
        location.reload();
    } catch (err) {
        console.error('Error:', err);
        alert('حدث خطأ: ' + err.message);
    }
});

// ─── عرض الأغاني (الإصلاح هنا لضمان العرض في index) ───────────────────────────
async function displaySongs() {
    const songsList = document.getElementById('songs-list');
    const adminSongsList = document.getElementById('admin-songs-list');

    // جلب البيانات من الجدول
    const { data, error } = await supabase.from('songs').select('*').order('id', { ascending: false });
    
    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    // وظيفة لإنشاء كرت القصيدة
    const createCard = (song, isAdmin) => {
        return `
            <div class="song-card">
                <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                <div class="song-info">
                    <h3 class="song-title">${song.name}</h3>
                    <div class="song-controls">
                        <audio controls><source src="${song.audioUrl}" type="audio/mpeg"></audio>
                        ${isAdmin 
                            ? `<button class="btn" onclick="window.deleteSong('${song.id}')"><i class="fas fa-trash"></i> حذف</button>`
                            : `<a href="${song.audioUrl}" download class="btn"><i class="fas fa-download"></i> تنزيل</a>`
                        }
                    </div>
                </div>
            </div>`;
    };

    if (songsList) {
        songsList.innerHTML = data.map(song => createCard(song, false)).join('');
    }
    if (adminSongsList) {
        adminSongsList.innerHTML = data.map(song => createCard(song, true)).join('');
    }
}

// ─── حذف أغنية ───────────────────────────────────────────────────────────────
window.deleteSong = async (songId) => {
    if (!confirm('هل أنت متأكد؟')) return;
    const { error } = await supabase.from('songs').delete().eq('id', songId);
    if (error) alert('خطأ في الحذف');
    else location.reload();
};

displaySongs();
