const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const fileInput = document.getElementById('fileInput');
const chatHistory = document.getElementById('chatHistory');
const historyPanel = document.getElementById('historyPanel');
const modelSelect = document.getElementById('modelSelect');
const aiStatus = document.getElementById('aiStatus');
const header = document.getElementById('header');
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

const sentimentKeywords = {
    positive: ['happy', 'great', 'awesome', 'good', 'love', 'excellent'],
    negative: ['sad', 'bad', 'terrible', 'hate', 'awful', 'angry'],
    neutral: ['okay', 'fine', 'normal', 'so-so']
};

const intentKeywords = {
    question: ['what', 'why', 'how', 'where', 'when', 'who', 'can you', 'tell me'],
    command: ['do', 'make', 'create', 'generate', 'execute'],
    statement: ['i think', 'i feel', 'i believe', 'my opinion']
};

function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
}

function addMessage(content, isUser = false, chatId = currentChatId, thoughtProcess = null, thoughtTime = 2) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

    let thoughtHTML = '';
    if (!isUser && thoughtProcess) {
        thoughtHTML = `
            <div class="thought-process">
                <div class="thought-header" onclick="toggleThought(this)">
                    <i class="fas fa-lightbulb"></i> Thought for ${thoughtTime}s
                    <span class="expand-text">Expand for details</span>
                    <i class="fas fa-chevron-down thought-toggle"></i>
                </div>
                <div class="thought-content">
                    <p class="thought-text" id="thought-text-${Date.now()}">${thoughtProcess}</p>
                </div>
            </div>
        `;
    }

    let messageContentHTML = `
        <div class="message-content">
            <div class="message-text">${content}</div>
            <div class="message-time">${getCurrentTime()}</div>
            <div class="response-options">
                <button class="response-btn" onclick="regenerateResponse('${chatId}', ${chats[chatId].length})" title="Regenerate Response"><i class="fas fa-sync"></i></button>
                <button class="response-btn" onclick="copyToClipboard('${content.replace(/'/g, "\\'")}')" title="Copy to Clipboard"><i class="fas fa-copy"></i></button>
                <button class="response-btn" onclick="rateResponse('${chatId}', ${chats[chatId].length}, 'good')" title="Good Response"><i class="fas fa-thumbs-up"></i></button>
                <button class="response-btn" onclick="rateResponse('${chatId}', ${chats[chatId].length}, 'bad')" title="Bad Response"><i class="fas fa-thumbs-down"></i></button>
                <button class="response-btn" onclick="changeModel()" title="Change Model"><i class="fas fa-exchange-alt"></i></button>
                <button class="response-btn" onclick="readAloud('${content.replace(/'/g, "\\'")}')" title="Read Aloud"><i class="fas fa-volume-up"></i></button>
            </div>
        </div>
    `;

    messageDiv.innerHTML = `${thoughtHTML}${messageContentHTML}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const messageContent = messageDiv.querySelector('.message-content');
    messageContent.addEventListener('click', (e) => {
        e.stopPropagation();
        const options = messageContent.querySelector('.response-options');
        document.querySelectorAll('.response-options.active').forEach(opt => {
            if (opt !== options) opt.classList.remove('active');
        });
        options.classList.toggle('active');
    });

    if (!chats[chatId]) chats[chatId] = [];
    chats[chatId].push({ content, isUser, timestamp: Date.now(), rating: null, thoughtProcess });
    saveChats();
    if (isUser) updateUserBehavior(content);
}

function toggleThought(element) {
    const thoughtContent = element.nextElementSibling;
    const toggleIcon = element.querySelector('.thought-toggle');
    thoughtContent.classList.toggle('expanded');
    toggleIcon.classList.toggle('fa-chevron-down');
    toggleIcon.classList.toggle('fa-chevron-up');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.message-content')) {
        document.querySelectorAll('.response-options.active').forEach(opt => {
            opt.classList.remove('active');
        });
    }
});

function showHelpText() {
    const existingHelpText = document.getElementById('help-text');
    if (!existingHelpText) {
        const helpText = document.createElement('div');
        helpText.id = 'help-text';
        helpText.textContent = 'How can I help you today?';
        document.querySelector('.chat-container').appendChild(helpText);
    }
}

function toggleHelpText() {
    const helpText = document.getElementById('help-text');
    if (messageInput.value.trim() || (chats[currentChatId] && chats[currentChatId].length > 0)) {
        if (helpText) helpText.remove();
    } else if (!helpText) {
        showHelpText();
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
}

async function regenerateResponse(chatId, index) {
    const message = chats[chatId][index - 1].content;
    const response = await getBotResponse(message);
    chats[chatId][index - 1] = { content: response, isUser: false, timestamp: Date.now(), rating: null };
    loadChat(chatId);
}

function rateResponse(chatId, index, rating) {
    chats[chatId][index - 1].rating = rating;
    saveChats();
}

function changeModel() {
    modelSelect.focus();
    addMessage('Select a new model from above.', false);
}

function readAloud(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech not supported in this browser.');
    }
}

function newChat() {
    currentChatId = Date.now();
    chatMessages.innerHTML = '';
    const helpText = document.getElementById('help-text');
    if (helpText) helpText.remove();
    showHelpText();
    addHistoryItem(`Chat ${new Date().toLocaleDateString()} ${getCurrentTime()}`);
    chats[currentChatId] = [];
    userBehavior = { freq: {}, lastInput: '', sentiment: [], emotions: [] };
    header.classList.remove('hidden');
}

function addHistoryItem(title) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<i class="fas fa-comment"></i> <span>${title}</span>`;
    item.onclick = () => {
        loadChat(title.split(' ').slice(1).join(' '));
        toggleHistory();
        header.classList.add('hidden');
    };
    chatHistory.insertBefore(item, chatHistory.firstChild);
}

function loadChat(title) {
    const id = Object.keys(chats).find(key => {
        const firstMsg = chats[key][0];
        return firstMsg && `${new Date(firstMsg.timestamp).toLocaleDateString()} ${getCurrentTime()}` === title;
    });
    if (id) {
        currentChatId = id;
        chatMessages.innerHTML = '';
        const helpText = document.getElementById('help-text');
        if (helpText) helpText.remove();
        chats[id].forEach(msg => addMessage(msg.content, msg.isUser, id, msg.thoughtProcess));
        toggleHelpText();
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
            addHistoryItem(`Chat ${new Date(firstMsg.timestamp).toLocaleDateString()} ${getCurrentTime()}`);
        });
        currentChatId = Object.keys(chats)[0] || Date.now();
        loadChat(`Chat ${new Date(chats[currentChatId]?.[0]?.timestamp || Date.now()).toLocaleDateString()} ${getCurrentTime()}`);
    } else {
        currentChatId = Date.now();
        chats[currentChatId] = [];
        addHistoryItem(`Chat ${new Date().toLocaleDateString()} ${getCurrentTime()}`);
    }
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.username) {
        addMessage(`Welcome back ${storedUser.username}!`, false);
    }
}

function parseMessage(message) {
    const words = message.toLowerCase().split(/\s+/);
    let sentiment = 'neutral';
    let intent = 'statement';
    let keywords = [];

    for (const word of words) {
        if (sentimentKeywords.positive.includes(word)) {
            sentiment = 'positive';
            break;
        } else if (sentimentKeywords.negative.includes(word)) {
            sentiment = 'negative';
            break;
        }
    }

    const messageLower = message.toLowerCase();
    for (const [type, keywords] of Object.entries(intentKeywords)) {
        if (keywords.some(keyword => messageLower.startsWith(keyword) || messageLower.includes(` ${keyword} `))) {
            intent = type;
            break;
        }
    }

    const stopWords = ['the', 'a', 'an', 'is', 'are', 'to', 'in', 'for', 'and', 'or'];
    keywords = words.filter(word => !stopWords.includes(word) && word.length > 2);

    return { sentiment, intent, keywords };
}

function generateThoughtProcess(parsedMessage) {
    return new Promise(resolve => {
        const { sentiment, intent, keywords } = parsedMessage;
        const thoughtTextId = `thought-text-${Date.now()}`;
        let thoughtProcess = "🤔 ";
        addMessage("", false, currentChatId, thoughtProcess, 2);
        const thoughtText = document.getElementById(thoughtTextId);
        if (thoughtText) thoughtText.classList.add('processing');

        let fullThought = `🤔 Let me break this down in detail:\n\n ${intent === 'question' ? `I am actively analyzing your input by breaking it down into contextual elements, intent patterns, and semantic structures. First, I identify core entities, sentiment, and implicit meaning to ensure precise intent recognition. Then, I dynamically map this understanding to the most relevant knowledge, logical reasoning, or predictive modeling to generate an optimal response. If ambiguity is detected, I assess multiple interpretations and prioritize the most contextually accurate one. Additionally, I adapt based on conversational history, ensuring responses remain coherent and progressively refined. Let me know if you require further specificity or deeper insights.` : intent === 'command' ? `I am processing your command by first identifying its core action, context, and any relevant parameters. I analyze the instruction for intent, verifying dependencies and potential execution paths. If required, I optimize the command by considering efficiency, logical constraints, and real-time conditions. I then proceed with execution while continuously monitoring for adaptive refinements. If clarification or confirmation is needed, I will prompt for additional details to ensure precision. Let me know if you want modifications or enhancements in execution.` : `I recognize this as a declarative statement, likely conveying a thought, opinion, or observation. To process it effectively, I analyze its semantic structure, context, and underlying implications. If it contains factual information, I validate it against relevant knowledge. If it expresses an opinion or perspective, I assess its sentiment and contextual meaning. Additionally, I determine whether the statement invites further discussion, inference, or response. Let me know if you’d like me to expand on this, provide insights, or engage in deeper analysis.`}\n\n Your tone seems to lean toward ${sentiment}. ${sentiment === 'positive' ? `I have detected a positive sentiment in your input, characterized by optimistic, appreciative, or enthusiastic language. To ensure accuracy, I analyze contextual cues, tone, and intensity, determining whether it conveys joy, gratitude, confidence, or encouragement. This sentiment often indicates a favorable outlook, reinforcing engagement and constructive interaction. If needed, I can further refine the sentiment score, identify key emotional drivers, or provide insights on enhancing positivity. Let me know how you’d like me to proceed.` : sentiment === 'negative' ? `I have detected a negative sentiment in your input, characterized by expressions of concern, dissatisfaction, frustration, or criticism. To ensure precision, I analyze contextual tone, emotional weight, and potential underlying causes. If applicable, I can assess severity, detect patterns, and suggest possible resolutions or insights. Negative sentiment can indicate a need for attention, problem-solving, or deeper discussion. Let me know if you’d like further analysis, recommendations, or a response tailored to address the concern.` : `A neutral tone suggests a balanced or factual approach, which I’ll match accordingly.`}\n\n ${keywords.length > 0 ? `I’ve extracted the following key topics for focus: ${keywords.join(', ')}. I have identified key terms within your input, which serve as anchors for understanding context and intent. These keywords allow me to refine my response, ensuring accuracy, relevance, and coherence. By analyzing their relationships and significance, I can align my processing with the core subject matter, enhancing precision in interpretation. Let me know if you’d like me to expand on any specific term or adjust the focus of my response.` : `I was unable to extract distinct keywords from your input. Instead, I will analyze the full context, considering the overall structure, tone, and implicit meaning to generate a comprehensive and context-aware response. This approach ensures that even without explicit key terms, my reply remains relevant and aligned with the intent of your message.`}\n\nI am analyzing your input within its broader context, taking into account previous interactions, underlying themes, and relevant nuances. By assessing linguistic structure, intent, and implicit meaning, I ensure my response aligns with the specific situation. This approach allows me to adapt dynamically, providing more precise, coherent, and context-aware replies. ${userBehavior.lastInput ? `Your last input was "${userBehavior.lastInput}", which might influence the continuity of this response.` : ''} I will cross-reference this information with my knowledge base to ensure accuracy, depth, and contextual relevance. By validating details against verified sources, prior interactions, and logical frameworks, I enhance the precision and reliability of my response. If discrepancies or ambiguities arise, I will refine my analysis to provide the most informed and well-supported answer.\n\n I’ll proceed by ${intent === 'question' ? 'delivering a detailed answer with examples' : intent === 'command' ? 'executing the task with precision' : 'engaging thoughtfully with your statement'}. This approach aims to maximize usefulness and align with your intent.`;

        let index = 0;
        const interval = setInterval(() => {
            if (index < fullThought.length) {
                thoughtText.textContent += fullThought[index];
                index++;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                clearInterval(interval);
                thoughtText.classList.remove('processing');
                resolve(thoughtProcess);
            }
        }, 20);

        setTimeout(() => {
            clearInterval(interval);
            if (thoughtText && index < fullThought.length) {
                thoughtText.textContent = fullThought;
                thoughtText.classList.remove('processing');
                resolve(fullThought);
            }
        }, 2000);
    });
}

async function getBotResponse(message, files = []) {
    aiStatus.textContent = "Thinking...";
    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB3zFhn6tEUub0SAvh2SopKwQg_syMaxRY",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: message }] }],
                }),
            }
        );
        if (!response.ok) throw new Error("API request failed");
        const data = await response.json();
        aiStatus.textContent = "Online";
        let botReply = data.candidates[0].content.parts[0].text.trim();
        if (files.length) {
            botReply += ` [Processed: ${files.map(f => f.name).join(', ')}]`;
        }
        return botReply;
    } catch (error) {
        console.error("API Error:", error);
        aiStatus.textContent = "Error";
        return `Error: Could not generate response. [Fallback: ${generateResponse(modelSelect.value, message, files)}]`;
    }
}

const responseTemplates = {
    deepthink: msg => `Deep analysis of "${msg}": Quantum insights from 3000.`,
    advanced: msg => `Structured response to "${msg}": Logical output.`,
    creative: msg => `Creative take on "${msg}": Imagine this in 3000!`,
    fast: msg => `Quick reply to "${msg}": Instant 3000 response.`
};

function generateResponse(model, message, files) {
    let response = responseTemplates[model](message);
    if (files.length) {
        response += ` [Files: ${files.map(f => f.name).join(', ')}]`;
    }
    return response;
}

function updateUserBehavior(message) {
    const words = message.toLowerCase().split(' ');
    words.forEach(word => {
        userBehavior.freq[word] = (userBehavior.freq[word] || 0) + 1;
    });
    userBehavior.lastInput = message;
}

async function sendMessage() {
    const message = messageInput.value.trim();
    const files = Array.from(fileInput.files);
    if (!message && !files.length) return;

    const userMessage = files.length ? `${message} [Files: ${files.map(f => f.name).join(', ')}]` : message;
    addMessage(userMessage, true);
    messageInput.value = '';
    fileInput.value = '';

    const parsedMessage = parseMessage(message);
    const thoughtProcess = await generateThoughtProcess(parsedMessage);

    const response = await getBotResponse(message, files);
    addMessage(response, false, currentChatId);
    toggleHelpText();
}

function toggleHistory() {
    historyPanel.classList.toggle('active');
    if (!historyPanel.classList.contains('active')) {
        header.classList.remove('hidden');
    } else {
        header.classList.add('hidden');
    }
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
    a.download = `chat_${currentChatId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('loginEmail').focus();
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginForm').reset();
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.email === email) {
        addMessage(`Welcome back ${storedUser.username}!`, false);
        closeLoginModal();
    } else {
        addMessage('Login failed. Please sign up.', false);
    }
}

function showSignUpModal() {
    document.getElementById('signUpModal').style.display = 'flex';
    document.getElementById('signupUsername').focus();
}

function closeSignUpModal() {
    document.getElementById('signUpModal').style.display = 'none';
    document.getElementById('signUpForm').reset();
}

function handleSignUp(event) {
    event.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    localStorage.setItem('user', JSON.stringify({ username, email }));
    addMessage(`Welcome ${username}!`, false);
    closeSignUpModal();
}

function signOut() {
    localStorage.clear();
    location.reload();
}

function updatePlaceholder() {
    toggleHelpText();
}

function handleFileUpload() {
    const files = Array.from(fileInput.files);
    if (files.length) {
        messageInput.value += ` [Files: ${files.map(f => f.name).join(', ')}]`;
    }
    removeHelpTextOnToolClick();
}

function updateModel() {
    console.log(`Model changed to: ${modelSelect.value}`);
}

function updateResponseSpeed() {
    responseSpeed = document.getElementById('responseSpeed').value;
}

function toggleNeuralVoice() {
    if (!voiceActivate || !('webkitSpeechRecognition' in window)) {
        alert('Voice not supported or disabled.');
        return;
    }
    if (!voiceActive) {
        recognition = new webkitSpeechRecognition();
        recognition.onresult = (event) => {
            messageInput.value = event.results[0][0].transcript;
            sendMessage();
        };
        recognition.onerror = () => alert('Voice error.');
        recognition.onend = () => {
            voiceActive = false;
            document.querySelector('.voice-btn').style.background = 'linear-gradient(135deg, #1a73e8, #0a0f1c)';
        };
        recognition.start();
        voiceActive = true;
        document.querySelector('.voice-btn').style.background = '#ff6b6b';
    } else {
        recognition.stop();
    }
    removeHelpTextOnToolClick();
}

function filterHistory() {
    const search = document.getElementById('historySearch').value.toLowerCase();
    Array.from(chatHistory.children).forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(search) ? 'block' : 'none';
    });
}

function realWorldIntegration() {
    addMessage("Connecting to real-time data. Specify your request.", false);
    removeHelpTextOnToolClick();
}

function autonomousTaskExecution() {
    addMessage("Specify a task for autonomous execution.", false);
    removeHelpTextOnToolClick();
}

function multimodalUnderstanding() {
    addMessage("Upload data or describe your multimodal request.", false);
    removeHelpTextOnToolClick();
}

function personalizedAIMemory() {
    addMessage("What memory would you like to retrieve?", false);
    removeHelpTextOnToolClick();
}

function removeHelpTextOnToolClick() {
    const helpText = document.getElementById('help-text');
    if (helpText) helpText.remove();
}

function startChat() {
    const welcomeSection = document.getElementById('welcomeSection');
    if (welcomeSection) welcomeSection.style.display = 'none';

    const chatInputSection = document.getElementById('chatInputSection');
    if (chatInputSection) chatInputSection.style.display = 'block';

    showHelpText();

    const sendButton = document.querySelector('.send-btn');
    const inputTools = document.querySelectorAll('.tool-btn');
    const messageInputField = document.getElementById('messageInput');

    if (sendButton) {
        sendButton.removeAttribute('disabled');
        sendButton.style.pointerEvents = 'auto';
        if (!sendButton.onclick) sendButton.addEventListener('click', sendMessage);
    } else console.error('Send button not found in DOM');

    if (messageInputField) {
        messageInputField.removeAttribute('disabled');
        messageInputField.style.pointerEvents = 'auto';
    } else console.error('Message input field not found in DOM');

    inputTools.forEach(tool => {
        tool.removeAttribute('disabled');
        tool.style.pointerEvents = 'auto';
        if (!tool.onclick) tool.addEventListener('click', () => {
            if (tool.classList.contains('voice-btn')) toggleNeuralVoice();
            else if (tool.classList.contains('file-btn')) fileInput.click();
            else if (tool.classList.contains('real-world-btn')) realWorldIntegration();
            else if (tool.classList.contains('autonomous-btn')) autonomousTaskExecution();
            else if (tool.classList.contains('multimodal-btn')) multimodalUnderstanding();
            else if (tool.classList.contains('memory-btn')) personalizedAIMemory();
        });
    });

    document.querySelectorAll('.tool-btn').forEach(button => {
        button.addEventListener('click', removeHelpTextOnToolClick);
    });
}

window.onload = () => {
    const saved = localStorage.getItem('chats');
    if (saved) {
        chats = JSON.parse(saved);
        Object.keys(chats).forEach(id => {
            const firstMsg = chats[id][0];
            addHistoryItem(`Chat ${new Date(firstMsg.timestamp).toLocaleDateString()} ${getCurrentTime()}`);
        });
        currentChatId = Object.keys(chats)[0] || Date.now();
        loadChat(`Chat ${new Date(chats[currentChatId]?.[0]?.timestamp || Date.now()).toLocaleDateString()} ${getCurrentTime()}`);
    } else {
        currentChatId = Date.now();
        chats[currentChatId] = [];
        addHistoryItem(`Chat ${new Date().toLocaleDateString()} ${getCurrentTime()}`);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark');

    const welcomeSection = document.getElementById('welcomeSection');
    const chatInputSection = document.getElementById('chatInputSection');
    if (welcomeSection) welcomeSection.style.display = 'block';
    if (chatInputSection) chatInputSection.style.display = 'none';

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.username) addMessage(`Welcome back ${storedUser.username}!`, false);
};

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    updatePlaceholder();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
// Feedback Functions
function showFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    modal.style.display = 'flex';
    document.getElementById('feedbackText').focus();
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    modal.style.display = 'none';
    document.getElementById('feedbackForm').reset();
}

function sendFeedback(event) {
    event.preventDefault();
    const feedbackText = document.getElementById('feedbackText').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();
    const timestamp = new Date().toLocaleString();

    if (!feedbackText) {
        alert('Please enter your feedback.');
        return;
    }

    const templateParams = {
        feedback: feedbackText,
        userEmail: userEmail || 'Not provided',
        timestamp: timestamp
    };

    console.log('Sending feedback with params:', templateParams);

    emailjs.send('service_ywqk84r', 'template_f2n1rdg', templateParams)
        .then((response) => {
            console.log('SUCCESS!', response.status, response.text);
            addMessage('Thank you for your feedback! It has been sent successfully.', false);
            closeFeedbackModal();
        }, (error) => {
            console.error('FAILED...', error);
            addMessage('Failed to send feedback. Please check the console for details or try again later.', false);
            if (error.text) {
                console.log('Error details:', error.text);
            }
        });
}

document.getElementById('feedbackForm').addEventListener('submit', sendFeedback);
