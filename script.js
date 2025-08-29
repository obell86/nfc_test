import * as THREE from 'three';
import { GUI } from 'lil-gui';

// ===================================
// PARTE 1: LOGICA DI LOGIN E FLUSSO
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    const loginLayer = document.getElementById('login-layer');
    const loadingLayer = document.getElementById('loading-layer');
    const mainContentLayer = document.getElementById('main-content-layer');
    const passcode_input = document.getElementById('passcode-input');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');

    async function init() {
        if (sessionStorage.getItem('isAuthenticated_v2') === 'true') {
            const storedData = sessionStorage.getItem('airtableData');
            if (storedData) {
                await showMainContent(JSON.parse(storedData));
                return;
            }
        }
        loginLayer.style.display = 'flex';
        loginButton.addEventListener('click', handleLoginAttempt);
        passcode_input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLoginAttempt();
        });
    }

    async function handleLoginAttempt() {
        const enteredPasscode = passcode_input.value;
        if (!enteredPasscode) return;
        loginButton.disabled = true;
        loginError.style.display = 'none';
        try {
            const response = await fetch('/.netlify/functions/check-passcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: enteredPasscode }),
            });
            if (!response.ok) { throw new Error(`Accesso Negato (${response.status})`); }
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('isAuthenticated_v2', 'true');
                sessionStorage.setItem('airtableData', JSON.stringify(data));
                await showMainContent(data);
            } else {
                throw new Error('Passcode non valido');
            }
        } catch (error) {
            loginError.textContent = 'ACCESSO NEGATO';
            loginError.style.display = 'block';
            setTimeout(() => { loginError.style.display = 'none'; }, 2000);
            loginButton.disabled = false;
        }
    }

    async function showMainContent(airtableData) {
        loadingLayer.style.display = 'flex';
        loginLayer.style.opacity = '0';
        setTimeout(() => { loginLayer.style.display = 'none'; }, 500);
        
        runMainApp(airtableData);
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        mainContentLayer.style.visibility = 'visible';
        mainContentLayer.style.opacity = '1';
        loadingLayer.style.opacity = '0';
        setTimeout(() => { loadingLayer.style.display = 'none'; }, 500);
    }
    
    init();
});

// ===================================
// PARTE 2: APP PRINCIPALE (THREE.JS)
// ===================================
function runMainApp(airtableData) {
    // --- Mappatura Campi ---
    const fieldMap = { config: { title: 'Titolo Pagina', logoUrl: 'Logo', backgroundAttachment: 'Sfondo', linkedLinks: 'Link Attivi', showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown', countdownLabel: 'Etichetta Countdown' }, links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' } };
    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';
    
    // --- Elementi DOM ---
    const titleElement = document.getElementById('page-title'); const logoContainer = document.getElementById('logo-container'); const linkContainer = document.getElementById('link-container'); const backgroundVideoContainer = document.getElementById('background-video-container'); const backgroundVideo = document.getElementById('background-video'); const backgroundVideoSource = backgroundVideo ? backgroundVideo.querySelector('source') : null; const countdownContainer = document.getElementById('countdown-container'); const countdownLabelElement = document.getElementById('countdown-label'); const daysElement = document.getElementById('days'); const hoursElement = document.getElementById('hours'); const minutesElement = document.getElementById('minutes'); const secondsElement = document.getElementById('seconds'); const countdownMessageElement = document.getElementById('countdown-message'); let countdownIntervalId = null; const toggleGuiButton = document.getElementById('toggle-gui-btn');
    
    // --- Variabili Globali ---
    let particleScene, particleCamera, particleRenderer, particlePoints, particleGui, particleMaterial; const particleClock = new THREE.Clock(); let particleCanvasElement;
    // ... e il resto delle tue variabili globali ...

    // --- Funzioni Helper ---
    const getField = (fields, fieldName, defaultValue = null) => { return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '') ? fields[fieldName] : defaultValue; };
    const getAttachmentInfo = (fields, fieldName) => { const att = getField(fields, fieldName); if (Array.isArray(att) && att.length > 0) { const fA = att[0]; let url = fA.url; if (fA.type && fA.type.startsWith('image/') && fA.thumbnails && fA.thumbnails.large) { url = fA.thumbnails.large.url; } return { url: url, type: fA.type || null, filename: fA.filename || null }; } return null; };

    // --- Funzioni Particelle ---
    // (Qui dentro ci va tutto il tuo codice originale per le particelle, da initParticles a toggleAutoShapeChange)
    function initParticles() { /* ... tuo codice ... */ }
    // ... etc ...
    function toggleAutoShapeChange(enabled) { /* ... tuo codice ... */ }

    // --- Funzione Principale di Caricamento Dati ---
    function loadData() {
        const configFields = airtableData.config;
        const fetchedLinks = airtableData.links;
        
        // --- GESTIONE SFONDO ---
        if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none';
        if (particleCanvasElement) particleCanvasElement.style.display = 'none';
        document.body.style.backgroundImage = '';
        const backgroundInfo = getAttachmentInfo(configFields, fieldMap.config.backgroundAttachment);
        let showParticlesOnly = true;
        if (backgroundInfo && backgroundInfo.url) {
            showParticlesOnly = false;
            if (backgroundInfo.type && backgroundInfo.type.startsWith('video/')) {
                if (backgroundVideoContainer && backgroundVideoSource && particleCanvasElement && particleRenderer) {
                    backgroundVideoSource.src = backgroundInfo.url;
                    backgroundVideoSource.type = backgroundInfo.type;
                    backgroundVideo.load();
                    setTimeout(() => {
                        backgroundVideo.play().catch(e => {});
                        backgroundVideoContainer.style.display = 'block';
                        particleRenderer.setClearColor(0x000000, 0);
                        particleCanvasElement.style.display = 'block';
                    }, 100);
                }
            } else if (backgroundInfo.type && backgroundInfo.type.startsWith('image/')) {
                if (particleCanvasElement && particleRenderer) {
                    document.body.style.backgroundImage = `url('${backgroundInfo.url}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    particleRenderer.setClearColor(0x000000, 0);
                    particleCanvasElement.style.display = 'block';
                }
            } else {
                showParticlesOnly = true;
            }
        }
        if (showParticlesOnly) {
            if (particleCanvasElement && particleRenderer) {
                particleRenderer.setClearColor(0x000000, 1);
                particleCanvasElement.style.display = 'block';
            }
        }

        // --- TITOLO E LOGO ---
        const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub');
        document.title = pageTitle;
        if (titleElement) { titleElement.textContent = pageTitle; }
        const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl);
        if(logoContainer) logoContainer.innerHTML = '';
        if (logoInfo && logoInfo.url) {
            const logoImg = document.createElement('img');
            logoImg.src = logoInfo.url;
            logoImg.alt = 'Logo';
            if(logoContainer) logoContainer.appendChild(logoImg);
            processLogoImage(logoInfo.url);
        } else {
            // Se non c'è logo, imposta una forma di default per le particelle
            if(typeof morphParticleShape === 'function') {
                morphParticleShape(0, true); // 0 è l'indice di 'Sphere'
            }
        }

        // --- PULSANTI ---
        if(linkContainer) linkContainer.innerHTML = '';
        if (fetchedLinks && fetchedLinks.length > 0) {
            fetchedLinks.forEach(linkFields => {
                const url = linkFields[fieldMap.links.url];
                if (!url) { return; }
                const button = document.createElement('a');
                button.href = url;
                button.textContent = getField(linkFields, fieldMap.links.label, 'Link');
                button.className = 'link-button';
                button.target = '_top';
                button.style.background = getField(linkFields, fieldMap.links.color, defaultButtonColor);
                if(linkContainer) linkContainer.appendChild(button);
            });
        } else {
            if(linkContainer) linkContainer.innerHTML = '<p>Nessun link attivo.</p>';
        }

        // --- GESTIONE COUNTDOWN (AGGIUNTA E CORRETTA) ---
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        if (countdownContainer) countdownContainer.style.display = 'none';
        
        const showCountdown = getField(configFields, fieldMap.config.showCountdown, false);
        const countdownTargetStr = getField(configFields, fieldMap.config.countdownTarget);
        const countdownLabel = getField(configFields, fieldMap.config.countdownLabel, '');

        if (countdownContainer && showCountdown === true && countdownTargetStr) {
            const targetDate = new Date(countdownTargetStr);
            if (!isNaN(targetDate) && targetDate.getTime() > Date.now()) {
                if (countdownLabelElement) countdownLabelElement.textContent = countdownLabel;
                
                const updateCountdown = () => {
                     const now = new Date().getTime();
                     const distance = targetDate.getTime() - now;
                     if(distance < 0){
                         clearInterval(countdownIntervalId);
                         if(document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'none';
                         if(countdownLabelElement) countdownLabelElement.style.display = 'none';
                         if(countdownMessageElement) { countdownMessageElement.textContent = "Tempo Scaduto!"; countdownMessageElement.style.display = 'block'; }
                         return;
                     }
                     const d = Math.floor(distance / 864e5);
                     const h = Math.floor((distance % 864e5) / 36e5);
                     const m = Math.floor((distance % 36e5) / 6e4);
                     const s = Math.floor((distance % 6e4) / 1e3);
                     if (daysElement) daysElement.textContent = String(d).padStart(2, '0');
                     if (hoursElement) hoursElement.textContent = String(h).padStart(2, '0');
                     if (minutesElement) minutesElement.textContent = String(m).padStart(2, '0');
                     if (secondsElement) secondsElement.textContent = String(s).padStart(2, '0');
                };

                // Mostra il contenitore e avvia l'intervallo
                countdownContainer.style.display = 'block';
                updateCountdown();
                countdownIntervalId = setInterval(updateCountdown, 1000);
            }
        }
    }
    
    // --- Inizializzazione ---
    // Ricopia qui dentro il codice completo delle tue funzioni per le particelle
    // da initParticles a toggleAutoShapeChange
    function initParticles(){/*...tuo codice completo...*/}
    function setupParticleGUI(){/*...tuo codice completo...*/}
    function updateParticleCount(){/*...tuo codice completo...*/}
    // etc...

    // Avvio dell'applicazione principale
    initParticles();
    loadData();
    // Ricopia qui le tue chiamate di avvio come toggleAutoShapeChange(...) etc.
}