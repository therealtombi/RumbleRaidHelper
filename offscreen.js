/*!
 * Rumble Raid Helper - offscreen.js
 * Version: v3.2
 * Description: Audio player for Raid Alerts in Streams.
 * Author: TheRealTombi
 * Website: https://rumble.com/TheRealTombi
 * License: MIT
 */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target === 'offscreen' && msg.type === 'play-sound') {
    const audio = new Audio(msg.src);
    audio.play();
  }
});