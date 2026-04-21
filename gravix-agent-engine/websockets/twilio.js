const { sendTwilioAudioToGemini } = require('./gemini');

// Placeholder for the collection containing user profiles and voiceprints
const COLLECTION_PLACEHOLDER = 'users';

// Placeholder speaker diarization validation
function performDiarization(incomingAudioBuffer, knownVoiceprint) {
    // In a real implementation, this would compare the audio signatures
    // For now, we simulate a validation check.
    if (!incomingAudioBuffer || !knownVoiceprint) return false;
    return true;
}

function handleTwilioStream(ws, geminiWs, userId) {
    let isAuthenticated = false;
    let isAuthenticating = false;

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);

            // Assume Twilio sends audio in base64 format inside a 'media' object
            if (message.event === 'media' && message.media && message.media.payload) {
                const audioBuffer = Buffer.from(message.media.payload, 'base64');

                if (!isAuthenticated) {
                    if (isAuthenticating) return; // Drop or wait while authenticating

                    isAuthenticating = true;
                    try {
                        const { adminDb } = await import('../../src/lib/firebaseAdmin.js');
                        const userDoc = await adminDb.collection(COLLECTION_PLACEHOLDER).doc(userId).get();

                        if (!userDoc.exists) {
                            console.error(`User ${userId} not found.`);
                            ws.close(1008, "Unauthorized: User not found");
                            return;
                        }

                        const knownVoiceprint = userDoc.data().voiceprint;
                        const isValid = performDiarization(audioBuffer, knownVoiceprint);

                        if (!isValid) {
                            console.error(`Voiceprint validation failed for user ${userId}.`);
                            ws.close(1008, "Unauthorized: Voice biometric validation failed");
                            return;
                        }

                        isAuthenticated = true;
                        console.log(`User ${userId} voiceprint authenticated.`);
                    } catch (error) {
                        console.error('Error during biometric validation:', error);
                        ws.close(1011, "Internal Server Error during validation");
                        return;
                    } finally {
                        isAuthenticating = false;
                    }
                }

                // If authenticated (or was previously authenticated), forward to Gemini
                if (isAuthenticated) {
                    sendTwilioAudioToGemini(geminiWs, audioBuffer);
                }
            }
        } catch (error) {
            console.error('Error processing Twilio message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Twilio stream closed for user ${userId}`);
    });
}

module.exports = {
    handleTwilioStream,
    performDiarization
};
