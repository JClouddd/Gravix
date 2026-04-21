const WebSocket = require('ws');

function initializeGeminiSocket(url, apiKey, onMessage) {
    const ws = new WebSocket(`${url}?key=${apiKey}`);

    ws.on('open', () => {
        console.log('Connected to Gemini Live API');
    });

    ws.on('message', (data) => {
        if (onMessage) onMessage(data);
    });

    ws.on('error', (err) => {
        console.error('Gemini WS Error:', err);
    });

    ws.on('close', () => {
        console.log('Gemini WS Closed');
    });

    return ws;
}

function sendTwilioAudioToGemini(geminiWs, twilioAudioBuffer) {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(JSON.stringify({
            realtimeInput: {
                mediaChunks: [{
                    mimeType: "audio/pcm;rate=16000",
                    data: twilioAudioBuffer.toString('base64')
                }]
            }
        }));
    }
}

module.exports = {
    initializeGeminiSocket,
    sendTwilioAudioToGemini
};
