const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const fileInput = document.getElementById('fileInput');
const chatHistory = document.getElementById('chatHistory');
const historyPanel = document.getElementById('historyPanel');
const modelSelect = document.getElementById('modelSelect');
const aiStatus = document.getElementById('aiStatus');
const suggestions = document.getElementById('suggestions');
const welcomeOverlay = document.getElementById('welcomeOverlay');
let currentChatId = 0;
let chats = {};
let voiceActive = false;
let recognition;
let responseSpeed = 80;
let autoSuggest = true;
let voiceActivate = true;
let sentimentTrack = true;
let emotionDetect = true;
let neuralLink = true;
let userBehavior = { freq: {}, lastInput: '', sentiment: [], emotions: [] };
let hologramActive = false;

function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
}

function addMessage(content, isUser = false, chatId = currentChatId, reactions = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            ${content}
            <div class="message-time">${getCurrentTime()}</div>
            <button class="copy-btn" onclick="copyToClipboard(this.previousElementSibling.previousElementSibling.textContent)" title="Copy to HoloClipboard">
                <i class="fas fa-copy"></i>
            </button>
            <div class="reaction-bar">
                <button class="reaction-btn" onclick="addReaction('${chatId}', ${chats[chatId].length}, '👍')" title="Like">👍</button>
                <button class="reaction-btn" onclick="addReaction('${chatId}', ${chats[chatId].length}, '❤️')" title="Love">❤️</button>
                <button class="reaction-btn" onclick="addReaction('${chatId}', ${chats[chatId].length}, '😂')" title="Laugh">😂</button>
                <button class="reaction-btn" onclick="addReaction('${chatId}', ${chats[chatId].length}, '😢')" title="Sad">😢</button>
                <button class="reaction-btn" onclick="addReaction('${chatId}', ${chats[chatId].length}, '😡')" title="Angry">😡</button>
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    ensureInputVisible();

    if (!chats[chatId]) chats[chatId] = [];
    chats[chatId].push({ content, isUser, timestamp: Date.now(), reactions });
    saveChats();
    analyzeSentimentForMessage(content, isUser);
    detectEmotionForMessage(content, isUser);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied to HoloClipboard via neural link!'));
}

function addReaction(chatId, index, emoji) {
    chats[chatId][index].reactions[emoji] = (chats[chatId][index].reactions[emoji] || 0) + 1;
    saveChats();
    loadChat(currentChatId);
}

function ensureInputVisible() {
    const input = document.querySelector('.chat-input');
    const messages = chatMessages;
    messages.scrollTop = messages.scrollHeight;
    input.style.position = 'relative';
    input.style.zIndex = '5';
    if (messages.scrollHeight > messages.clientHeight) {
        messages.addEventListener('scroll', () => {
            if (messages.scrollTop + messages.clientHeight >= messages.scrollHeight - 30) {
                input.style.bottom = '0';
            } else {
                input.style.bottom = '20px';
            }
        }, { passive: true });
    }
}

function newChat() {
    currentChatId = Date.now();
    chatMessages.innerHTML = '';
    addHistoryItem(`HoloChat ${new Date().toLocaleDateString()} ${getCurrentTime()}`);
    chats[currentChatId] = [];
    userBehavior = { freq: {}, lastInput: '', sentiment: [], emotions: [] };
    suggestions.innerHTML = '';
    welcomeOverlay.style.display = 'flex'; // Show welcome on new chat
}

function addHistoryItem(title) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<i class="fas fa-comment"></i> <span>${title}</span>`;
    item.onclick = () => {
        loadChat(title);
        toggleHistory();
    };
    chatHistory.insertBefore(item, chatHistory.firstChild);
}

function loadChat(title) {
    const id = Object.keys(chats).find(key => chats[key][0]?.timestamp === parseInt(key));
    if (id) {
        currentChatId = id;
        chatMessages.innerHTML = '';
        chats[id].forEach((msg, idx) => addMessage(msg.content, msg.isUser, id, msg.reactions));
        welcomeOverlay.style.display = 'none'; // Hide welcome on load chat
    }
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

function loadChats() {
    const saved = localStorage.getItem('chats');
    if (saved) {
        chats = JSON.parse(saved);
        Object.keys(chats).forEach(id => {
            const firstMsg = chats[id][0];
            addHistoryItem(firstMsg ? `HoloChat ${new Date(firstMsg.timestamp).toLocaleDateString()} ${getCurrentTime()}` : `HoloChat ${id}`);
        });
        currentChatId = Object.keys(chats)[0] || Date.now();
        loadChat(currentChatId);
    } else {
        newChat();
    }
}

async function getBotResponse(message, files) {
    aiStatus.textContent = 'Processing via Quantum Nexus...';
    await new Promise(resolve => setTimeout(resolve, responseSpeed));
    const model = modelSelect.value;
    updateUserBehavior(message);
    const response = await generateResponse(model, message, files);
    aiStatus.textContent = 'Online';
    return response;
}

const dailyLifeCategories = {
    greetings: ['Greetings, cosmic traveler', 'Hi from the 3000 era', 'Hey, holo-citizen', 'Bright cycle', 'Salutations, quantum being'],
    weather: ['Holo-starlight shining', 'Nano-storm detected', 'Chilled fusion mist', 'Warm quantum breeze', 'Holographic nebula'],
    food: ['Try quantum fusion pasta', 'Synth-holo-pizza recommended', 'Nano-energy salad', 'Holo-grilled protein matrix', 'Virtual quantum sushi'],
    activities: ['Holo-walk in the quantumverse', 'Read a neural tome', 'Watch a holo-film matrix', 'Train in the cyber-neural gym', 'Play quantum neural games'],
    work: ['Complete that quantum nexus report', 'Sync with your AI overseer', 'Plan the holo-meeting matrix', 'Take a nano-regen break', 'Review the neural fusion project'],
    health: ['Hydrate with smart nano-water', 'Rest in the regen-chamber', 'Stretch in zero-g holo-space', 'Take your quantum nano-meds', 'Track steps via neural matrix'],
    shopping: ['Acquire holo-groceries from the quantum market', 'Need quantum boots?', 'Check metaverse fusion deals', 'Buy a holo-gift matrix', 'Stock up on nano-energy snacks'],
    travel: ['Plan a quantum voyage', 'Book a holo-flight matrix', 'Pack light in nano-space', 'Explore the quantumverse', 'Rent a neural fusion vehicle'],
    emotions: ['Feeling optimal in 3000?', 'Bit stressed in the quantum matrix?', 'Excited in this era?', 'Calm your neural waves', 'Need a holo-laugh matrix?'],
    time: ['Early quantum cycle', 'Midday fusion pulse', 'Late nano-cycle matrix', 'Time accelerates in 3000', 'Evening holo-dusk fusion']
};

const responseTemplates = {
    deepthink: [
        (msg, cat) => `Reflecting on "${msg}": ${cat}. This invites a quantum-nexus exploration—perhaps a transdimensional leap in 3000 awaits.`,
        (msg, cat) => `Deep dive into "${msg}": ${cat}. It’s a thread worth pulling; holographic-neural insights unfold in our cosmic age.`,
        (msg, cat) => `Pondering "${msg}": ${cat}. My quantum nexus hums with curiosity—what’s the next layer in this transhuman era?`
    ],
    advanced: [
        (msg, cat) => `Analyzing "${msg}": ${cat}. Step 1: Contextualize with neural fusion. Step 2: Deduce with quantum matrix. Result: 3000 insight.`,
        (msg, cat) => `Logic on "${msg}": ${cat}. If A, then B—here’s the structured outcome for our transdimensional paradigm.`,
        (msg, cat) => `Evaluating "${msg}": ${cat}. Data points align via quantum fusion matrix; conclusion follows seamlessly in 3000.`
    ],
    creative: [
        (msg, cat) => `"${msg}" sparks: ${cat}. Imagine a 3000 world where this twists into a holographic-neural adventure!`,
        (msg, cat) => `From "${msg}": ${cat}. A creative leap—let’s project a transdimensional reality scene together!`,
        (msg, cat) => `"${msg}" ignites: ${cat}. What if we spun this into a quantum epic for the future?`
    ],
    fast: [
        (msg, cat) => `"${msg}"? ${cat}. Nano-instant, sharp, and optimized for 3000’s speed matrix!`,
        (msg, cat) => `Fast take on "${msg}": ${cat}. Boom—answered in femtoseconds!`,
        (msg, cat) => `"${msg}" hits: ${cat}. Instant clarity, no delay in this quantum era matrix!`
    ]
};

function updateUserBehavior(message) {
    const words = message.toLowerCase().split(' ');
    words.forEach(word => {
        userBehavior.freq[word] = (userBehavior.freq[word] || 0) + 1;
    });
    userBehavior.lastInput = message;
    analyzeSentiment(message);
    detectEmotion(message);
}

function analyzeSentiment(message) {
    if (!sentimentTrack) return;
    const sentimentWords = {
        positive: ['happy', 'great', 'awesome', 'excited', 'good', 'optimal', 'joyful'],
        negative: ['sad', 'bad', 'terrible', 'angry', 'stressed', 'distressed', 'painful'],
        neutral: ['ok', 'fine', 'normal', 'okay', 'standard', 'neutral', 'average']
    };
    let sentiment = 'neutral';
    if (sentimentWords.positive.some(w => message.toLowerCase().includes(w))) sentiment = 'positive';
    else if (sentimentWords.negative.some(w => message.toLowerCase().includes(w))) sentiment = 'negative';
    userBehavior.sentiment.push({ message, sentiment, timestamp: Date.now() });
}

function detectEmotion(message) {
    if (!emotionDetect) return;
    const emotionWords = {
        happy: ['happy', 'joyful', 'excited', 'great', 'awesome'],
        sad: ['sad', 'depressed', 'terrible', 'painful', 'down'],
        angry: ['angry', 'furious', 'mad', 'irritated', 'enraged'],
        neutral: ['ok', 'fine', 'normal', 'okay', 'standard'],
        surprised: ['surprised', 'shocked', 'amazed', 'wow', 'unbelievable']
    };
    let emotion = 'neutral';
    for (let [emo, words] of Object.entries(emotionWords)) {
        if (words.some(w => message.toLowerCase().includes(w))) {
            emotion = emo;
            break;
        }
    }
    userBehavior.emotions.push({ message, emotion, timestamp: Date.now() });
}

function analyzeSentimentForMessage(content, isUser) {
    if (!sentimentTrack || !isUser) return;
    const sentiment = userBehavior.sentiment[userBehavior.sentiment.length - 1]?.sentiment || 'neutral';
    if (sentiment === 'negative') {
        addMessage(`I sense distress in your quantum wave. Shall I adjust my holo-tone or offer transdimensional support in 3000?`, false);
    } else if (sentiment === 'positive') {
        addMessage(`Your positivity resonates in the quantum matrix! How can I enhance your 3000 experience further?`, false);
    }
}

function detectEmotionForMessage(content, isUser) {
    if (!emotionDetect || !isUser) return;
    const emotion = userBehavior.emotions[userBehavior.emotions.length - 1]?.emotion || 'neutral';
    if (emotion !== 'neutral') {
        addMessage(`🔮 HoloEmotion Scan 3000: I detect a ${emotion} neural signature. Shall I adapt my response or project a holo-emotion matrix?`, false);
    }
}

function generateResponse(model, message, files) {
    const categoryKeys = Object.keys(dailyLifeCategories);
    const randomCategory = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    const categoryValue = dailyLifeCategories[randomCategory][Math.floor(Math.random() * 5)];
    
    if (files.length) {
        return `${responseTemplates[model][0](message, `Analyzing ${files.map(f => f.name).join(', ')} with 3000 quantum nexus tech`)} ${categoryValue}.`;
    }
    
    const freqWord = Object.keys(userBehavior.freq).sort((a, b) => userBehavior.freq[b] - userBehavior.freq[a])[0] || '';
    const template = responseTemplates[model][Math.floor(Math.random() * 3)];
    return `${template(message, categoryValue)} ${freqWord ? `Noticed you mention "${freqWord}" often—related thoughts for our transhuman world in 3000?` : ''}`;
}

async function sendMessage() {
    const message = messageInput.value.trim();
    const files = Array.from(fileInput.files);
    if (!message && !files.length) return;

    addMessage(files.length ? `${message} [HoloData: ${files.map(f => f.name).join(', ')}]` : message, true);
    messageInput.value = '';
    fileInput.value = '';
    suggestions.innerHTML = '';

    const response = await getBotResponse(message, files);
    addMessage(response);
}

function toggleHistory() {
    historyPanel.classList.toggle('active');
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleMenu() {
    const menu = document.getElementById('menuDropdown');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function showSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    document.getElementById('responseSpeed').value = responseSpeed;
    document.getElementById('autoSuggest').checked = autoSuggest;
    document.getElementById('voiceActivate').checked = voiceActivate;
    document.getElementById('sentimentTrack').checked = sentimentTrack;
    document.getElementById('emotionDetect').checked = emotionDetect;
    document.getElementById('neuralLink').checked = neuralLink;
}

function closeModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
    responseSpeed = document.getElementById('responseSpeed').value;
    autoSuggest = document.getElementById('autoSuggest').checked;
    voiceActivate = document.getElementById('voiceActivate').checked;
    sentimentTrack = document.getElementById('sentimentTrack').checked;
    emotionDetect = document.getElementById('emotionDetect').checked;
    neuralLink = document.getElementById('neuralLink').checked;
}

function exportChat() {
    const chatText = chats[currentChatId].map(m => `${m.isUser ? 'You' : 'AI'}: ${m.content}`).join('\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holochat_${currentChatId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function signOut() {
    localStorage.clear();
    location.reload();
}

async function generateInsight() {
    const lastMessages = chats[currentChatId].slice(-5).map(m => m.content).join(' ');
    const insight = await generateResponse('deepthink', `Analyze: ${lastMessages}`, []);
    addMessage(`🤓 Quantum Nexus Insight: ${insight}`);
}

async function analyzeContext() {
    const context = chats[currentChatId].map(m => m.content).join(' ');
    const analysis = await generateResponse('advanced', `Holo-analyze: ${context}`, []);
    addMessage(`🔍 Holo Analysis Matrix: ${analysis}`);
}

async function suggestQuestions() {
    const context = chats[currentChatId].slice(-3).map(m => m.content).join(' ');
    const suggestionsList = [
        `What if ${context.split(' ')[0]} evolved in 3000?`,
        `How does ${context.split(' ')[1] || 'this'} impact our quantum future?`,
        `Why might ${context.split(' ')[2] || 'that'} matter in a transhuman matrix?`
    ];
    addMessage(`❓ Holo Suggestions Matrix:\n${suggestionsList.join('\n')}`);
}

function updateSuggestions() {
    if (!autoSuggest) return;
    const input = messageInput.value.trim();
    if (input.length < 3) {
        suggestions.classList.remove('active');
        return;
    }

    const suggest = [
        `${input} - deeper 3000 insights?`,
        `How about ${input} in a quantum nexus context?`,
        `Why ${input} in our transhuman world?`
    ];
    suggestions.innerHTML = suggest.map(s => `<button class="suggestion-btn" onclick="messageInput.value='${s}'; sendMessage()">${s}</button>`).join('');
    suggestions.classList.add('active');
}

function handleFileUpload() {
    const files = Array.from(fileInput.files);
    if (files.length) {
        messageInput.value += ` [HoloData: ${files.map(f => f.name).join(', ')}]`;
    }
}

function updateModel() {
    console.log(`Model changed to: ${modelSelect.value}`);
}

function updateResponseSpeed() {
    responseSpeed = document.getElementById('responseSpeed').value;
}

function toggleNeuralVoice() {
    if (!voiceActivate || !('webkitSpeechRecognition' in window)) {
        alert('Neural voice not supported or disabled in 3000.');
        return;
    }

    if (!voiceActive) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            messageInput.value = event.results[0][0].transcript;
            sendMessage();
        };
        recognition.onerror = () => alert('Neural voice error in quantum matrix.');
        recognition.onend = () => {
            voiceActive = false;
            document.querySelector('.voice-btn').style.background = '#1a73e8';
        };
        recognition.start();
        voiceActive = true;
        document.querySelector('.voice-btn').style.background = '#ff6b6b';
    } else {
        recognition.stop();
    }
}

function filterHistory() {
    const search = document.getElementById('historySearch').value.toLowerCase();
    Array.from(chatHistory.children).forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(search) ? 'block' : 'none';
    });
}

function analyzeSentiment() {
    if (!sentimentTrack) return;
    const sentiment = userBehavior.sentiment[userBehavior.sentiment.length - 1]?.sentiment || 'neutral';
    addMessage(`🔮 Sentiment Scan 3000: I detect a ${sentiment} quantum wave. Shall I adjust my holo-tone or offer transdimensional support?`, false);
}

function detectEmotion() {
    if (!emotionDetect) return;
    const emotion = userBehavior.emotions[userBehavior.emotions.length - 1]?.emotion || 'neutral';
    addMessage(`🔮 HoloEmotion Scan 3000: I detect a ${emotion} neural signature. Shall I adapt my response or project a holo-emotion matrix?`, false);
}

function projectHologram() {
    if (!hologramActive) {
        hologramActive = true;
        addMessage(`🌌 Holo-Projection Activated: Visualizing your conversation in 4D quantum space. Interact with the neural-holo matrix for deeper insights!`, false);
        chatMessages.style.background = 'linear-gradient(135deg, #1e1e1e, #333, #444)';
        chatMessages.style.boxShadow = 'inset 0 0 80px rgba(26, 115, 232, 1)';
        setTimeout(() => {
            hologramActive = false;
            chatMessages.style.background = '#1e1e1e';
            chatMessages.style.boxShadow = 'inset 0 0 25px rgba(0,0,0,0.5)';
            addMessage(`🌌 Holo-Projection Deactivated: Returning to standard quantum interface.`, false);
        }, 8000);
    } else {
        addMessage(`🌌 Holo-Projection already active. Please wait for the quantum cycle to complete.`, false);
    }
}

function simulateNeuralLink() {
    if (!neuralLink) return;
    addMessage(`🧠 Neural Link Simulation 3000: Connecting to your consciousness via quantum thought waves. Share thoughts directly!`, false);
    messageInput.value = '';
    messageInput.placeholder = 'Think your query via neural link...';
    setTimeout(() => {
        messageInput.placeholder = 'Query the HoloMind...';
        addMessage(`🧠 Neural Link Disconnected: Returning to standard input.`, false);
    }, 6000);
}

function selectOption(option) {
    messageInput.value = option;
    sendMessage();
    closeWelcome();
}

function closeWelcome() {
    welcomeOverlay.style.display = 'none';
    localStorage.setItem('welcomeShown', 'true');
}

function showWelcome() {
    welcomeOverlay.style.display = 'flex';
}

window.onload = () => {
    loadChats();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark');
    if (!localStorage.getItem('welcomeShown')) {
        welcomeOverlay.style.display = 'flex';
        setTimeout(() => welcomeOverlay.style.opacity = '1', 100); // Smooth fade-in
    } else {
        welcomeOverlay.style.display = 'none';
    }
    document.querySelector('.welcome-overlay').addEventListener('mouseleave', () => {
        if (!localStorage.getItem('welcomeShown')) {
            welcomeOverlay.style.display = 'none';
            localStorage.setItem('welcomeShown', 'true');
        }
    });
    document.querySelector('.welcome-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('welcome-overlay') || e.target.classList.contains('close-welcome')) {
            closeWelcome();
        }
    });
};

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});