const express = require("express");
const WebSocket = require("ws");
const fs = require("fs");
const https = require("https");

const app = express();

// SSL sertifika ve anahtar dosyalarını oku
const options = {
    key: fs.readFileSync("localhost+3-key.pem"),
    cert: fs.readFileSync("localhost+3.pem")
};

// HTTPS sunucusu oluştur
const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

// Bağlı istemcileri sakla
const clients = new Set();

// WebSocket bağlantı yönetimi
wss.on("connection", (socket) => {
    console.log("Yeni istemci bağlandı");
    clients.add(socket);

    // İstemci mesajlarını işle
    socket.on("message", (message) => {
        try {
            // Gelen mesajı string'e çevir
            const messageString = message.toString();
            console.log("Alınan mesaj:", messageString);

            // Mesajı diğer tüm istemcilere ilet
            clients.forEach(client => {
                if (client !== socket && client.readyState === WebSocket.OPEN) {
                    client.send(messageString);
                }
            });
        } catch (error) {
            console.error("Mesaj işleme hatası:", error);
        }
    });

    // Bağlantı kapandığında
    socket.on("close", () => {
        console.log("İstemci bağlantısı kesildi");
        clients.delete(socket);
    });

    // Hata durumunda
    socket.on("error", (error) => {
        console.error("WebSocket hatası:", error);
        clients.delete(socket);
    });

    // İstemci sayısını gönder
    const clientCount = clients.size;
    console.log("Toplam bağlı istemci:", clientCount);
});

// HTTP sunucusu için statik dosyaları serve et
app.use(express.static("public"));

// Sunucuyu başlat
const PORT = process.env.PORT || 443;
server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
    console.log("WebSocket sunucusu hazır");
});