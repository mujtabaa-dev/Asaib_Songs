// ─────────────────────────────────────────────────────
// Supabase SDK + تحسينات الأمان والأداء
// ─────────────────────────────────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// إعداد Supabase
const supabaseUrl = 'https://kirfkztiymzpcwoskiic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmZrenRpeW16cGN3b3NraWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDA2MDYsImV4cCI6MjA5MjcxNjYwNn0.DjpECA_pZLfJfIGK8EcKk2nfKW3KUrlEU8v6jvXrzto';

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── عناصر واجهة المستخدم المشتركة ───────────────────
const getEl = (id) => document.getElementById(id);
const showLoading = (btn) => {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
    btn.disabled = true;
};
const hideLoading = (btn) => {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
};
const showError = (msg) => {
    console.error('❌ Error:', msg);
    const errorEl = getEl('error-msg');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        setTimeout(() => errorEl.style.display = 'none', 5000);
    }
};

// ─── تسجيل الدخول ───────────────────────────────────
getEl('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = getEl('email')?.value.trim();
    const password = getEl('password')?.value;

    if (!email || !password) {
        showError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }

    try {
        if (btn) showLoading(btn);
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // تحليل أخطاء المصادقة الشائعة
            const errorMap = {
                'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً',
                'Too many requests': 'محاولات كثيرة، يرجى المحاولة لاحقًا'
            };
            throw new Error(errorMap[error.message] || error.message);
        }

        if (data?.user) {
            window.location.href = 'admin.html';
        } else {
            throw new Error('فشل في تسجيل الدخول');
        }

    } catch (err) {
        showError(err.message);
    } finally {
        if (btn) hideLoading(btn);
    }
});

// ─── حماية صفحة الإدارة ─────────────────────────────
if (window.location.href.includes('admin.html')) {
    (async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                window.location.replace('login.html');
                return;
            }
            const adminMain = getEl('admin-main');
            if (adminMain) adminMain.style.display = '';
        } catch (err) {
            console.error('Auth check failed:', err);
            window.location.replace('login.html');
        }
    })();
}

// ─── وظيفة تجهيز التعديل ─────────────────────────────
window.prepareEdit = async (id, name) => {
    try {
        // جلب بيانات القصيدة الكاملة من القاعدة
        const { data: song, error } = await supabase
            .from('songs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // ملء النموذج بالبيانات الحالية
        getEl('song-name').value = song.name || '';
        
        // عرض معاينة للصورة الحالية إذا وُجدت
        const imgPreview = getEl('image-preview');
        if (imgPreview && song.imageUrl) {
            imgPreview.src = song.imageUrl;
            imgPreview.style.display = 'block';
        }

        // تحديث زر الإضافة لوضع التعديل
        const btn = getEl('add-song-btn');
        if (btn) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-save"></i> تحديث القصيدة الحالية';
            btn.style.background = '#f39c12';
            btn.dataset.editId = id;
            btn.dataset.hasAudio = song.audioUrl ? 'true' : 'false';
            btn.dataset.hasImage = song.imageUrl ? 'true' : 'false';
        }

        // إعادة تعيين حقول الملفات (لعدم إجبار المستخدم على إعادة الرفع)
        const audioInput = getEl('song-audio');
        const imageInput = getEl('song-image');
        if (audioInput) audioInput.value = '';
        if (imageInput) imageInput.value = '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (err) {
        showError('فشل في تحميل بيانات القصيدة: ' + err.message);
    }
};

// ─── دالة مساعدة لحذف ملف من Storage ─────────────────
async function deleteFileFromStorage(fileUrl, bucketName) {
    if (!fileUrl) return true;
    try {
        // استخراج مسار الملف من الرابط العام
        const urlParts = fileUrl.split(`/storage/v1/object/public/${bucketName}/`);
        if (urlParts.length < 2) return false;
        
        const filePath = decodeURIComponent(urlParts[1]);
        const { error } = await supabase.storage.from(bucketName).remove([filePath]);
        
        if (error) {
            console.warn(`⚠️ Failed to delete ${filePath}:`, error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn(`⚠️ Error deleting file:`, err);
        return false;
    }
}

// ─── إضافة أو تحديث أغنية ───────────────────────────
getEl('add-song-btn')?.addEventListener('click', async () => {
    const name = getEl('song-name')?.value.trim();
    const audioFile = getEl('song-audio')?.files[0];
    const imageFile = getEl('song-image')?.files[0];
    const btn = getEl('add-song-btn');
    const editId = btn?.dataset.editId;

    // ✅ التحقق من المدخلات الأساسية
    if (!name) {
        showError('الرجاء إدخال اسم القصيدة');
        return;
    }

    if (!editId) {
        // عند الإضافة الجديدة: مطلوب الملفات
        if (!audioFile) {
            showError('الرجاء اختيار ملف الصوت للقصيدة الجديدة');
            return;
        }
        if (!imageFile) {
            showError('الرجاء اختيار صورة للقصيدة الجديدة');
            return;
        }
    }

    if (!btn) return;
    
    try {
        showLoading(btn);
        let songData = { name };
        let uploadedAudioUrl = null;
        let uploadedImageUrl = null;

        // 📤 رفع الصورة (فقط إذا تم اختيار ملف جديد)
        if (imageFile) {
            // التحقق من نوع الملف
            const allowedImgTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedImgTypes.includes(imageFile.type)) {
                throw new Error('نوع الصورة غير مدعوم. يرجى استخدام JPG, PNG, أو WebP');
            }
            // التحقق من الحجم (أقصى حجم 5 ميجابايت)
            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error('حجم الصورة كبير جدًا. الحد الأقصى: 5 ميجابايت');
            }

            const imgPath = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${imageFile.name}`;
            const { error: imgErr } = await supabase.storage
                .from('images')
                .upload(imgPath, imageFile, { upsert: false });
            
            if (imgErr) throw new Error(`فشل رفع الصورة: ${imgErr.message}`);
            
            uploadedImageUrl = supabase.storage
                .from('images')
                .getPublicUrl(imgPath).data.publicUrl;
            songData.imageUrl = uploadedImageUrl;
        }

        // 🎵 رفع الصوت (فقط إذا تم اختيار ملف جديد)
        if (audioFile) {
            const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
            if (!allowedAudioTypes.includes(audioFile.type)) {
                throw new Error('نوع الملف الصوتي غير مدعوم. يرجى استخدام MP3, WAV, أو OGG');
            }
            if (audioFile.size > 20 * 1024 * 1024) {
                throw new Error('حجم الملف الصوتي كبير جدًا. الحد الأقصى: 20 ميجابايت');
            }

            const audPath = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${audioFile.name}`;
            const { error: audErr } = await supabase.storage
                .from('audio')
                .upload(audPath, audioFile, { upsert: false });
            
            if (audErr) throw new Error(`فشل رفع الصوت: ${audErr.message}`);
            
            uploadedAudioUrl = supabase.storage
                .from('audio')
                .getPublicUrl(audPath).data.publicUrl;
            songData.audioUrl = uploadedAudioUrl;
        }

        if (editId) {
            // 🔁 وضع التحديث: تحديث الحقول المختارة فقط
            const { error } = await supabase
                .from('songs')
                .update(songData)
                .eq('id', editId);
            
            if (error) throw new Error(`فشل في التحديث: ${error.message}`);
            
            alert('✅ تم تحديث القصيدة بنجاح!');
        } else {
            // ➕ وضع الإضافة الجديدة
            const { error } = await supabase
                .from('songs')
                .insert([{ ...songData, createdAt: new Date().toISOString() }]);
            
            if (error) throw new Error(`فشل في الإضافة: ${error.message}`);
            
            alert('✅ تمت إضافة القصيدة بنجاح!');
        }

        // إعادة تعيين النموذج
        if (getEl('song-name')) getEl('song-name').value = '';
        if (getEl('song-audio')) getEl('song-audio').value = '';
        if (getEl('song-image')) getEl('song-image').value = '';
        const imgPreview = getEl('image-preview');
        if (imgPreview) {
            imgPreview.src = '';
            imgPreview.style.display = 'none';
        }
        
        // إعادة الزر لحالته الأصلية
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus"></i> إضافة قصيدة جديدة';
            btn.style.background = '';
            delete btn.dataset.editId;
            delete btn.dataset.hasAudio;
            delete btn.dataset.hasImage;
        }

        location.reload();

    } catch (err) {
        console.error('❌ Operation failed:', err);
        showError('حدث خطأ: ' + err.message);
        
        // تنظيف: إذا فشل الرفع، نحذف الملفات المرفوعة جزئيًا
        if (uploadedImageUrl) await deleteFileFromStorage(uploadedImageUrl, 'images');
        if (uploadedAudioUrl) await deleteFileFromStorage(uploadedAudioUrl, 'audio');
        
    } finally {
        if (btn) hideLoading(btn);
    }
});

// ─── عرض الأغاني ─────────────────────────────────────
async function displaySongs() {
    const songsList = getEl('songs-list'); 
    const adminSongsList = getEl('admin-songs-list');

    if (!songsList && !adminSongsList) return;

    try {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) throw error;
        if (!data || data.length === 0) {
            const emptyMsg = '<p class="text-center text-muted">لا توجد قصائد مضافة بعد</p>';
            if (songsList) songsList.innerHTML = emptyMsg;
            if (adminSongsList) adminSongsList.innerHTML = emptyMsg;
            return;
        }

        // 📱 عرض الصفحة الرئيسية
        if (songsList) {
            songsList.innerHTML = data.map(song => `
                <div class="song-card">
                    <img src="${song.imageUrl || 'placeholder.jpg'}" 
                         alt="${song.name}" 
                         class="song-image"
                         onerror="this.src='placeholder.jpg'">
                    <div class="song-info">
                        <h3 class="song-title">${song.name}</h3>
                        <div class="song-controls">
                            <audio controls preload="none">
                                <source src="${song.audioUrl}" type="audio/mpeg">
                                متصفحك لا يدعم مشغل الصوت.
                            </audio>
                            <a href="${song.audioUrl}" download="${song.name}.mp3" class="btn-download">
                                <i class="fas fa-download"></i> تنزيل
                            </a>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // ⚙️ عرض لوحة الإدارة
        if (adminSongsList) {
            adminSongsList.innerHTML = data.map(song => `
                <div class="song-card">
                    <img src="${song.imageUrl || 'placeholder.jpg'}" 
                         alt="${song.name}" 
                         class="song-image"
                         onerror="this.src='placeholder.jpg'">
                    <div class="song-info">
                        <h3 class="song-title">${song.name}</h3>
                        <div class="song-controls" style="display:flex;flex-direction:column;gap:8px;">
                            <button class="btn btn-edit" 
                                    style="background:#f39c12;width:100%;" 
                                    onclick="window.prepareEdit('${song.id}', '${song.name.replace(/'/g, "\\'")}')">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button class="btn btn-delete" 
                                    style="background:#e74c3c;width:100%;" 
                                    onclick="window.deleteSong('${song.id}', '${song.audioUrl || ''}', '${song.imageUrl || ''}')">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('❌ Error fetching songs:', err);
        showError('فشل في جلب قائمة القصائد: ' + err.message);
    }
}

// ─── حذف أغنية مع تنظيف الملفات ──────────────────────
window.deleteSong = async (songId, audioUrl, imageUrl) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه القصيدة؟\nسيتم حذف الملفات المرتبطة بها نهائيًا.')) return;

    const btn = event?.target?.closest('button');
    if (btn) showLoading(btn);

    try {
        // 1️⃣ حذف الملفات من Storage أولاً (لتجنب الملفات اليتيمة)
        const deleteTasks = [];
        
        if (audioUrl) {
            deleteTasks.push(deleteFileFromStorage(audioUrl, 'audio'));
        }
        if (imageUrl) {
            deleteTasks.push(deleteFileFromStorage(imageUrl, 'images'));
        }
        
        // انتظار حذف الملفات (مع الاستمرار حتى لو فشل أحدها)
        await Promise.allSettled(deleteTasks);

        // 2️⃣ حذف السجل من قاعدة البيانات
        const { error } = await supabase
            .from('songs')
            .delete()
            .eq('id', songId);
        
        if (error) throw new Error(error.message);

        alert('✅ تم حذف القصيدة وملفاتها بنجاح');
        location.reload();

    } catch (err) {
        console.error('❌ Delete failed:', err);
        showError('فشل في الحذف: ' + err.message);
        alert('⚠️ قد يكون الحذف جزئيًا. يرجى التحقق يدويًا.');
    } finally {
        if (btn) hideLoading(btn);
    }
};

// ─── تهيئة عند تحميل الصفحة ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    displaySongs();
    
    // إضافة معاينة فورية للصورة عند الاختيار
    const imageInput = getEl('song-image');
    const imgPreview = getEl('image-preview');
    
    if (imageInput && imgPreview) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imgPreview.src = ev.target.result;
                    imgPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// جعل الدوال متاحة عالميًا
window.displaySongs = displaySongs;
window.deleteSong = deleteSong;
window.prepareEdit = prepareEdit;
