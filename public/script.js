const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");
const statusDiv = document.getElementById("status");

let localStream;
let peerConnection;
let socket;

const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" }
    ]
};

function updateStatus(message) {
    statusDiv.textContent = message;
    console.log("Durum:", message);
}

async function initWebRTC() {
    try {
        // Mevcut bağlantıları temizle
        if (peerConnection) {
            peerConnection.close();
        }
        if (socket) {
            socket.close();
        }

        // Medya akışını al
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        localVideo.srcObject = localStream;
        
        // WebRTC bağlantısını oluştur
        peerConnection = new RTCPeerConnection(configuration);
        
        // WebSocket bağlantısını kur
        socket = new WebSocket("wss://localhost:443");
        
        setupWebSocketHandlers();
        setupPeerConnectionHandlers();
        
        // Medya akışını peer bağlantısına ekle
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        startCallButton.disabled = false;
        endCallButton.disabled = true;
        updateStatus("Medya bağlantısı hazır. Arama başlatabilirsiniz.");
    } catch (error) {
        console.error("Medya cihazlarına erişim hatası:", error);
        updateStatus("Hata: Kamera veya mikrofona erişilemedi!");
    }
}

function setupWebSocketHandlers() {
    socket.onopen = () => {
        updateStatus("Sinyal sunucusuna bağlandı.");
    };

    // socket.onclose = () => {
    //     updateStatus("Sinyal sunucusu bağlantısı kesildi. Yeniden bağlanılıyor...");
    //     // 2 saniye sonra yeniden bağlanmayı dene
    //     setTimeout(initWebRTC, 2000);
    // };

    socket.onerror = (error) => {
        console.error("WebSocket hatası:", error);
        updateStatus("Sinyal sunucusu bağlantı hatası!");
    };

    socket.onmessage = async (message) => {
        try {
            const data = JSON.parse(message.data);
            console.log("Alınan sinyal mesajı:", data.type);
            await handleSignalingMessage(data);
        } catch (error) {
            console.error("Mesaj işleme hatası:", error);
        }
    };
}

function setupPeerConnectionHandlers() {
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const message = {
                type: "candidate",
                candidate: event.candidate
            };
            console.log("ICE candidate gönderiliyor");
            socket.send(JSON.stringify(message));
        }
    };

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            updateStatus("Uzak video bağlandı.");
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        updateStatus(`ICE Bağlantı durumu: ${state}`);
        
        if (state === "connected" || state === "completed") {
            startCallButton.disabled = true;
            endCallButton.disabled = false;
        }
    };

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log("Peer bağlantı durumu:", state);
        
        if (state === "failed" || state === "disconnected" || state === "closed") {
            endCall();
        }
    };
}

async function handleSignalingMessage(data) {
    try {
        if (data.type === "offer") {
            if (peerConnection.signalingState !== "stable") {
                console.log("Sinyal durumu stable değil, teklif reddedildi");
                return;
            }
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            const message = {
                type: "answer",
                answer: answer
            };
            socket.send(JSON.stringify(message));
            updateStatus("Gelen arama yanıtlandı.");
            
            startCallButton.disabled = true;
            endCallButton.disabled = false;
        } else if (data.type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            updateStatus("Arama bağlantısı kuruldu.");
        } else if (data.type === "candidate") {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                if (!peerConnection.remoteDescription) {
                    console.log("Remote description henüz ayarlanmadı, ICE candidate bekletiliyor");
                }
            }
        }
    } catch (error) {
        console.error("Sinyal mesajı işleme hatası:", error);
        updateStatus("Bağlantı kurulurken bir hata oluştu!");
    }
}

async function startCall() {
    try {
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        
        const message = {
            type: "offer",
            offer: offer
        };
        socket.send(JSON.stringify(message));
        
        updateStatus("Arama başlatılıyor...");
        startCallButton.disabled = true;
    } catch (error) {
        console.error("Arama başlatma hatası:", error);
        updateStatus("Arama başlatılırken bir hata oluştu!");
    }
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    startCallButton.disabled = false;
    endCallButton.disabled = true;
    
    updateStatus("Arama sonlandırıldı.");
    initWebRTC(); // Yeni bir bağlantı için hazırlan
}

// Event Listeners
startCallButton.addEventListener("click", startCall);
endCallButton.addEventListener("click", endCall);
startCallButton.disabled = true;
endCallButton.disabled = true;

// Başlangıç
initWebRTC();