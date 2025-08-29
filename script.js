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
            if (!response.ok) {
                throw new Error(`Accesso Negato (${response.status})`);
            }
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
    // --- LA NOSTRA "SPIA" ---
    console.log("Dati ricevuti per i pulsanti (links):", airtableData.links);

    const fieldMap = { config: { title: 'Titolo Pagina', titleSize: 'Dimensione Titolo', logoUrl: 'Logo', footerImageAlt: 'Alt Img Footer', footerImageUrl: 'Immagine Footer', backgroundAttachment: 'Sfondo', showLoader: 'Mostra Loader', loaderText: 'Testo Loader', loaderBarColor: 'Colore Barra Loader', loaderTextSize: 'Dimensione Testo Loader', loaderWidth: 'Larghezza Loader', loaderBarSpeed: 'Velocità Barra Loader', buttonFontSize: 'Dimensione Font Pulsanti', buttonPadding: 'Padding Pulsanti', showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown', countdownLabel: 'Etichetta Countdown', linkedLinks: 'Link Attivi' }, links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' } };
    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';
    const titleElement = document.getElementById('page-title'); const logoContainer = document.getElementById('logo-container'); const linkContainer = document.getElementById('link-container'); const loadingMessage = document.getElementById('loading-message'); const loader = document.getElementById('loader'); const loaderTextElement = loader ? loader.querySelector('#loading-text-container') : null; const loaderBarElement = loader ? loader.querySelector('.loader-bar') : null; const footerImageContainer = document.getElementById('footer-image-container'); const countdownContainer = document.getElementById('countdown-container'); const countdownLabelElement = document.getElementById('countdown-label'); const daysElement = document.getElementById('days'); const hoursElement = document.getElementById('hours'); const minutesElement = document.getElementById('minutes'); const secondsElement = document.getElementById('seconds'); const countdownMessageElement = document.getElementById('countdown-message'); const backgroundVideoContainer = document.getElementById('background-video-container'); const backgroundVideo = document.getElementById('background-video'); const backgroundVideoSource = backgroundVideo ? backgroundVideo.querySelector('source') : null; let countdownIntervalId = null; const toggleGuiButton = document.getElementById('toggle-gui-btn');
    let particleScene, particleCamera, particleRenderer, particlePoints, particleGui; let particleGeometry, particleMaterial; let particleTargetPositions = {}; let currentShapeIndex = -1; const particleShapes = ['Sphere', 'Cube', 'Torus', 'Spiral', 'Pyramid', 'Cylinder', 'Logo']; let morphStartTime = -1; const particleClock = new THREE.Clock();
    const particleParams = { particleCount: 5000, particleSize: 0.1, morphDuration: 2.0, autoRotateSpeed: 0.2, autorotate: true, autoShapeChangeEnabled: true, colorMorphDuration: 1.5, guiControls: { shape: 'Logo', colorPreset: 'orange' } };
    const numParticlesMax = 10000; let particleCanvasElement; let particleAnimationId = null; const mobileBreakpoint = 600;
    let autoShapeChangeIntervalId = null; let autoColorChangeIntervalId = null; const particleColorPresets = ['orange', 'purple', 'lime', 'multi']; let currentColorIndex = 0; let logoShapeCalculated = false;
    let colorMorphStartTime = -1;
    const getField = (fields, fieldName, defaultValue = null) => { return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '') ? fields[fieldName] : defaultValue; }; const getAttachmentInfo = (fields, fieldName) => { const att = getField(fields, fieldName); if (Array.isArray(att) && att.length > 0) { const fA = att[0]; let url = fA.url; if (fA.type && fA.type.startsWith('image/') && fA.thumbnails && fA.thumbnails.large) { url = fA.thumbnails.large.url; } return { url: url, type: fA.type || null, filename: fA.filename || null }; } return null; };
    function initParticles() { /* ... tuo codice originale ... */ }
    function setupParticleGUI() { /* ... tuo codice originale ... */ }
    function updateParticleCount() { /* ... tuo codice originale ... */ }
    function calculateParticleTargetPositions() { /* ... tuo codice originale ... */ }
    async function processLogoImage(imageUrl) { /* ... tuo codice originale ... */ }
    function morphParticleShape(shapeIndex, instant = false) { /* ... tuo codice originale ... */ }
    function changeParticleColor(colorName, forceUpdate = false) { /* ... tuo codice originale ... */ }
    function onParticleWindowResize() { /* ... tuo codice originale ... */ }
    function animateParticles() { /* ... tuo codice originale ... */ }
    function startParticleAnimation() { if (particleAnimationId === null) { animateParticles(); } }
    function handleGuiToggle(event) { /* ... tuo codice originale ... */ }
    function autoChangeParticleShape() { /* ... tuo codice originale ... */ }
    function autoChangeParticleColor() { /* ... tuo codice originale ... */ }
    function toggleAutoShapeChange(enabled) { /* ... tuo codice originale ... */ }

    function loadData() {
        const configFields = airtableData.config;
        const fetchedLinks = airtableData.links;
        
        // Svuota il contenitore dei link prima di aggiungerne di nuovi
        if(linkContainer) linkContainer.innerHTML = '';
        
        // --- COSTRUZIONE DEI PULSANTI ---
        if (fetchedLinks && fetchedLinks.length > 0) {
            fetchedLinks.forEach(linkFields => { // Ho rinominato la variabile in 'linkFields' per chiarezza
                if(!linkFields[fieldMap.links.url]){ return; } // Controlla che l'URL esista
                
                const button = document.createElement('a');
                button.href = linkFields[fieldMap.links.url];
                button.textContent = getField(linkFields, fieldMap.links.label, 'Link');
                button.className = 'link-button';
                button.target = '_top'; // O '_blank' se vuoi che si aprano in una nuova scheda
                button.style.background = getField(linkFields, fieldMap.links.color, defaultButtonColor);
                
                linkContainer.appendChild(button);
            });
        } else {
            if(linkContainer) linkContainer.innerHTML = '<p>Nessun link attivo.</p>';
        }

        // --- IL RESTO DELLA TUA FUNZIONE loadData ---
        // (Ho rimosso la parte dei link da qui per evitare duplicati)
        const backgroundInfo = getAttachmentInfo(configFields, fieldMap.config.backgroundAttachment);
        let showParticlesOnly = true; if (backgroundInfo && backgroundInfo.url) { showParticlesOnly = false; if (backgroundInfo.type && backgroundInfo.type.startsWith('video/')) { if (backgroundVideoContainer && backgroundVideoSource && particleCanvasElement && particleRenderer) { backgroundVideoSource.src = backgroundInfo.url; backgroundVideoSource.type = backgroundInfo.type; backgroundVideo.load(); setTimeout(() => { backgroundVideo.play().catch(e => {}); backgroundVideoContainer.style.display = 'block'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; }, 100); } } else if (backgroundInfo.type && backgroundInfo.type.startsWith('image/')) { if (particleCanvasElement && particleRenderer) { document.body.style.backgroundImage = `url('${backgroundInfo.url}')`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; } } } if (showParticlesOnly) { if (particleCanvasElement && particleRenderer) { particleRenderer.setClearColor(0x000000, 1); particleCanvasElement.style.display = 'block'; } }
        const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub'); document.title = pageTitle; if (titleElement) { titleElement.textContent = pageTitle; }
        const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl);
        logoContainer.innerHTML = ''; if (logoInfo && logoInfo.url) { const logoImg=document.createElement('img'); logoImg.src=logoInfo.url; logoImg.alt='Logo'; logoContainer.appendChild(logoImg); processLogoImage(logoInfo.url); } else { currentShapeIndex = 0; morphParticleShape(currentShapeIndex, true); }
    }
    
    // Inizializzazione
    initParticles();
    loadData();
    toggleAutoShapeChange(particleParams.autoShapeChangeEnabled);
    if (autoColorChangeIntervalId) clearInterval(autoColorChangeIntervalId);
    autoColorChangeIntervalId = setInterval(autoChangeParticleColor, 7000);
}