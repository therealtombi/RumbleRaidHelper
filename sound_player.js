/*!
 * Rumble Raid Helper - offscreen.js
 * Version: v3.3
 * Description: Audio player for Raid Alerts in Streams.
 * Author: TheRealTombi
 * Website: https://rumble.com/TheRealTombi
 * License: MIT
 */
const params = new URLSearchParams(window.location.search);
const soundSrc = params.get('src');

if (soundSrc) {
    const audio = new Audio(decodeURIComponent(soundSrc));
    audio.onended = () => window.close();
    audio.play().catch(e => {
        console.error("Audio playback failed:", e);
        window.close();
    });
} else {
    window.close();
}