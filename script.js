// Supabase SDK
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// إعداد Supabase
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';
const supabase = createClient(supabaseUrl, supabaseKey);

// دالة لعرض رسالة خطأ
function showError(message) {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}

// دالة لاخفاء رسالة خطأ
function hideError() {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

// تسجيل الدخول
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(); // اخفاء أي رسالة خطأ سابقة

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // التحقق من الفراغ
    if (!email || !password) {
        showError('الرجاء ملء جميع الحقول');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Login error:", error);
            showError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else {
            console.log("Login successful:", data);
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'admin.html';
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        showError('حدث خطأ غير متوقع');
    }
});

// التحقق من تسجيل الدخول عند فتح admin.html
if (window.location.pathname === '/admin.html') {
    const checkAuth = async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            console.error("Not authenticated:", error);
            window.location.href = 'login.html';
        } else {
            console.log("User is authenticated:", user);
        }
    };

    checkAuth();
}

// إضافة أغنية جديدة
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
        const { data: imageData, error: imageError } = await supabase.storage
            .from('images')
            .upload(`${imageFile.name}`, imageFile);

        if (imageError) throw imageError;

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/images/${imageFile.name}`;

        // رفع الأغنية
        const { data: audioData, error: audioError } = await supabase.storage
            .from('audio')
            .upload(`${audioFile.name}`, audioFile);

        if (audioError) throw audioError;

        const audioUrl = `${supabaseUrl}/storage/v1/object/public/audio/${audioFile.name}`;

        // حفظ في قاعدة البيانات
        const { data, error } = await supabase
            .from('songs')
            .insert([{ name, imageUrl, audioUrl }]);

        if (error) throw error;

        alert('تم إضافة الأغنية بنجاح!');
        location.reload();
    } catch (error) {
        console.error("Error adding song: ", error);
        alert('حدث خطأ أثناء رفع الأغنية');
    }
});

// عرض الأغاني
async function displaySongs() {
    const songsList = document.getElementById('songs-list');
    const adminSongsList = document.getElementById('admin-songs-list');

    if (!songsList && !adminSongsList) return;

    try {
        const { data, error } = await supabase
            .from('songs')
            .select('*');

        if (error) throw error;

        if (songsList) {
            songsList.innerHTML = '';
            data.forEach(song => {
                const songCard = document.createElement('div');
                songCard.className = 'song-card';
                songCard.innerHTML = `
                    <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                    <div class="song-info">
                        <h3 class="song-title">${song.name}</h3>
                        <div class="song-controls">
                            <audio controls>
                                <source src="${song.audioUrl}" type="audio/mpeg">
                            </audio>
                            <a href="${song.audioUrl}" download><i class="fas fa-download"></i> تنزيل</a>
                        </div>
                    </div>
                `;
                songsList.appendChild(songCard);
            });
        }

        if (adminSongsList) {
            adminSongsList.innerHTML = '';
            data.forEach(song => {
                const songCard = document.createElement('div');
                songCard.className = 'song-card';
                songCard.innerHTML = `
                    <img src="${song.imageUrl}" alt="${song.name}" class="song-image">
                    <div class="song-info">
                        <h3 class="song-title">${song.name}</h3>
                        <div class="song-controls">
                            <button class="btn" onclick="deleteSong('${song.id}')"><i class="fas fa-trash"></i> حذف</button>
                        </div>
                    </div>
                `;
                adminSongsList.appendChild(songCard);
            });
        }
    } catch (error) {
        console.error("Error fetching songs: ", error);
    }
}

// حذف أغنية
async function deleteSong(songId) {
    if (confirm('هل أنت متأكد من حذف هذه الأغنية؟')) {
        try {
            const { error } = await supabase
                .from('songs')
                .delete()
                .eq('id', songId);

            if (error) throw error;

            alert('تم حذف الأغنية بنجاح!');
            location.reload();
        } catch (error) {
            console.error("Error deleting song: ", error);
            alert('حدث خطأ أثناء حذف الأغنية');
        }
    }
}

// عرض الأغاني عند تحميل الصفحة
displaySongs();
