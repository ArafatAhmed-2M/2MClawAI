document.addEventListener('DOMContentLoaded', () => {
    // Navigation logic
    const navLinks = document.querySelectorAll('nav a');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all
            navLinks.forEach(l => l.classList.remove('active'));
            views.forEach(v => v.classList.remove('active-view'));
            
            // Add active class to clicked
            link.classList.add('active');
            const targetViewId = link.id.replace('nav-', 'view-');
            document.getElementById(targetViewId)?.classList.add('active-view');
        });
    });

    // LLM Switcher Logic
    const llmSelect = document.getElementById('llm-select');
    llmSelect.addEventListener('change', (e) => {
        const provider = e.target.value;
        const chatBox = document.getElementById('chat-box');
        
        const notification = document.createElement('div');
        notification.className = 'message system';
        notification.textContent = `Switched LLM Provider to: ${provider.toUpperCase()}`;
        chatBox.appendChild(notification);
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    // Fetch Providers dynamically
    fetch('http://localhost:3000/api/llm/providers')
        .then(res => res.json())
        .then(providers => {
            llmSelect.innerHTML = '';
            providers.forEach(p => {
                const optGroup = document.createElement('optgroup');
                optGroup.label = p.name;
                p.models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = `${p.id}:${m.id}`; // Store both provider and model
                    opt.textContent = m.name;
                    optGroup.appendChild(opt);
                });
                llmSelect.appendChild(optGroup);
            });
        })
        .catch(err => console.log('API not running yet, using default providers.'));

    // Fetch Settings
    fetch('http://localhost:3000/api/settings/keys')
        .then(res => res.json())
        .then(keys => {
            if(keys.OPENAI_API_KEY) document.getElementById('key-openai').value = keys.OPENAI_API_KEY;
            if(keys.CLAUDE_API_KEY) document.getElementById('key-claude').value = keys.CLAUDE_API_KEY;
            if(keys.GEMINI_API_KEY) document.getElementById('key-gemini').value = keys.GEMINI_API_KEY;
            if(keys.GROQ_API_KEY) document.getElementById('key-groq').value = keys.GROQ_API_KEY;
            if(keys.OLLAMA_ENDPOINT) document.getElementById('key-ollama').value = keys.OLLAMA_ENDPOINT;
            if(keys.OPENROUTER_API_KEY) document.getElementById('key-openrouter').value = keys.OPENROUTER_API_KEY;
            if(keys.DEEPSEEK_API_KEY) document.getElementById('key-deepseek').value = keys.DEEPSEEK_API_KEY;
            if(keys.COHERE_API_KEY) document.getElementById('key-cohere').value = keys.COHERE_API_KEY;
            if(keys.HF_API_KEY) document.getElementById('key-hf').value = keys.HF_API_KEY;
            if(keys.TOGETHER_API_KEY) document.getElementById('key-together').value = keys.TOGETHER_API_KEY;
            if(keys.CUSTOM_BASE_URL) document.getElementById('key-custom-url').value = keys.CUSTOM_BASE_URL;
            if(keys.CUSTOM_API_KEY) document.getElementById('key-custom-key').value = keys.CUSTOM_API_KEY;
            if(keys.DISCORD_BOT_TOKEN) document.getElementById('key-discord').value = keys.DISCORD_BOT_TOKEN;
            if(keys.TELEGRAM_BOT_TOKEN) document.getElementById('key-telegram').value = keys.TELEGRAM_BOT_TOKEN;

            if(keys.OPENAI_MODELS) document.getElementById('models-openai').value = keys.OPENAI_MODELS;
            if(keys.CLAUDE_MODELS) document.getElementById('models-claude').value = keys.CLAUDE_MODELS;
            if(keys.GEMINI_MODELS) document.getElementById('models-gemini').value = keys.GEMINI_MODELS;
            if(keys.GROQ_MODELS) document.getElementById('models-groq').value = keys.GROQ_MODELS;
            if(keys.OLLAMA_MODELS) document.getElementById('models-ollama').value = keys.OLLAMA_MODELS;
            if(keys.OPENROUTER_MODELS) document.getElementById('models-openrouter').value = keys.OPENROUTER_MODELS;
            if(keys.DEEPSEEK_MODELS) document.getElementById('models-deepseek').value = keys.DEEPSEEK_MODELS;
            if(keys.COHERE_MODELS) document.getElementById('models-cohere').value = keys.COHERE_MODELS;
            if(keys.HF_MODELS) document.getElementById('models-hf').value = keys.HF_MODELS;
            if(keys.TOGETHER_MODELS) document.getElementById('models-together').value = keys.TOGETHER_MODELS;
            if(keys.CUSTOM_MODELS) document.getElementById('models-custom').value = keys.CUSTOM_MODELS;
        })
        .catch(err => console.log('Could not load keys.'));

    // Save Settings
    const saveBtn = document.getElementById('save-keys-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const keys = {
                OPENAI_API_KEY: document.getElementById('key-openai').value,
                CLAUDE_API_KEY: document.getElementById('key-claude').value,
                GEMINI_API_KEY: document.getElementById('key-gemini').value,
                GROQ_API_KEY: document.getElementById('key-groq').value,
                OLLAMA_ENDPOINT: document.getElementById('key-ollama').value,
                OPENROUTER_API_KEY: document.getElementById('key-openrouter').value,
                DEEPSEEK_API_KEY: document.getElementById('key-deepseek').value,
                COHERE_API_KEY: document.getElementById('key-cohere').value,
                HF_API_KEY: document.getElementById('key-hf').value,
                TOGETHER_API_KEY: document.getElementById('key-together').value,
                CUSTOM_BASE_URL: document.getElementById('key-custom-url').value,
                CUSTOM_API_KEY: document.getElementById('key-custom-key').value,
                DISCORD_BOT_TOKEN: document.getElementById('key-discord').value,
                TELEGRAM_BOT_TOKEN: document.getElementById('key-telegram').value,
                OPENAI_MODELS: document.getElementById('models-openai').value,
                CLAUDE_MODELS: document.getElementById('models-claude').value,
                GEMINI_MODELS: document.getElementById('models-gemini').value,
                GROQ_MODELS: document.getElementById('models-groq').value,
                OLLAMA_MODELS: document.getElementById('models-ollama').value,
                OPENROUTER_MODELS: document.getElementById('models-openrouter').value,
                DEEPSEEK_MODELS: document.getElementById('models-deepseek').value,
                COHERE_MODELS: document.getElementById('models-cohere').value,
                HF_MODELS: document.getElementById('models-hf').value,
                TOGETHER_MODELS: document.getElementById('models-together').value,
                CUSTOM_MODELS: document.getElementById('models-custom').value
            };
            
            saveBtn.textContent = 'Saving...';
            fetch('http://localhost:3000/api/settings/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keys)
            })
            .then(res => res.json())
            .then(data => {
                saveBtn.textContent = 'Saved!';
                setTimeout(() => saveBtn.textContent = 'Save Changes', 2000);
            })
            .catch(err => {
                saveBtn.textContent = 'Error!';
                setTimeout(() => saveBtn.textContent = 'Save Changes', 2000);
            });
        });
    }

    // --- CHAT LOGIC ---
    if (typeof io !== 'undefined') {
        const socket = io();
        
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const chatBox = document.getElementById('chat-box');
        const emptyState = document.getElementById('empty-state');

        // Feature Elements
        const btnAttach = document.getElementById('btn-attach');
        const fileUpload = document.getElementById('file-upload');
        const attachmentContainer = document.getElementById('attachment-container');
        const btnVoice = document.getElementById('btn-voice');

        let attachedFileContent = null;
        let attachedFileName = null;

        // Attachment Logic
        if (btnAttach && fileUpload) {
            btnAttach.addEventListener('click', () => fileUpload.click());
            
            fileUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    attachedFileContent = ev.target.result;
                    attachedFileName = file.name;
                    
                    attachmentContainer.innerHTML = `
                        <div class="attachment-badge">
                            <i class='bx bx-file'></i> ${file.name}
                            <i class='bx bx-x' id="remove-attachment" title="Remove"></i>
                        </div>
                    `;
                    document.getElementById('remove-attachment').addEventListener('click', () => {
                        attachedFileContent = null;
                        attachedFileName = null;
                        attachmentContainer.innerHTML = '';
                        fileUpload.value = '';
                    });
                };
                reader.readAsText(file);
            });
        }

        // Voice Logic (Web Speech API)
        let recognition = null;
        let isRecording = false;
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            
            recognition.onstart = () => {
                isRecording = true;
                if(btnVoice) btnVoice.classList.add('pulse-record');
            };
            
            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                chatInput.value = finalTranscript || interimTranscript;
            };
            
            recognition.onend = () => {
                isRecording = false;
                if(btnVoice) btnVoice.classList.remove('pulse-record');
            };
            
            if (btnVoice) {
                btnVoice.addEventListener('click', () => {
                    if (isRecording) {
                        recognition.stop();
                    } else {
                        recognition.start();
                    }
                });
            }
        } else {
            if (btnVoice) btnVoice.style.display = 'none';
        }

        const appendMessage = (role, text, meta) => {
            if (emptyState && !emptyState.classList.contains('hidden')) {
                emptyState.classList.add('hidden');
            }
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${role}`;
            
            const textDiv = document.createElement('div');
            if (role === 'ai') {
                textDiv.innerHTML = marked.parse(text);
            } else {
                textDiv.textContent = text;
                textDiv.style.whiteSpace = 'pre-wrap';
            }
            msgDiv.appendChild(textDiv);
            
            if (meta) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'meta';
                metaDiv.style.fontSize = '0.7rem';
                metaDiv.style.marginTop = '0.5rem';
                metaDiv.style.opacity = '0.7';
                metaDiv.textContent = meta;
                msgDiv.appendChild(metaDiv);
            }
            
            chatBox.appendChild(msgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        };

        let isThinking = false;
        let thinkingDiv = null;

        const sendMessage = () => {
            if (!chatInput.value.trim() && !attachedFileContent) return;
            if (isThinking) return;
            
            let userDisplayMsg = chatInput.value.trim();
            let msg = userDisplayMsg;
            chatInput.value = '';
            
            // Handle Attachment
            if (attachedFileContent) {
                msg += `\n\n[Attached File: ${attachedFileName}]\n\`\`\`\n${attachedFileContent}\n\`\`\``;
                userDisplayMsg = userDisplayMsg ? `${userDisplayMsg}\n\n📎 ${attachedFileName}` : `📎 ${attachedFileName}`;
                
                // Clear attachment
                attachedFileContent = null;
                attachedFileName = null;
                attachmentContainer.innerHTML = '';
                fileUpload.value = '';
            }
            
            appendMessage('user', userDisplayMsg);
            
            const selection = llmSelect.value;
            if (!selection || !selection.includes(':')) {
                appendMessage('system', 'Error: Invalid model selected. Please check Settings.');
                return;
            }
            const [provider, model] = selection.split(':');
            
            socket.emit('chat_message', { provider, model, message: msg });
            isThinking = true;
        };

        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
        }
        
        // Quick Action Chips
        const quickActionChips = document.querySelectorAll('.quick-action-chip');
        quickActionChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                chatInput.value = e.target.textContent.trim();
                sendMessage();
            });
        });

        socket.on('chat_status', (data) => {
            if (data.status === 'thinking') {
                thinkingDiv = document.createElement('div');
                thinkingDiv.className = 'message ai thinking';
                thinkingDiv.textContent = '... thinking ...';
                chatBox.appendChild(thinkingDiv);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        });

        socket.on('chat_response', (data) => {
            isThinking = false;
            if (thinkingDiv) {
                thinkingDiv.remove();
                thinkingDiv = null;
            }
            appendMessage('ai', data.message, `Generated by ${data.provider} (${data.model})`);
            
            // Native Audio Voice (Text-to-Speech)
            if ('speechSynthesis' in window) {
                // Strip simple markdown for cleaner speech
                const cleanText = data.message.replace(/[*#`]/g, '');
                const utterance = new SpeechSynthesisUtterance(cleanText);
                window.speechSynthesis.speak(utterance);
            }
        });

        socket.on('chat_error', (data) => {
            isThinking = false;
            if (thinkingDiv) {
                thinkingDiv.remove();
                thinkingDiv = null;
            }
            appendMessage('system', `Error: ${data.message}`);
        });
        
        socket.on('log', (data) => {
            appendMessage('system', data.message);
        });
    }
});
