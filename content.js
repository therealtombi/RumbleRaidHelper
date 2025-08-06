/*!
 * Rumble Raid Helper - content.js
 * Version: v3.2
 * Description: Handles DOM manipulation, popup UI injection, and communication with background script for managing the raid confirmation process.
 * Author: TheRealTombi
 * Website: https://rumble.com/TheRealTombi
 * License: MIT
 */

let verificationInProgress = false;

console.log("✅ RumbleRaidHelper Content Script Loaded");

function getStreamIdFromAlternateLink() {
    const altLink = document.querySelector('link[rel="alternate"][type="application/json+oembed"]');
    if (!altLink) {
        console.warn("❌ No alternate link found in page.");
        return null;
    }
    const url = new URL(altLink.href);
    const embedPath = url.searchParams.get("url");
    const match = embedPath.match(/\/v?([a-z0-9]{6,})\//i);
    const id = match ? match[1] : null;
    console.log("🔍 Extracted Stream ID from alternate link:", id);
    return id;
}

async function verifyLiveStreamOwnership(apiKey) {
    const streamId = getStreamIdFromAlternateLink();
    if (!streamId) {
        console.warn("🚫 Could not extract stream ID from page.");
        return false;
    }
    try {
        const res = await fetch(apiKey);
        const data = await res.json();
        const ownedStreams = data.livestreams?.map(s => s.id) || [];
        console.log("📺 Livestreams from API:", ownedStreams);
        const isOwner = ownedStreams.includes(streamId);
        console.log(isOwner ? "✅ Verified as stream owner!" : "🚫 Not the owner.");
        return isOwner;
    } catch (err) {
        console.error("❌ API call failed:", err);
        return false;
    }
}

async function verifyStudioOwnership() {
    try {
        const nextDataScript = document.getElementById("__NEXT_DATA__");
        if (!nextDataScript) {
            console.warn("⚠️ '__NEXT_DATA__' script tag not found on Studio page.");
            return false;
        }
        const pageData = JSON.parse(nextDataScript.textContent);
        const studioUsername = pageData?.props?.pageProps?.session?.user?.username;
        if (!studioUsername) {
            console.warn("⚠️ Could not find username in '__NEXT_DATA__'.");
            return false;
        }
        const storedData = await chrome.storage.local.get("rumbleUsername");
        const storedUsername = storedData.rumbleUsername;
        if (studioUsername === storedUsername) {
            console.log("✅ Authenticated as stream owner via Studio data.");
            return true;
        } else {
            console.warn("🚫 Studio username does not match stored username.");
            return false;
        }
    } catch (e) {
        console.error("🚫 Error parsing '__NEXT_DATA__':", e);
        return false;
    }
}

function injectRaidStyles() {
    const styleId = 'rumble-raid-helper-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
							#raid-button {
								margin-left: 10px;
								padding: 5px 10px;
								font-size: 14px;
								background: rgb(16, 20, 23);
								color: white;
								border: none;
								cursor: pointer;
								border-radius: 9999px;
							}

							.raid-popup {
								position: fixed;
								top: 50%;
								left: 50%;
								transform: translate(-50%, -50%);
								width: 350px;
								max-height: 80vh;
								background: #222;
								color: white;
								border-radius: 10px;
								box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
								z-index: 99999;
								padding: 10px;
								display: flex;
								flex-direction: column;
								overflow: hidden;
								animation: fadeIn 0.3s ease-in-out;
								border: 2px solid red;
							}

							.raid-popup-header {
								display: flex;
								justify-content: space-between;
								align-items: center;
								border-bottom: 1px solid #333;
								padding-bottom: 10px;
								margin-bottom: 10px;
							}

							.raid-popup-header h3 {
								margin: 0;
								font-size: 1.2em;
							}

							#raid-popup-close {
								background: none;
								border: none;
								color: #ddd;
								font-size: 1.5em;
								cursor: pointer;
							}

							.raid-list {
								overflow-y: auto;
								flex-grow: 1;
								padding-right: 5px;
							}

							.raid-target-button {
								display: flex;
								align-items: center;
								width: 100%;
								background: #333;
								color: white;
								border: none;
								padding: 8px;
								margin-bottom: 5px;
								border-radius: 5px;
								cursor: pointer;
								transition: background-color 0.2s;
							}

							.raid-target-button:hover {
								background-color: #444;
							}

							.raid-target-avatar {
								width: 30px;
								height: 30px;
								border-radius: 50%;
								margin-right: 10px;
							}

							.studio-button {
								width: 100%;
								padding: 10px;
								margin-top: 10px;
								background-color: #f7a01a;
								color: white;
								font-weight: bold;
								border-radius: 9999px;
								border: none;
								cursor: pointer;
								transition: background-color 0.2s;
							}

							.studio-button:hover {
								background-color: #e08e17;
							}

							@keyframes fadeIn {
								from {
									opacity: 0;
									transform: translate(-50%, -60%);
								}

								to {
									opacity: 1;
									transform: translate(-50%, -50%);
								}
							}

							.chat-pinned-ui__raid-confirm-button-container {
								display: flex;
								justify-content: flex-end;
								gap: 10px;
								margin-top: 15px;
							}

							.btn {
								all: unset;
								padding: 8px 16px;
								font-size: 13px;
								font-weight: bold;
								border-radius: 6px;
								cursor: pointer;
								text-align: center;
								line-height: 1.5;
							}

							.btn-xs {
								font-size: 12px;
								padding: 6px 12px;
							}

							.btn-green {
								background-color: var(--brand-500, #85c742);
								color: var(--white, #fff);
							}

							.btn-grey {
								background-color: #444;
								color: white;
							}

							.btn-green:hover {
								background-color: #a4e662;
							}

							.btn-grey:hover {
								background-color: #555;
							}

							.chat-pinned-ui__raid-confirm-header {
								font-size: 14px;
								font-weight: bold;
								margin-bottom: 10px;
							}

							.chat-pinned-ui__raid-content-message {
								font-size: 13px;
								margin-top: 5px;
							}

							.chat-pinned-ui__raid-confirm-link {
								color: var(--brand-500, #85c742);
								text-decoration: none;
							}

							.chat-pinned-ui__raid-confirm-link:hover {
								text-decoration: underline;
							}

							#raid-confirm-popup-wrapper {
								position: fixed;
								top: 0;
								left: 0;
								right: 0;
								bottom: 0;
								display: flex;
								align-items: center;
								justify-content: center;
								background-color: rgba(0, 0, 0, 0.7);
								z-index: 999999;
							}

							#raid-confirm-popup {
								background: #222;
								color: white;
								padding: 20px;
								border-radius: 10px;
								box-shadow: 0 4px 10px rgba(0,0,0,0.5);
								border: 1px solid #444;
							}

							
							.rr-incoming-raid-popup {
								position: relative; /* Changed from fixed */
								display: flex;
								align-items: center;
								padding: 10px 15px;
								margin: 4px 0; /* To match chat message spacing */
								border-radius: 8px;
								background-color: #2C3640;
								background-image: url('https://rumble.com/i/bg-raid-message-space.png');
								background-size: cover;
								background-position: center;
								color: var(--white);
								border: 1px solid #495a6a;
								box-shadow: 0 2px 5px rgba(0,0,0,0.3);
							}

							.rr-raid-avatar {
								width: 48px;
								height: 48px;
								border-radius: 50%;
								margin-right: 15px;
								flex-shrink: 0;
								
								/* Styles for the fallback avatar */
								display: flex;
								align-items: center;
								justify-content: center;
								font-size: 24px;
								font-weight: bold;
								color: white;
							}

							.rr-raid-content {
								font-size: 15px;
								line-height: 1.4;
								color: white;
							}

							.rr-raid-content a:hover {
								text-decoration: underline;
							}

							.rr-incoming-raid-close {
								position: absolute;
								top: 5px;
								right: 8px;
								background: none;
								border: none;
								color: rgba(255, 255, 255, 0.7);
								font-size: 1.8em;
								cursor: pointer;
								line-height: 1;
							}
							.rr-incoming-raid-close:hover {
								color: white;
							}

							@keyframes slideInFromRight {
								from {
									transform: translateX(110%);
									opacity: 0;
								}
								to {
									transform: translateX(0);
									opacity: 1;
								}
							}
    `;
    document.head.appendChild(style);
    console.log("✅ Custom styles injected.");
}

function createStyledRaidMessage(username, userProfileUrl) {
    const firstLetter = username.charAt(0).toUpperCase();
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    const avatarColor = `hsl(${hue}, 70%, 40%)`;

    const styledMessage = document.createElement('div');
    styledMessage.className = 'rr-incoming-raid-popup';
    styledMessage.innerHTML = `
        <div class="rr-raid-avatar" style="background-color: ${avatarColor};">
            ${firstLetter}
        </div>
        <div class="rr-raid-content">
            <a href="${userProfileUrl}" target="_blank" rel="noopener noreferrer">
                <strong>${username}</strong>
            </a>
            <span>has raided this stream.</span>
        </div>
    `;
    return styledMessage;
}

function showRaidTargets(liveStreamers) {
    const existingPopup = document.getElementById('raid-popup');
    if (existingPopup) existingPopup.remove();
    const popup = document.createElement('div');
    popup.id = 'raid-popup';
    popup.classList.add('raid-popup');
    const popupHeader = document.createElement('div');
    popupHeader.classList.add('raid-popup-header');
    const popupTitle = document.createElement('h3');
    popupTitle.textContent = 'Select Raid Target';
    const closeButton = document.createElement('button');
    closeButton.id = 'raid-popup-close';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', () => popup.remove());
    popupHeader.appendChild(popupTitle);
    popupHeader.appendChild(closeButton);
    popup.appendChild(popupHeader);
    const raidList = document.createElement('div');
    raidList.classList.add('raid-list');
    const currentStreamId = getStreamIdFromAlternateLink();
    console.log("Current Stream ID for exclusion:", currentStreamId);
    if (liveStreamers.length === 0) {
        const noStreams = document.createElement('p');
        noStreams.textContent = "No other live streamers found on the page.";
        noStreams.style.cssText = "color: yellow; text-align: center; margin: 20px; font-weight: bold;";
        raidList.appendChild(noStreams);
    } else {
        liveStreamers.forEach(streamer => {
            if (currentStreamId && streamer.id === currentStreamId) {
                console.log(`Skipping current stream: ${streamer.id}`);
                return;
            }
            const btn = document.createElement('button');
            btn.classList.add('raid-target-button');
            const avatarImg = document.createElement('img');
            avatarImg.src = streamer.thumbnail_url || 'https://rumble.com/favicon.ico';
            avatarImg.alt = `${streamer.username} avatar`;
            avatarImg.classList.add('raid-target-avatar');
            btn.appendChild(avatarImg);
            const labelSpan = document.createElement('span');
            labelSpan.textContent = `${streamer.username}`;
            btn.appendChild(labelSpan);
            btn.addEventListener('click', () => {
                const raidTargetUrl = `https://rumble.com${streamer.url}`;
                
                chrome.runtime.sendMessage({
                    type: 'sendRaidCommandToHiddenTab',
                    raidTargetUrl: raidTargetUrl
                }, (response) => {
                    if (response?.status === 'ok') {
                        console.log("Raid request sent to background script.");
                    } else {
                        console.error("❌ Failed to send raid request to background script.");
                    }
                });
                popup.remove();
            });
            raidList.appendChild(btn);
        });
    }
    popup.appendChild(raidList);

    chrome.storage.local.get("rumbleUsername", (data) => {
        const username = data.rumbleUsername;
        if (username) {
            const studioButton = document.createElement('button');
            studioButton.classList.add('studio-button');
            studioButton.textContent = 'Go to Rumble Studio';
            studioButton.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'openRumbleStudio',
                    username: username
                }, () => popup.remove());
            });
            popup.appendChild(studioButton);
        } else {
            console.warn("Rumble username not found in storage. Studio button not added.");
        }
        document.body.appendChild(popup);
    });
}

function showRaidConfirmationPopup(htmlContent) {
    const existingPopup = document.getElementById('raid-confirm-popup');
    if (existingPopup) existingPopup.remove();

    const popupContainer = document.createElement('div');
    popupContainer.id = 'raid-confirm-popup-wrapper';


    const popupContent = document.createElement('div');
    popupContent.id = 'raid-confirm-popup';
    popupContent.innerHTML = htmlContent;
    popupContainer.appendChild(popupContent);
    document.body.appendChild(popupContainer);
    console.log("✅ Raid confirmation popup displayed on the original tab.");

    const confirmButton = popupContainer.querySelector('button.btn.btn-xs.btn-green');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            console.log("User clicked 'Confirm'. Sending command to background script to finalize the raid.");
            popupContainer.remove();
            
            chrome.runtime.sendMessage({
                type: 'confirmRaidInHiddenTab'
            }, (response) => {
                if (response?.status === 'ok') {
                    console.log("✅ Confirmation command sent to background script.");
                } else {
                    console.error("❌ Failed to send confirmation command.");
                }
            });
        });
    }

    const cancelButton = popupContainer.querySelector('button.btn.btn-xs.btn-grey');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            console.log("User clicked 'Cancel'. Closing popup.");
            popupContainer.remove();
            
            chrome.runtime.sendMessage({
                type: 'raidConfirmedAndComplete'
            }, (response) => {
                if (response?.status === 'ok') {
                    console.log("✅ Cleanup command sent to background script.");
                } else {
                    console.error("❌ Failed to send cleanup command.");
                }
            });
        });
    }
}

async function insertRaidButton() {

    if (verificationInProgress) {
        return;
    }

    verificationInProgress = true;
    
    injectRaidStyles();
    const bodyTag = document.querySelector('body');
    const isStudioPage = bodyTag && bodyTag.classList.contains('studio-body-tag');
    let isOwner = false;
    let targetDiv = null;

    const data = await chrome.storage.local.get(["rumbleApiKey", "rumbleUsername"]);
    const apiKey = data.rumbleApiKey;
    const storedUsername = data.rumbleUsername;

    if (isStudioPage) {
        console.log("Studio page detected. Verifying ownership...");
        targetDiv = document.querySelector(".flex.items-center.space-x-2.flex-wrap.justify-end") || document.querySelector(".shrink-0.flex.items-center.space-x-2");
        if (!targetDiv) {
            console.warn("⚠️ Studio: Target div for raid button not found.");
            return;
        }
        if (!storedUsername) {
            console.warn("🚫 Stored username not found. Cannot verify studio ownership.");
            return;
        }
        isOwner = await verifyStudioOwnership();
    } else {
        console.log("Live stream page detected. Verifying ownership...");
        targetDiv = document.querySelector(".header-user-actions.space-x-4") || document.querySelector(".chat-message-form-section");
        if (!targetDiv) {
            console.warn("⚠️ Live Stream: Target div for raid button not found.");
            return;
        }
        if (!apiKey) {
            console.warn("🚫 API key not set in extension storage. Cannot authenticate live stream ownership.");
            return;
        }
        isOwner = await verifyLiveStreamOwnership(apiKey);
    }

    if (!isOwner) {
        console.log("🚫 Not verified as stream owner. No further checks will be performed on this page.");
        return;
    }

    console.log("✅ Ownership verified.");

    const existing = document.getElementById("raid-button");
    if (existing) {
        return;
    }

    const btn = document.createElement("button");
    btn.id = "raid-button";
    btn.classList.add("flex", "items-center", "space-x-2", "px-4", "h-12", "bg-navy", "rounded-full", "min-w-fit", "cursor-pointer");

    const label = document.createElement('span');
    label.textContent = "🚀 Rumble Raid";
    btn.appendChild(label);

    btn.addEventListener("click", () => {
        console.log("Starting unified raid process via background script.");
        chrome.runtime.sendMessage({
            type: 'startUnifiedRaidProcess'
        }, (response) => {
            if (response?.status === 'ok') {
                console.log("Unified raid request sent to background script.");
            } else {
                console.error("❌ Failed to send unified raid request to background script:", response?.message);
            }
        });
    });
    targetDiv.appendChild(btn);
    console.log("✅ RAID button inserted successfully.");
}

insertRaidButton();

const observer = new MutationObserver(async (mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.addedNodes.length) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const raidElement = node.querySelector('div[data-sentry-component="CIChatRowContent"]');
                if (raidElement && raidElement.textContent.includes("has raided this stream!")) {
                    const linkElement = raidElement.querySelector('a.hover\\:underline');
                    if (linkElement) {
                        const username = linkElement.textContent.trim();
                        const userProfileUrl = linkElement.href;
                        console.log(`✅ Incoming Raid Detected from: ${username}. Replacing chat message.`);

                        const newStyledMessage = createStyledRaidMessage(username, userProfileUrl);
                        node.parentNode.replaceChild(newStyledMessage, node);

                        try {
                            
                            if (chrome.runtime?.id) {
                                const result = await chrome.storage.local.get(['customAlertSound']);
                                const soundSrc = result.customAlertSound || chrome.runtime.getURL('sounds/raid_alert.mp3');
                                chrome.runtime.sendMessage({ type: 'playAlertSound', soundSrc: soundSrc });
                            }
                        } catch (error) {

                            if (error.message.includes('Extension context invalidated')) {
                                console.warn('Rumble Raid Helper: Could not play sound because the extension was reloaded. Please refresh the page.');
                            } else {
                                console.error('Rumble Raid Helper: An unexpected error occurred while trying to play sound.', error);
                            }
                        }
                    }
                }
            }
        }

        const targetDiv = document.querySelector(".flex.items-center.space-x-2.flex-wrap.justify-end") ||
            document.querySelector(".header-user-actions.space-x-4") ||
            document.querySelector(".chat-message-form-section") ||
            document.querySelector(".shrink-0.flex.items-center.space-x-2");

        if (targetDiv && !document.getElementById("raid-button")) {
            insertRaidButton();
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'showRaidConfirmation') {
        showRaidConfirmationPopup(message.html);
        sendResponse({ status: 'ok' });
        return true;
    }
    if (message.type === 'showRaidTargetsPopup') {
        console.log("Received live streamers from background script. Displaying popup.");
        showRaidTargets(message.liveStreamers);
        sendResponse({ status: 'ok' });
        return true;
    }
});