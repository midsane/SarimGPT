import { supabaseServer } from "./supabaseServerClient";

export const uploadToSupabaseBucket = async (imageData: string): Promise<string | null> => {

    const filename = `img_${Date.now()}.png`;
    const buffer = Buffer.from(imageData, "base64");
    const bucketName = 'midgpt-image';

    // === STEP 1: UPLOAD THE IMAGE ===
    const { error: uploadError } = await supabaseServer.storage
        .from(bucketName)
        .upload(filename, buffer, {
            contentType: 'image/png',
            upsert: false
        });

    if (uploadError) {
        console.error("Error during Supabase upload:", uploadError.message);
        // If upload fails, stop and return null
        return null;
    }

    // === STEP 2: GET THE PUBLIC URL FOR THE FILE YOU JUST UPLOADED ===
    const { data: urlData } = supabaseServer.storage
        .from(bucketName)
        .getPublicUrl(filename);

    // === STEP 3: RETURN THE URL ===
    return urlData.publicUrl;
}