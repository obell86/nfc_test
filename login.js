// login.js

document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi DOM dei livelli
    const loginLayer = document.getElementById('login-layer');
    const loadingLayer = document.getElementById('loading-layer');
    const mainContentLayer = document.getElementById('main-content-layer');
    
    // Riferimenti agli elementi del form
    const passcode_input = document.getElementById('passcode-input');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');

    // Funzione principale di avvio
    async function init() {
        // Controlla se l'utente è già autenticato nella sessione corrente
        if (sessionStorage.getItem('isAuthenticated_v2') === 'true') {
            const storedData = sessionStorage.getItem('airtableData');
            if (storedData) {
                // Se abbiamo i dati salvati, avvia subito il sito
                await showMainContent(JSON.parse(storedData));
                return;
            }
        }

        // Altrimenti, mostra il form di login e attendi l'interazione
        loginLayer.style.display = 'flex';
        loginButton.addEventListener('click', handleLoginAttempt);
        passcode_input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLoginAttempt();
        });
    }

    // Gestisce il tentativo di login
    async function handleLoginAttempt() {
        const enteredPasscode = passcode_input.value;
        if (!enteredPasscode) return;

        loginButton.disabled = true;
        loginError.style.display = 'none';

        try {
            // Chiama il nostro "mini-server" (Netlify Function)
            const response = await fetch('/.netlify/functions/check-passcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: enteredPasscode }),
            });

            const data = await response.json();

            if (data.success) {
                // PASSCODE CORRETTO
                sessionStorage.setItem('isAuthenticated_v2', 'true');
                // Salva i dati ricevuti da Airtable per non doverli ricaricare
                sessionStorage.setItem('airtableData', JSON.stringify(data));
                await showMainContent(data);
            } else {
                // PASSCODE ERRATO
                throw new Error(data.message || 'Accesso Negato');
            }

        } catch (error) {
            loginError.textContent = 'ACCESSO NEGATO';
            loginError.style.display = 'block';
            setTimeout(() => { loginError.style.display = 'none'; }, 2000);
            loginButton.disabled = false;
        }
    }

    // Gestisce la transizione dei livelli e l'avvio del sito principale
    async function showMainContent(airtableData) {
        // 1. Mostra il livello di caricamento e nascondi il login
        loadingLayer.style.display = 'flex';
        loginLayer.style.opacity = '0';
        setTimeout(() => { loginLayer.style.display = 'none'; }, 500);

        // 2. Carica dinamicamente lo script pesante delle particelle
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'script.js';
        document.body.appendChild(script);

        // 3. Attendi che lo script sia caricato e che l'app principale sia pronta
        script.onload = async () => {
            if (window.runMainApp) {
                // Passa i dati di Airtable all'app principale
                window.runMainApp(airtableData);
                
                // Simula un caricamento per l'effetto scenico
                await new Promise(resolve => setTimeout(resolve, 2500)); 

                // 4. Mostra il contenuto principale e nascondi il caricamento
                mainContentLayer.style.visibility = 'visible';
                mainContentLayer.style.opacity = '1';
                loadingLayer.style.opacity = '0';
                setTimeout(() => { loadingLayer.style.display = 'none'; }, 500);
            }
        };
    }

    // Avvia l'applicazione di login
    init();
});