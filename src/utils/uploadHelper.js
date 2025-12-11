const { supabase } = require('./supabaseClient');

async function uploadImagesToSupabase(files) {
    const bucketName = 'productimages';
    const results = [];
    for (const file of files) {
        const sanitized = file.originalname
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitized}`;
        const { error } = await supabase.storage.from(bucketName).upload(fileName, file.buffer, {
            contentType: file.mimetype
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        results.push(data.publicUrl);
    }
    return results;
}

module.exports = { uploadImagesToSupabase };
