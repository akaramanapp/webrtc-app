# WebRTC Video Chat Application

Bu proje, WebRTC teknolojisini kullanarak gerçek zamanlı video sohbet imkanı sunan bir web uygulamasıdır.

## Özellikler

- Peer-to-peer video görüşme
- HTTPS desteği
- WebSocket ile sinyal sunucusu
- Responsive tasarım

## Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/akaramanapp/webrtc-app.git
cd webrtc-app
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. SSL sertifikalarını oluşturun:
```bash
mkcert localhost 127.0.0.1 ::1
```

4. Sunucuyu başlatın:
```bash
node server.js
```

5. Tarayıcınızda https://localhost:3000 adresine gidin

## Geliştirme

- Node.js
- Express.js
- WebRTC
- WebSocket (ws)

## Lisans

MIT