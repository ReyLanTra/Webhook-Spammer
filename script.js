let isRunning = false;

function logMessage(text, type = 'info') {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerText = `[${timestamp}] ${text}`;
    
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

function getFileUrl(file) {
    return new Promise((resolve) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function hexToDecimal(hexStr) {
    return parseInt(hexStr.replace("#", ""), 16);
}

async function startProcess() {
    if (isRunning) return;

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

    let mainImageUrl = null;
    if (mainImageFile) {
        logMessage("Memproses file gambar utama...", "info");
        mainImageUrl = await getFileUrl(mainImageFile);
    }

    let thumbnailUrl = null;
    if (thumbnailFile) {
        logMessage("Memproses file gambar mini (thumbnail)...", "info");
        thumbnailUrl = await getFileUrl(thumbnailFile);
    }

    const numericColor = hexToDecimal(hexColor);
    logMessage(`Proses dimulai oleh ReyLan. Target eksekusi: ${count} kali.`, "info");

    for (let i = 1; i <= count; i++) {
        if (!isRunning) break;

        const payload = {
            content: contentOutside || undefined,
            embeds: [{
                title: title || undefined,
                description: description || undefined,
                color: numericColor,
                image: mainImageUrl ? { url: mainImageUrl } : undefined,
                thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
                footer: footerText ? { text: footerText } : undefined,
                timestamp: new Date().toISOString()
            }]
        };

        if (!contentOutside && !title && !description && !mainImageUrl && !thumbnailUrl && !footerText) {
            payload.content = "Pengiriman otomatis terpicu.";
            payload.embeds = undefined;
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 204 || response.ok) {
                logMessage(`[${i}/${count}] Paket data berhasil dikirim.`, "success");
            } else if (response.status === 429) {
                const rateLimitData = await response.json();
                const waitTime = rateLimitData.retry_after || 1000;
                logMessage(`[Pembatasan] Rate limit aktif. Menunggu ${waitTime}ms.`, "warn");
                await new Promise(res => setTimeout(res, waitTime));
                i--;
                continue;
            } else {
                logMessage(`[${i}/${count}] Gagal dikirim. Kode Status: ${response.status}`, "error");
            }
        } catch (err) {
            logMessage(`[${i}/${count}] Gangguan Koneksi: ${err.message}`, "error");
        }

        if (i < count) {
            await new Promise(res => setTimeout(res, delay));
        }
    }

    logMessage("Seluruh siklus pengiriman selesai.", "info");
    isRunning = false;
    button.disabled = false;
    button.innerText = "Mulai Pengiriman";
}
