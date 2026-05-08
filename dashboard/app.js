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
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                llmSelect.appendChild(opt);
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
                OLLAMA_ENDPOINT: document.getElementById('key-ollama').value
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
});
