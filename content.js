console.log("✅ RumbleRaidHelper Content Script Loaded");

function getStreamIdFromAlternateLink() {
    const altLink = document.querySelector('link[rel="alternate"][type="application/json+oembed"]');
    if (!altLink) {
        console.warn("❌ No alternate link found in page.");
        return null;
    }

    const url = new URL(altLink.href);
    const embedPath = url.searchParams.get("url"); // e.g., https://rumble.com/embed/v6upwpq/
    const match = embedPath.match(/\/v?([a-z0-9]{6,})\//i); // capture optional 'v' prefix
    const id = match ? match[1] : null;

    console.log("🔍 Extracted Stream ID from alternate link:", id);
    return id;
}

async function verifyOwnership(apiKey) {
    const streamId = getStreamIdFromAlternateLink();
    if (!streamId) {
        console.warn("🚫 Could not extract stream ID from page.");
        return false;
    }

    try {
        const res = await fetch(`https://rumble.com/-livestream-api/get-data?key=${apiKey}`);
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

function insertRaidButton() {
    const chatForm = document.querySelector(".chat-message-form-section");
    const headerActions = document.querySelector(".header-user-actions.space-x-4");
    if (!chatForm) {
        console.warn("⚠️ Chat form not found — not a live stream page?");
        return;
    }

    chrome.storage.local.get("rumbleApiKey", async (data) => {
        const apiKey = data.rumbleApiKey;
        const isOwner = await verifyOwnership(apiKey);

        const existing = document.getElementById("raid-button");
        if (existing) existing.remove();

        const btn = document.createElement("button");
        btn.id = "raid-button";
        btn.textContent = "🚀 RAID";
        btn.style = "margin: 10px; padding: 5px 10px; font-size: 14px; background: rgb(133, 199, 66); color: black; border: none; cursor: pointer; border-radius: 8px;";

        if (!isOwner) {
            btn.style.display = "none";
            console.warn("🚫 Not verified as stream owner — hiding RAID button.");
        } else {
            btn.addEventListener("click", () => {
                showRaidTargets();
            });
        }

        if (headerActions) headerActions.appendChild(btn);
        else chatForm.appendChild(btn);
        console.log("✅ RAID button inserted.");
    });
}

// Right-click raid via ALT + contextmenu
document.addEventListener('contextmenu', function (event) {
    if (!event.altKey || event.button !== 2) return;

    let target = event.target;
    let streamURL = null;
    let depth = 0;

    while (target && depth < 10) {
        if (target.tagName === 'A' && target.href && target.href.includes('rumble.com/') && target.href.includes('/v')) {
            streamURL = target.href;
            break;
        }
        if (target.dataset && target.dataset.href && target.dataset.href.includes('rumble.com/')) {
            streamURL = target.dataset.href;
            break;
        }
        target = target.parentElement;
        depth++;
    }

    if (streamURL) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const chatInput = document.getElementById('chat-message-text-input');
        if (chatInput) {
            chatInput.focus(); // Ensure focus is set

            // Set value and dispatch both 'input' and 'change' for robustness
            chatInput.value = `/raid ${streamURL}`;
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            chatInput.dispatchEvent(new Event('change', { bubbles: true })); // Added change event

            // Add a small delay to ensure focus and value updates are processed
            setTimeout(() => {
                // Dispatch keydown, keypress, and keyup for 'Enter'
                const enterKeyDown = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                const enterKeyPress = new KeyboardEvent('keypress', { // Added keypress event
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                const enterKeyUp = new KeyboardEvent('keyup', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });

                chatInput.dispatchEvent(enterKeyDown);
                chatInput.dispatchEvent(enterKeyPress); // Dispatch keypress
                chatInput.dispatchEvent(enterKeyUp);

                console.log("Right-click raid: '/raid' command entered and 'Enter' key simulated (keydown, keypress, keyup) after delay.");
            }, 10); // Increased delay slightly to 100ms for more robustness
        }
    }
});

// Run on load
setTimeout(() => {
    console.log("🚀 Calling insertRaidButton after patch...");
    insertRaidButton();
}, 100);


function showRaidTargets() {
    const existingPopup = document.getElementById('raid-popup');
    if (existingPopup) existingPopup.remove();

    const liveLinks = document.querySelectorAll('a.main-menu-item-channel.main-menu-item-channel-is-live');
    const popup = document.createElement('div');
    popup.id = 'raid-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#222';
    popup.style.color = 'white';
    popup.style.padding = '10px';
    popup.style.borderRadius = '8px';
    popup.style.zIndex = '9999';
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
    popup.style.maxHeight = '400px';
    popup.style.overflowY = 'auto';
    popup.style.display = 'flex'; // Use flexbox for layout
    popup.style.flexDirection = 'column'; // Arrange items in a column
    popup.style.gap = '8px'; // Space between items

    // Get the ID of the current stream
    const currentStreamId = getStreamIdFromAlternateLink();
    console.log("Current Stream ID for exclusion:", currentStreamId);


    liveLinks.forEach(link => {
        const href = link.getAttribute('href');
        const fullURL = `https://rumble.com${href}`;

        // Extract the stream ID from the link's href for comparison
        const linkUrl = new URL(fullURL);
        const linkPath = linkUrl.pathname;
        const linkMatch = linkPath.match(/\/v?([a-z0-9]{6,})/i);
        const linkStreamId = linkMatch ? linkMatch[1] : null;

        // Skip if this link is for the current stream
        if (currentStreamId && linkStreamId === currentStreamId) {
            console.log(`Skipping current stream: ${linkStreamId}`);
            return; // Skip to the next iteration
        }

        const label = link.querySelector('.main-menu-item-label.main-menu-item-channel-label')?.textContent.trim();

        // Find the avatar element within the link
        const avatarElement = link.querySelector('.main-menu-item-channel-label-wrapper .user-image.user-image--img');
        let avatarURL = '';

        if (avatarElement) {
            const computedStyle = window.getComputedStyle(avatarElement);
            const backgroundImage = computedStyle.backgroundImage;

            const urlMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
                avatarURL = urlMatch[1];
            } else {
                const imgInside = avatarElement.querySelector('img');
                if (imgInside) {
                    avatarURL = imgInside.src;
                }
            }
        }

        const btn = document.createElement('button');
        btn.style.display = 'flex'; // Use flexbox for button content
        btn.style.alignItems = 'center'; // Vertically align items
        btn.style.gap = '8px'; // Space between avatar and text
        btn.style.margin = '5px 0';
        btn.style.padding = '5px 10px';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.background = '#6e5ce0';
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';

        if (avatarURL) {
            const avatarImg = document.createElement('img');
            avatarImg.src = avatarURL;
            avatarImg.style.width = '24px'; // Set avatar size
            avatarImg.style.height = '24px';
            avatarImg.style.borderRadius = '50%'; // Make it round
            avatarImg.style.objectFit = 'cover'; // Ensure image covers the area
            btn.appendChild(avatarImg);
        }

        const labelSpan = document.createElement('span');
        labelSpan.textContent = `RAID: ${label}`;
        btn.appendChild(labelSpan);


        btn.addEventListener('click', () => {
            const chatInput = document.getElementById('chat-message-text-input');
            if (chatInput) {
                chatInput.focus(); // Ensure focus is set

                // Set value and dispatch both 'input' and 'change' for robustness
                chatInput.value = `/raid ${fullURL}`;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                chatInput.dispatchEvent(new Event('change', { bubbles: true })); // Added change event

                // Add a small delay to ensure focus and value updates are processed
                setTimeout(() => {
                    // Dispatch keydown, keypress, and keyup for 'Enter'
                    const enterKeyDown = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    const enterKeyPress = new KeyboardEvent('keypress', { // Added keypress event
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    const enterKeyUp = new KeyboardEvent('keyup', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });

                    chatInput.dispatchEvent(enterKeyDown);
                    chatInput.dispatchEvent(enterKeyPress); // Dispatch keypress
                    chatInput.dispatchEvent(enterKeyUp);

                    console.log("RAID target selected: '/raid' command entered and 'Enter' key simulated (keydown, keypress, keyup) after delay.");
                }, 100); // Increased delay slightly to 100ms
            }
            // Close the popup after clicking a raid target
            const existing = document.getElementById("raid-popup");
            if (existing) existing.remove();
        });

        popup.appendChild(btn);
    });

    document.body.appendChild(popup);
}