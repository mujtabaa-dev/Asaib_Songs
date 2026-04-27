import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- وظائف العرض ---
async function displaySongs() {
    const adminSongsList = document.getElementById('admin-songs-list');
    const songsList = document.getElementById('songs-list');
    const { data, error } = await supabase.from('songs').select('*').order('id', { ascending: false });

    if (error) return console.error('Error fetching:', error);

    const content = data.map(song => `
        <div class="song-card" id="song-${song.id}">
            <img src="${song.imageUrl}" class="song-image" id="img-${song.id}">
            <div class="song-info">
                <h3 id="name-${song.id}">${song.name}</h3>
                <div class="song-controls">
                    ${adminSongsList ? `
                        <button class="btn edit-btn" onclick="window.prepareEdit('${song.id}')"><i class="fas fa-edit"></i> تعديل</button>
                        <button class="btn delete-btn" onclick="window.deleteSong('${song.id}')"><i class="fas fa-trash"></i> حذف</button>
                    ` : `<audio controls><source src="${song.audioUrl}"></audio>`}
                </div>
            </div>
        </div>
    `).join('');

    if (adminSongsList) adminSongsList.innerHTML = content;
    if (songsList) songsList.innerHTML = content;
}

// --- وظيفة الحذف ---
window.deleteSong = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه القصيدة؟')) return;
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (error) alert('خطأ في الحذف');
    else location.reload();
};

// --- وظائف التعديل ---
window.prepareEdit = (id) => {
    const name = document.getElementById(`name-${id}`).innerText;
    const newName = prompt("تعديل اسم القصيدة:", name);
    if (newName === null) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    if (confirm("هل تريد تغيير الصورة أيضاً؟")) {
        fileInput.onchange = async () => {
            const file = fileInput.files[0];
            await window.updateSong(id, newName, file);
        };
        fileInput.click();
    } else {
        window.updateSong(id, newName, null);
    }
};

window.updateSong = async (id, newName, imageFile) => {
    let updateData = { name: newName };

    if (imageFile) {
        const fileName = `${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, imageFile);
        if (uploadError) return alert('خطأ في رفع الصورة الجديدة');
        
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        updateData.imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from('songs').update(updateData).eq('id', id);
    if (error) alert('خطأ في تحديث البيانات');
    else {
        alert('تم التحديث بنجاح');
        location.reload();
    }
};

// تشغيل العرض
displaySongs();
