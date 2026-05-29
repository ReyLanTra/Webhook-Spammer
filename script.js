let isRunning = false;

// Fungsi menampilkan log ke komponen konsol UI
function logMessage(text, type = 'info') {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerText = `[${timestamp}] ${text}`;
    
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

// Konversi nilai warna heksadesimal ke desimal integer
function hexToDecimal(hexStr) {
    return parseInt(hexStr.replace("#", ""), 16);
}

// Fungsi utama penanganan eksekusi pengiriman
async function startProcess() {
    if (isRunning) return;

    // Mengambil nilai elemen input dari DOM HTML
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    const contentOutside = document.getElementById('outside-content').value.trim();
    const title = document.getElementById('embed-title').value.trim();
    const description = document.getElementById('message-content').value.trim();
    const footerText = document.getElementById('embed-footer').value.trim();
    const hexColor = document.getElementById('embed-color').value;
    
    const mainImageFile = document.getElementById('image-file').files[0];
    const thumbnailFile = document.getElementById('thumbnail-file').files[0];
    
    const count = parseInt(document.getElementById('loop-count').value);
    const delay = parseInt(document.getElementById('delay-time').value);
    const button = document.getElementById('start-btn');

    if (!webhookUrl) {
        logMessage("Error: URL Webhook wajib diisi!", "error");
        return;
    }

    isRunning = true;
    button.disabled = true;
    button.innerText = "Proses Berjalan...";

    const numericColor = hexToDecimal(hexColor);
    logMessage(`Proses dimulai oleh ReyLan. Menggunakan pengiriman Multipart FormData biner.`, "info");

    for (let i = 1; i <= count; i++) {
        if (!isRunning) break;

        // Inisialisasi objek FormData baru untuk membungkus data biner berkas asli
        const formData = new FormData();

        // Menyusun kerangka objek skema embed sesuai dokumentasi Discord API
        const payloadJson = {
            content: contentOutside || undefined,
            embeds: [{
                title: title || undefined,
                description: description || undefined,
                color: numericColor,
                footer: footerText ? { text: footerText } : undefined,
                timestamp: new Date().toISOString()
            }]
        };

        // Penanganan Validasi Berkas Gambar Utama (Besar)
        if (mainImageFile) {
            // Memasukkan berkas mentah ke FormData dengan nama unik 'main_img.png'
            formData.append('files[0]', mainImageFile, 'main_img.png');
            // Merujuk skema URL internal gambar ke nama berkas lampiran di atas
            payloadJson.embeds[0].image = { url: 'attachment://main_img.png' };
        }

        // Penanganan Validasi Berkas Gambar Mini (Thumbnail)
        if (thumbnailFile) {
            // Memasukkan berkas mentah ke FormData dengan nama unik 'thumb_img.png'
            formData.append('files[1]', thumbnailFile, 'thumb_img.png');
            // Merujuk skema URL internal thumbnail ke nama berkas lampiran di atas
            payloadJson.embeds[0].thumbnail = { url: 'attachment://thumb_img.png' };
        }

        // Fallback proteksi jika seluruh kolom parameter dikosongkan total oleh pengguna
        if (!contentOutside && !title && !description && !mainImageFile && !thumbnailFile && !footerText) {
            payloadJson.content = "Pengiriman otomatis biner terpicu.";
            payloadJson.embeds = undefined;
        }

        // Memasukkan seluruh paket konfigurasi JSON string ke dalam kolom 'payload_json' FormData
        formData.append('payload_json', JSON.stringify(payloadJson));

        try {
            // Kirim paket FormData langsung tanpa menyertakan manual header Content-Type
            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: formData
            });

            if (response.status === 204 || response.ok) {
                logMessage(`[${i}/${count}] Paket data FormData berhasil dikirim.`, "success");
            } else if (response.status === 429) {
                const rateLimitData = await response.json();
                const waitTime = rateLimitData.retry_after || 1000;
                logMessage(`[Pembatasan] Rate limit aktif. Menunggu ${waitTime}ms.`, "warn");
                await new Promise(res => setTimeout(res, waitTime));
                i--; // Ulang urutan indeks yang gagal karena terkena batasan limit
                continue;
            } else {
                const errorResponse = await response.text();
                logMessage(`[${i}/${count}] Gagal dikirim. Kode Status: ${response.status}. Detail: ${errorResponse}`, "error");
            }
        } catch (err) {
            logMessage(`[${i}/${count}] Gangguan Jaringan: ${err.message}`, "error");
        }

        // Memberikan jeda waktu antar perulangan siklus pengiriman data
        if (i < count) {
            await new Promise(res => setTimeout(res, delay));
        }
    }

    logMessage("Seluruh siklus pengiriman selesai.", "info");
    isRunning = false;
    button.disabled = false;
    button.innerText = "Mulai Pengiriman";
}
