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
});
