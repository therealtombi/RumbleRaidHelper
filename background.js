/*!
 * Rumble Raid Helper - background.js
 * Version: v3.2
 * Description: Manages the lifecycle of hidden tabs, message handling, and script injection for scraping and sending raid commands.
 * Author: TheRealTombi
 * Website: https://rumble.com/TheRealTombi
 * License: MIT
 */

console.log("✅ RumbleRaidHelper Background Service Worker Loaded");

let pendingScrapes = {};
let pendingRaidCommands = {};

function injectedRaidScript(targetUrl) {
    function waitForElement(selector, maxRetries = 20, delay = 100) {
        return new Promise((resolve, reject) => {
            let retries = 0;
            const check = () => {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`✅ Found element with selector: '${selector}'`);
                    resolve(element);
                } else if (retries < maxRetries) {
                    retries++;
                    console.log(`Element not found, retrying (${retries}/${maxRetries})...`);
                    setTimeout(check, delay);
                } else {
                    console.error(`❌ Timeout: Could not find element with selector: '${selector}' after ${maxRetries} retries.`);
                    reject(`Timeout: Could not find element with selector: '${selector}'`);
                }
            };
            check();
        });
    }

    waitForElement('#chat-message-text-input')
        .then(chatInput => {
            console.log("✅ Chat input found. Sending /raid command.");

            const chatForm = chatInput.closest('form');
            if (!chatForm) {
                console.error("❌ Could not find chat form.");
                throw new Error("Could not find chat form.");
            }
            console.log("✅ Chat form found.");

            chatInput.focus();
            chatInput.value = `/raid ${targetUrl}`;
            chatInput.dispatchEvent(new Event('input', {
                bubbles: true
            }));

            const submitEvent = new Event('submit', {
                bubbles: true,
                cancelable: true
            });
            chatForm.dispatchEvent(submitEvent);

            console.log("Submit event dispatched on the form. Waiting for confirmation popup...");

            return waitForElement('.chat-pinned-ui__raid-container', 50, 100);
        })
        .then(popupContainer => {
            console.log("✅ Found raid confirmation container. Capturing HTML.");
            const popupHtml = popupContainer.innerHTML;

            chrome.runtime.sendMessage({
                type: 'raidPopupContent',
                html: popupHtml
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Failed to send popup HTML to background script:", chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Popup HTML sent to background script.");
                }
            });
        })
        .catch(error => {
            console.error("❌ Raid process failed:", error);
            chrome.runtime.sendMessage({
                type: 'raidProcessFailed'
            });
        });
}

function injectedConfirmScript() {
    function clickElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`✅ Found and clicking element with selector: '${selector}'`);
            element.click();
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                button: 0
            });
            element.dispatchEvent(clickEvent);
            console.log("✅ Click event dispatched.");
        } else {
            console.error(`❌ Could not find element with selector: '${selector}'`);
        }
    }

    clickElement('button.btn.btn-xs.btn-green');

    setTimeout(() => {
        chrome.runtime.sendMessage({
            type: 'hiddenTabRaidConfirmed'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Failed to send final confirmation message:", chrome.runtime.lastError.message);
            } else {
                console.log("✅ Final confirmation message sent to background script.");
            }
        });
    }, 1000);
}

function injectedScrapeScript() {
    console.log("Starting injectedScrapeScript...");

    function waitForElement(selector, maxRetries = 50, delay = 100) {
        return new Promise((resolve, reject) => {
            let retries = 0;
            const check = () => {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length > 0) {
                    console.log(`✅ Found at least one element with selector: '${selector}'`);
                    resolve(elements);
                } else if (retries < maxRetries) {
                    retries++;
                    console.log(`Element not found, retrying (${retries}/${maxRetries})...`);
                    setTimeout(check, delay);
                } else {
                    console.error(`❌ Timeout: Could not find any elements with selector: '${selector}' after ${maxRetries} retries.`);
                    reject(`Timeout: Could not find any elements with selector: '${selector}'`);
                }
            };
            check();
        });
    }

    const scrapeLiveStreamers = (elements) => {
        const liveStreamers = [];
        const currentPage = window.location.href;

        if (currentPage.includes("followed-channels")) {
            console.log("Using selectors for 'followed-channels' page.");
            elements.forEach(element => {
                const liveChannelContainer = element.closest('li.followed-channel');
                if (liveChannelContainer.querySelector('.live__tag')) {
                    const linkElement = liveChannelContainer.querySelector('a.hover\\:no-underline');
                    const imgElement = liveChannelContainer.querySelector('img.channel__image');
                    const nameSpan = liveChannelContainer.querySelector('span.line-clamp-2');

                    if (linkElement && imgElement && nameSpan) {
                        const title = nameSpan.textContent.trim();
                        const href = linkElement.getAttribute('href');
                        const hrefMatch = href ? href.match(/\/v([a-z0-9]{6,})[\-|\.]/) : null;
                        const id = hrefMatch ? hrefMatch[1] : null;
                        const thumbnailUrl = imgElement.getAttribute('src');

                        if (title && id) {
                            liveStreamers.push({
                                username: title,
                                id: id,
                                url: href,
                                thumbnail_url: thumbnailUrl
                            });
                            console.log(`✅ Scraped streamer: ${title}, ID: ${id}`);
                        }
                    }
                }
            });
        } else {
            console.log("Using selectors for live video page.");
            elements.forEach(element => {
                const title = element.getAttribute('title');
                const href = element.getAttribute('href');
                const hrefMatch = href ? href.match(/\/v([a-z0-9]{6,})[\-|\.]/) : null;
                const id = hrefMatch ? hrefMatch[1] : null;
                const userImageElement = element.querySelector('.user-image');
                let thumbnailUrl = null;
                if (userImageElement) {
                    const style = window.getComputedStyle(userImageElement);
                    const backgroundImage = style.getPropertyValue('background-image');
                    const urlMatch = backgroundImage ? backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/) : null;
                    if (urlMatch && urlMatch[1]) {
                        thumbnailUrl = urlMatch[1];
                    }
                }
                if (title && id) {
                    liveStreamers.push({
                        username: title,
                        id: id,
                        url: href,
                        thumbnail_url: thumbnailUrl
                    });
                }
            });
        }
        return liveStreamers;
    };

    const scrapeSelector = 'li.followed-channel';

    waitForElement(scrapeSelector, 50, 100)
        .then(elements => {
            console.log("Elements found, now scraping...");
            const scrapedStreamers = scrapeLiveStreamers(elements);
            console.log("✅ Scraped live streamers from hidden tab:", scrapedStreamers);
            chrome.runtime.sendMessage({
                type: 'liveStreamersFromScrape',
                liveStreamers: scrapedStreamers
            });
        })
        .catch(error => {
            console.error("❌ Scraping failed:", error);
            chrome.runtime.sendMessage({
                type: 'liveStreamersFromScrape',
                liveStreamers: []
            });
        });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === 'startUnifiedRaidProcess') {
        const scrapeId = Date.now().toString();

        chrome.storage.local.get(['rumbleApiKey']).then(result => {
            const apiKey = result.rumbleApiKey;

            if (!apiKey) {
                console.error("❌ API Key not found in local storage. Cannot perform raid.");
                sendResponse({
                    status: 'error',
                    message: 'API Key not found. Please set it in the options page.'
                });
                return;
            }

            console.log("Starting unified raid process. Opening hidden tab to scrape live streamers...");

            chrome.tabs.create({
                url: "https://rumble.com/followed-channels",
				active: false
            }, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Failed to create scrape tab:", chrome.runtime.lastError);
                    delete pendingScrapes[scrapeId];
                    return;
                }
                pendingScrapes[scrapeId] = {
                    tabId: tab.id,
                    originalTabId: sender.tab.id,
                    scriptInjected: false
                };
                console.log(`Raid scrape process started. Scrape tab created with ID: ${tab.id}. Original tab ID: ${sender.tab.id}`);
            });

            sendResponse({
                status: 'ok'
            });
        }).catch(error => {
            console.error('❌ Error retrieving API key from storage:', error);
            sendResponse({
                status: 'error',
                message: 'Failed to retrieve API key from storage.'
            });
        });

        return true;
    }

    if (message.type === 'raidPopupContent') {
        const raidCommandId = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].tabId === sender.tab.id);
        if (raidCommandId) {
            const originalTabId = pendingRaidCommands[raidCommandId].originalTabId;
            console.log(`Received raid popup HTML from hidden command tab. Forwarding to original tab ID: ${originalTabId}`);

            chrome.tabs.sendMessage(originalTabId, {
                type: 'showRaidConfirmation',
                html: message.html
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Failed to forward popup HTML:", chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Raid popup HTML forwarded successfully.");
                }
            });
        }
        return true;
    }

    if (message.type === 'confirmRaidInHiddenTab') {
        const raidCommandId = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].originalTabId === sender.tab.id);
        if (raidCommandId) {
            const hiddenTabId = pendingRaidCommands[raidCommandId].tabId;
            console.log(`User confirmed raid. Injecting script into hidden command tab ID: ${hiddenTabId} to click the confirm button.`);

            chrome.scripting.executeScript({
                target: {
                    tabId: hiddenTabId
                },
                func: injectedConfirmScript
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Confirmation script injection failed:", chrome.runtime.lastError.message);
                    chrome.tabs.remove(hiddenTabId);
                    delete pendingRaidCommands[raidCommandId];
                }
            });
        }
        sendResponse({
            status: 'ok'
        });
        return true;
    }

    if (message.type === 'hiddenTabRaidConfirmed') {
        const raidCommandId = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].tabId === sender.tab.id);
        if (raidCommandId) {
            console.log(`✅ Hidden tab confirmed click. Closing hidden tab ID: ${sender.tab.id}`);
            chrome.tabs.remove(sender.tab.id);
            delete pendingRaidCommands[raidCommandId];
        }
        return true;
    }

    if (message.type === 'liveStreamersFromScrape') {
        const scrapeId = Object.keys(pendingScrapes).find(id => pendingScrapes[id].tabId === sender.tab.id);
        if (scrapeId) {
            const originalTabId = pendingScrapes[scrapeId].originalTabId;
            console.log(`Received scraped live streamers. Forwarding to original tab ID: ${originalTabId}`);

            chrome.tabs.sendMessage(originalTabId, {
                type: 'showRaidTargetsPopup',
                liveStreamers: message.liveStreamers
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Failed to forward popup HTML:", chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Raid popup HTML forwarded successfully.");
                }
            });

            chrome.tabs.remove(sender.tab.id);
            delete pendingScrapes[scrapeId];
        }
        return true;
    }

    if (message.type === 'sendRaidCommandToHiddenTab') {
        const {
            raidTargetUrl
        } = message;
        const originalTabId = sender.tab.id;

        console.log("Raid target selected. Starting second hidden tab for raid command...");

        chrome.storage.local.get(['rumbleApiKey']).then(result => {
            const apiKey = result.rumbleApiKey;
            if (!apiKey) {
                console.error("❌ API Key not found in local storage. Cannot perform raid command.");
                return;
            }

            fetch(apiKey)
                .then(response => response.json())
                .then(data => {
                    if (data && data.livestreams && data.livestreams.length > 0 && data.livestreams[0].id) {
                        const livestreamId = data.livestreams[0].id;
                        const ownStreamUrl = `https://rumble.com/v${livestreamId}`;
                        const raidCommandId = Date.now().toString();

                        chrome.tabs.create({
                            url: ownStreamUrl,
                            active: false
                        }, (tab) => {
                            if (chrome.runtime.lastError) {
                                console.error("❌ Failed to create raid command tab:", chrome.runtime.lastError);
                                return;
                            }
                            pendingRaidCommands[raidCommandId] = {
                                tabId: tab.id,
                                originalTabId: originalTabId,
                                raidTargetUrl: raidTargetUrl,
                                scriptInjected: false
                            };
                            console.log(`Raid command tab created with ID: ${tab.id}. Injecting raid command script.`);
                        });
                    } else {
                        console.error("❌ Could not get your live stream URL from API. Cannot send raid command.");
                    }
                });
        });
        sendResponse({
            status: 'ok'
        });
        return true;
    }

    if (message.type === 'openRumbleStudio') {
        const studioUrl = `https://rumble.com/studio/${message.username}`;
        chrome.tabs.create({
            url: studioUrl,
			active: false
        });
        return true;
    }

    if (message.type === 'raidProcessFailed') {
        const raidCommandId = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].tabId === sender.tab.id);
        if (raidCommandId) {
            console.error("Received raid process failed message. Closing hidden tab.");
            chrome.tabs.remove(sender.tab.id);
            delete pendingRaidCommands[raidCommandId];
        }
        return true;
    }

	if (message.type === 'raidConfirmedAndComplete') {
        const raidCommandId = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].originalTabId === sender.tab.id);
        if (raidCommandId) {
            const hiddenTabId = pendingRaidCommands[raidCommandId].tabId;
            console.log(`Raid cancelled by user. Closing hidden command tab ID: ${hiddenTabId}`);
            chrome.tabs.remove(hiddenTabId);
            delete pendingRaidCommands[raidCommandId];
        }
        sendResponse({ status: 'ok' });
        return true;
    }

});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    const scrapeId = Object.keys(pendingScrapes).find(id => pendingScrapes[id].tabId === tabId);
    if (scrapeId && changeInfo.status === 'complete' && tab.url.includes("rumble.com") && !pendingScrapes[scrapeId].scriptInjected) {
        pendingScrapes[scrapeId].scriptInjected = true;
        console.log(`Scrape tab loaded. Injecting script to get live streamers.`);

        chrome.scripting.executeScript({
            target: {
                tabId: tabId
            },
            func: injectedScrapeScript
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("❌ Scrape script injection failed:", chrome.runtime.lastError.message);
                chrome.tabs.remove(tabId);
                delete pendingScrapes[scrapeId];
            }
        });
        return;
    }


    const raidCommandId = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].tabId === tabId);
    if (raidCommandId && changeInfo.status === 'complete' && tab.url.includes("rumble.com") && !pendingRaidCommands[raidCommandId].scriptInjected) {
        pendingRaidCommands[raidCommandId].scriptInjected = true;
        const raidTargetUrl = pendingRaidCommands[raidCommandId].raidTargetUrl;

        console.log(`Page loaded in raid command tab. Injecting script to send raid command to: ${raidTargetUrl}`);
        chrome.scripting.executeScript({
            target: {
                tabId: tabId
            },
            func: injectedRaidScript,
            args: [raidTargetUrl]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("❌ Script injection failed:", chrome.runtime.lastError.message);
                chrome.tabs.remove(tabId);
                delete pendingRaidCommands[raidCommandId];
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    const scrapeIdToRemove = Object.keys(pendingScrapes).find(id => pendingScrapes[id].tabId === tabId || pendingScrapes[id].originalTabId === tabId);
    if (scrapeIdToRemove) {
        if (pendingScrapes[scrapeIdToRemove].tabId === tabId) {
            console.log(`Hidden scrape tab ID: ${tabId} was closed. Cleaning up pending scrape.`);
        }
        delete pendingScrapes[scrapeIdToRemove];
    }
    const raidCommandIdToRemove = Object.keys(pendingRaidCommands).find(id => pendingRaidCommands[id].tabId === tabId || pendingRaidCommands[id].originalTabId === tabId);
    if (raidCommandIdToRemove) {
        if (pendingRaidCommands[raidCommandIdToRemove].tabId === tabId) {
            console.log(`Hidden raid command tab ID: ${tabId} was closed. Cleaning up pending raid command.`);
        }
        delete pendingRaidCommands[raidCommandIdToRemove];
    }
});

function playSoundWithTab(source) {
  const playerUrl = chrome.runtime.getURL('sound_player.html');
  const fullUrl = `${playerUrl}?src=${encodeURIComponent(source)}`;

  chrome.tabs.create({
    url: fullUrl,
    active: false
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'playAlertSound') {
    playSoundWithTab(message.soundSrc);
    return true;
  }

  if (message.type === 'startUnifiedRaidProcess') {
    return true;
  }

});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'playAlertSound') {
    playSound(message.soundSrc);
    return true;
  }
});