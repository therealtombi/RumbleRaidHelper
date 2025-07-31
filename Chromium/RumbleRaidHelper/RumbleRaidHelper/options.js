function verifyApiKey(key) {
  if (!key) return;

  fetch(`https://rumble.com/-livestream-api/get-data?key=${key}`)
    .then(res => res.json())
    .then(data => {
      console.log("✅ API Verification Response:", data);
      document.getElementById('user_id').textContent = data.user_id || 'N/A';
      document.getElementById('username').textContent = data.username || 'N/A';
      document.getElementById('followers').textContent = data.followers?.num_followers ?? 'N/A';
    })
    .catch(err => {
      console.error("❌ API Verification Failed:", err);
      document.getElementById('user_id').textContent = 'Error';
      document.getElementById('username').textContent = 'Error';
      document.getElementById('followers').textContent = 'Error';
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
      document.getElementById('status').textContent = '✅ API Key saved!';
      verifyApiKey(key);
      setTimeout(() => document.getElementById('status').textContent = '', 3000);
    });
  });
});