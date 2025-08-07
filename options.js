/*!
 * Rumble Raid Helper - options.js
 * Version: v3.3
 * Description: Handles user interaction with the extension options page, including setting and saving the Rumble API key.
 * Author: TheRealTombi
 * Website: https://rumble.com/TheRealTombi
 * License: MIT
 */


function verifyApiKey(key) {
    if (!key) {
        document.getElementById('main-info').style.display = 'none';
        return;
    }

    fetch(key)
        .then(res => {
            if (!res.ok) {
                throw new Error('API request failed');
            }
            return res.json();
        })
        .then(data => {
            console.log("API Verification Response:", data);
            document.getElementById('main-info').style.display = 'block';

            document.getElementById('user_id').textContent = data.user_id || 'N/A';
            document.getElementById('username').textContent = data.username || 'N/A';
            document.getElementById('followers_count').textContent = data.followers?.num_followers_total ?? 'N/A';
            
            chrome.storage.local.set({ rumbleUsername: data.username });

            const livestreamDiv = document.getElementById('livestream-details');
            livestreamDiv.innerHTML = ''; 
            if (data.livestreams && data.livestreams.length > 0) {
                const livestream = data.livestreams[0];
                const url = `https://rumble.com/v${livestream.id}`;
                
                livestreamDiv.innerHTML += `
                    <p><strong>Title:</strong> ${livestream.title}</p>
                    <p><strong>Status:</strong> ${livestream.is_live ? 'LIVE' : 'Offline'}</p>
                    <p><strong>Viewers:</strong> ${livestream.watching_now ?? 0}</p>
                    <p><strong>URL:</strong> <a href="${url}" target="_blank">${url}</a></p>
                `;
                
                chrome.storage.local.set({ livestreamUrl: url });
            } else {
                livestreamDiv.textContent = 'No active livestream found.';
            }

            const followersListDiv = document.getElementById('followers-list');
            followersListDiv.innerHTML = '<h3>Recent Followers</h3>';
            if (data.followers && data.followers.recent_followers && data.followers.recent_followers.length > 0) {
                data.followers.recent_followers.forEach(follower => {
                    const p = document.createElement('p');
                    p.textContent = `@${follower.username}`;
                    followersListDiv.appendChild(p);
                });
            } else {
                followersListDiv.innerHTML += '<p>No recent followers.</p>';
            }

            const subscribersListDiv = document.getElementById('subscribers-list');
            subscribersListDiv.innerHTML = '<h3>Recent Subscribers</h3>';
            if (data.subscribers && data.subscribers.recent_subscribers && data.subscribers.recent_subscribers.length > 0) {
                data.subscribers.recent_subscribers.forEach(sub => {
                    const p = document.createElement('p');
                    p.textContent = `@${sub.username} - $${sub.amount_dollars}`;
                    subscribersListDiv.appendChild(p);
                });
            } else {
                subscribersListDiv.innerHTML += '<p>No recent subscribers.</p>';
            }

            const giftedSubsListDiv = document.getElementById('gifted-subs-list');
            giftedSubsListDiv.innerHTML = '<h3>Recent Gifted Subs</h3>';
            if (data.gifted_subs && data.gifted_subs.recent_gifted_subs && data.gifted_subs.recent_gifted_subs.length > 0) {
                data.gifted_subs.recent_gifted_subs.forEach(gift => {
                    const p = document.createElement('p');
                    p.textContent = `${gift.purchased_by} gifted ${gift.total_gifts} subs (Remaining: ${gift.remaining_gifts})`;
                    giftedSubsListDiv.appendChild(p);
                });
            } else {
                giftedSubsListDiv.innerHTML += '<p>No recent gifted subs.</p>';
            }

            let totalRemainingSubs = 0;
            if (data.gifted_subs && data.gifted_subs.recent_gifted_subs) {
                totalRemainingSubs = data.gifted_subs.recent_gifted_subs.reduce((sum, gift) => {
                    return sum + (gift.remaining_gifts || 0);
                }, 0);
            }

            const listsContainer = document.getElementById('lists-container');
            let totalSubsDiv = document.getElementById('total-subs-display');

            if (!totalSubsDiv) {
                totalSubsDiv = document.createElement('div');
                totalSubsDiv.id = 'total-subs-display';
                listsContainer.insertBefore(totalSubsDiv, listsContainer.firstChild);
            }
            
            totalSubsDiv.innerHTML = `<h3>Total Remaining Gifted Subs</h3><p>${totalRemainingSubs}</p>`;

        })
        .catch(err => {
            console.error("❌ API Verification Failed:", err);
            document.getElementById('main-info').style.display = 'none';
            document.getElementById('status').textContent = 'Error: Invalid API Key or request failed.';
        });
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('rumbleApiKey', (data) => {
        if (data.rumbleApiKey) {
            document.getElementById('apiKey').value = data.rumbleApiKey;
            verifyApiKey(data.rumbleApiKey);
        }
    });

    document.getElementById('save').addEventListener('click', () => {
        const key = document.getElementById('apiKey').value.trim();
        chrome.storage.local.set({ rumbleApiKey: key }, () => {
            document.getElementById('status').textContent = '✅ API Key saved! Fetching data...';
            verifyApiKey(key);
            setTimeout(() => document.getElementById('status').textContent = '', 3000);
        });
    });

	const soundUploadInput = document.getElementById('sound-upload');
    const saveSoundButton = document.getElementById('save-sound');
    const resetSoundButton = document.getElementById('reset-sound');
    const soundStatus = document.getElementById('sound-status');

    // Logic to save the custom sound
    saveSoundButton.addEventListener('click', (event) => {
        event.preventDefault();
        const file = soundUploadInput.files[0];

        if (!file) {
            soundStatus.textContent = 'Please select a file first.';
            return;
        }

        // Check file size (e.g., limit to 2MB). Base64 encoding adds ~33% overhead.
        if (file.size > 2 * 1024 * 1024) {
            soundStatus.textContent = 'Error: File is too large (max 2MB).';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Sound = e.target.result;
            chrome.storage.local.set({ customAlertSound: base64Sound }, () => {
                soundStatus.textContent = '✅ Custom sound saved successfully!';
                soundUploadInput.value = ''; // Clear the input
                setTimeout(() => { soundStatus.textContent = ''; }, 4000);
            });
        };
        
        reader.onerror = () => {
             soundStatus.textContent = 'Error: Failed to read the file.';
        };
        
        reader.readAsDataURL(file);
    });

    // Logic to reset to the default sound
    resetSoundButton.addEventListener('click', (event) => {
        event.preventDefault();
        // Simply remove the custom sound from storage
        chrome.storage.local.remove('customAlertSound', () => {
            soundStatus.textContent = '✅ Sound has been reset to default.';
            setTimeout(() => { soundStatus.textContent = ''; }, 4000);
        });
    });
});