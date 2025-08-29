import * as THREE from 'three';
import { GUI } from 'lil-gui';

// ===================================
// LOGICA DI LOGIN E FLUSSO PRINCIPALE
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("LOGIN SCRIPT: DOMContentLoaded - Pagina caricata.");
    
    const loginLayer = document.getElementById('login-layer');
    const loadingLayer = document.getElementById('loading-layer');
    const mainContentLayer = document.getElementById('main-content-layer');
    const passcode_input = document.getElementById('passcode-input');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');

    async function init() {
        console.log("LOGIN SCRIPT: init() - Controllo sessione.");
        if (sessionStorage.getItem('isAuthenticated_v2') === 'true') {
            const storedData = sessionStorage.getItem('airtableData');
            if (storedData) {
                console.log("LOGIN SCRIPT: Utente già autenticato, avvio il contenuto principale.");
                await showMainContent(JSON.parse(storedData));
                return;
            }
        }
        console.log("LOGIN SCRIPT: Mostro il form di login.");
        loginLayer.style.display = 'flex';
        loginButton.addEventListener('click', handleLoginAttempt);
        passcode_input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLoginAttempt();
        });
    }

    async function handleLoginAttempt() {
        console.log("LOGIN SCRIPT: Tentativo di login avviato.");
        const enteredPasscode = passcode_input.value;
        if (!enteredPasscode) return;
        loginButton.disabled = true;
        loginError.style.display = 'none';
        try {
            console.log("LOGIN SCRIPT: Chiamata alla Netlify Function...");
            const response = await fetch('/.netlify/functions/check-passcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: enteredPasscode }),
            });
            console.log("LOGIN SCRIPT: Risposta ricevuta dalla funzione. Status:", response.status);
            const data = await response.json();
            if (data.success) {
                console.log("LOGIN SCRIPT: Successo! Salvo sessione e avvio contenuto.");
                sessionStorage.setItem('isAuthenticated_v2', 'true');
                sessionStorage.setItem('airtableData', JSON.stringify(data));
                await showMainContent(data);
            } else {
                throw new Error(data.message || 'Accesso Negato');
            }
        } catch (error) {
            console.error("LOGIN SCRIPT: Errore durante il login:", error);
            loginError.textContent = 'ACCESSO NEGATO';
            loginError.style.display = 'block';
            setTimeout(() => { loginError.style.display = 'none'; }, 2000);
            loginButton.disabled = false;
        }
    }

    async function showMainContent(airtableData) {
        console.log("LOGIN SCRIPT: showMainContent() - Preparo la transizione.");
        loadingLayer.style.display = 'flex';
        loginLayer.style.opacity = '0';
        setTimeout(() => { loginLayer.style.display = 'none'; }, 500);
        
        console.log("LOGIN SCRIPT: Eseguo runMainApp()...");
        runMainApp(airtableData);
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        console.log("LOGIN SCRIPT: Transizione completata, mostro il contenuto.");
        mainContentLayer.style.visibility = 'visible';
        mainContentLayer.style.opacity = '1';
        loadingLayer.style.opacity = '0';
        setTimeout(() => { loadingLayer.style.display = 'none'; }, 500);
    }
    
    init();
});

// ===================================
// APP PRINCIPALE (THREE.JS)
// ===================================
function runMainApp(airtableData) {
    console.log("MAIN APP: runMainApp() è stata chiamata con successo!");

    const fieldMap = { config: { title: 'Titolo Pagina', titleSize: 'Dimensione Titolo', logoUrl: 'Logo', footerImageAlt: 'Alt Img Footer', footerImageUrl: 'Immagine Footer', backgroundAttachment: 'Sfondo', showLoader: 'Mostra Loader', loaderText: 'Testo Loader', loaderBarColor: 'Colore Barra Loader', loaderTextSize: 'Dimensione Testo Loader', loaderWidth: 'Larghezza Loader', loaderBarSpeed: 'Velocità Barra Loader', buttonFontSize: 'Dimensione Font Pulsanti', buttonPadding: 'Padding Pulsanti', showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown', countdownLabel: 'Etichetta Countdown', linkedLinks: 'Link Attivi' }, links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' } };
    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';
    const titleElement = document.getElementById('page-title'); const logoContainer = document.getElementById('logo-container'); const linkContainer = document.getElementById('link-container'); const loadingMessage = document.getElementById('loading-message'); const loader = document.getElementById('loader'); const loaderTextElement = loader ? loader.querySelector('#loading-text-container') : null; const loaderBarElement = loader ? loader.querySelector('.loader-bar') : null; const footerImageContainer = document.getElementById('footer-image-container'); const countdownContainer = document.getElementById('countdown-container'); const countdownLabelElement = document.getElementById('countdown-label'); const daysElement = document.getElementById('days'); const hoursElement = document.getElementById('hours'); const minutesElement = document.getElementById('minutes'); const secondsElement = document.getElementById('seconds'); const countdownMessageElement = document.getElementById('countdown-message'); const backgroundVideoContainer = document.getElementById('background-video-container'); const backgroundVideo = document.getElementById('background-video'); const backgroundVideoSource = backgroundVideo ? backgroundVideo.querySelector('source') : null; let countdownIntervalId = null; const toggleGuiButton = document.getElementById('toggle-gui-btn');
    let particleScene, particleCamera, particleRenderer, particlePoints, particleGui; let particleGeometry, particleMaterial; let particleTargetPositions = {}; let currentShapeIndex = -1; const particleShapes = ['Sphere', 'Cube', 'Torus', 'Spiral', 'Pyramid', 'Cylinder', 'Logo']; let morphStartTime = -1; const particleClock = new THREE.Clock();
    const particleParams = { particleCount: 5000, particleSize: 0.1, morphDuration: 2.0, autoRotateSpeed: 0.2, autorotate: true, autoShapeChangeEnabled: true, colorMorphDuration: 1.5, guiControls: { shape: 'Logo', colorPreset: 'orange' } };
    const numParticlesMax = 10000; let particleCanvasElement; let particleAnimationId = null; const mobileBreakpoint = 600;
    let autoShapeChangeIntervalId = null; let autoColorChangeIntervalId = null; const particleColorPresets = ['orange', 'purple', 'lime', 'multi']; let currentColorIndex = 0; let logoShapeCalculated = false;
    let colorMorphStartTime = -1;
    const getField = (fields, fieldName, defaultValue = null) => { return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '') ? fields[fieldName] : defaultValue; }; const getAttachmentInfo = (fields, fieldName) => { const att = getField(fields, fieldName); if (Array.isArray(att) && att.length > 0) { const fA = att[0]; let url = fA.url; if (fA.type && fA.type.startsWith('image/') && fA.thumbnails && fA.thumbnails.large) { url = fA.thumbnails.large.url; } return { url: url, type: fA.type || null, filename: fA.filename || null }; } return null; };
    function initParticles() {
        console.log("MAIN APP: initParticles() chiamata.");
        particleCanvasElement = document.getElementById('particle-canvas'); if (!particleCanvasElement) { console.error("Particle canvas element not found!"); return; }
        particleScene = new THREE.Scene();
        const isMobile = window.innerWidth <= mobileBreakpoint; const cameraZ = isMobile ? 35 : 40;
        particleCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); particleCamera.position.z = cameraZ;
        particleRenderer = new THREE.WebGLRenderer({ canvas: particleCanvasElement, antialias: true, alpha: true }); particleRenderer.setSize(window.innerWidth, window.innerHeight); particleRenderer.setPixelRatio(window.devicePixelRatio); particleRenderer.setClearColor(0x000000, 0);
        const initialParticleSize = isMobile ? 0.1 : 0.15; particleParams.particleSize = initialParticleSize; particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(numParticlesMax * 3); const colors = new Float32Array(numParticlesMax * 3); const initialPositions = new Float32Array(numParticlesMax * 3); const initialColors = new Float32Array(numParticlesMax * 3); const targetColors = new Float32Array(numParticlesMax * 3);
        const initialColor = new THREE.Color(particleParams.guiControls.colorPreset);
        for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; positions[i3] = (Math.random() - 0.5) * 0.1; positions[i3 + 1] = (Math.random() - 0.5) * 0.1; positions[i3 + 2] = (Math.random() - 0.5) * 0.1; initialColor.toArray(colors, i3); initialColor.toArray(initialColors, i3); initialColor.toArray(targetColors, i3); initialPositions[i3] = positions[i3]; initialPositions[i3 + 1] = positions[i3 + 1]; initialPositions[i3 + 2] = positions[i3 + 2]; }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); particleGeometry.setAttribute('initialPosition', new THREE.BufferAttribute(initialPositions, 3)); particleGeometry.setAttribute('initialColor', new THREE.BufferAttribute(initialColors, 3)); particleGeometry.setAttribute('targetColor', new THREE.BufferAttribute(targetColors, 3));
        particleShapes.forEach(shapeName => { particleGeometry.setAttribute(`targetPosition${shapeName}`, new THREE.BufferAttribute(new Float32Array(numParticlesMax * 3), 3)); });
        particleMaterial = new THREE.PointsMaterial({ size: initialParticleSize, vertexColors: true, sizeAttenuation: true, depthWrite: false });
        particlePoints = new THREE.Points(particleGeometry, particleMaterial); particleScene.add(particlePoints);
        calculateParticleTargetPositions(); setupParticleGUI(); window.addEventListener('resize', onParticleWindowResize); window.addEventListener('keydown', handleGuiToggle); if(toggleGuiButton) toggleGuiButton.addEventListener('click', handleGuiToggle);
        console.log("MAIN APP: Particle system initialization complete."); startParticleAnimation();
    }
    function setupParticleGUI() { /* ... tuo codice ... */ }
    function updateParticleCount() { /* ... tuo codice ... */ }
    function calculateParticleTargetPositions() { /* ... tuo codice ... */ }
    async function processLogoImage(imageUrl) { /* ... tuo codice ... */ }
    function morphParticleShape(shapeIndex, instant = false) { /* ... tuo codice ... */ }
    function changeParticleColor(colorName, forceUpdate = false) { /* ... tuo codice ... */ }
    function onParticleWindowResize() { /* ... tuo codice ... */ }
    function animateParticles() { /* ... tuo codice ... */ }
    function startParticleAnimation() { if (particleAnimationId === null) { animateParticles(); } }
    function handleGuiToggle(event) { /* ... tuo codice ... */ }
    function autoChangeParticleShape() { /* ... tuo codice ... */ }
    function autoChangeParticleColor() { /* ... tuo codice ... */ }
    function toggleAutoShapeChange(enabled) { /* ... tuo codice ... */ }
    function loadData() {
        console.log("MAIN APP: loadData() chiamata.");
        const configFields = airtableData.config;
        const fetchedLinks = airtableData.links;
        if (loadingMessage) loadingMessage.style.display = 'block'; if (linkContainer) linkContainer.innerHTML = ''; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; if (particleCanvasElement) particleCanvasElement.style.display = 'none'; document.body.style.backgroundImage = '';
        logoShapeCalculated = false;
        const backgroundInfo = getAttachmentInfo(configFields, fieldMap.config.backgroundAttachment); let showParticlesOnly = true; if (backgroundInfo && backgroundInfo.url) { showParticlesOnly = false; if (backgroundInfo.type && backgroundInfo.type.startsWith('video/')) { if (backgroundVideoContainer && backgroundVideoSource && particleCanvasElement && particleRenderer) { backgroundVideoSource.src = backgroundInfo.url; backgroundVideoSource.type = backgroundInfo.type; backgroundVideo.load(); setTimeout(() => { backgroundVideo.play().catch(e => {}); backgroundVideoContainer.style.display = 'block'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; }, 100); document.body.style.backgroundImage = 'none'; } } else if (backgroundInfo.type && backgroundInfo.type.startsWith('image/')) { if (particleCanvasElement && particleRenderer) { document.body.style.backgroundImage = `url('${backgroundInfo.url}')`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; } } else { showParticlesOnly = true; } } if (showParticlesOnly) { if (particleCanvasElement && particleRenderer) { document.body.style.backgroundImage = 'none'; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; particleRenderer.setClearColor(0x000000, 1); particleCanvasElement.style.display = 'block'; } }
        const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub'); document.title = pageTitle; if (titleElement) { titleElement.textContent = pageTitle; const ts = getField(configFields, fieldMap.config.titleSize); titleElement.style.fontSize = ts || ''; }
        if (countdownIntervalId) clearInterval(countdownIntervalId); if (countdownContainer) countdownContainer.style.display = 'none'; if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'block'; if (countdownLabelElement) countdownLabelElement.style.display = 'block'; if (countdownMessageElement) countdownMessageElement.style.display = 'none'; const showCountdown = getField(configFields, fieldMap.config.showCountdown, false); const countdownTargetStr = getField(configFields, fieldMap.config.countdownTarget); const countdownLabel = getField(configFields, fieldMap.config.countdownLabel, ''); if (countdownContainer && showCountdown === true && countdownTargetStr) { const targetDate = new Date(countdownTargetStr); if (!isNaN(targetDate)) { if (countdownLabelElement) countdownLabelElement.textContent = countdownLabel; const updateCountdown = () => { const now = new Date().getTime(); const dist = targetDate.getTime() - now; if (dist < 0) { clearInterval(countdownIntervalId); if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'none'; if (countdownLabelElement) countdownLabelElement.style.display = 'none'; if (countdownMessageElement) { countdownMessageElement.textContent = "Tempo Scaduto!"; countdownMessageElement.style.display = 'block'; } return; } const d = Math.floor(dist / 864e5); const h = Math.floor((dist % 864e5) / 36e5); const m = Math.floor((dist % 36e5) / 6e4); const s = Math.floor((dist % 6e4) / 1e3); if (daysElement) daysElement.textContent = String(d).padStart(2, '0'); if (hoursElement) hoursElement.textContent = String(h).padStart(2, '0'); if (minutesElement) minutesElement.textContent = String(m).padStart(2, '0'); if (secondsElement) secondsElement.textContent = String(s).padStart(2, '0'); if (countdownContainer.style.display === 'none') { countdownContainer.style.display = 'block'; } }; updateCountdown(); countdownIntervalId = setInterval(updateCountdown, 1000); } else { if (countdownContainer) countdownContainer.style.display = 'none'; } } else { if (countdownContainer) countdownContainer.style.display = 'none'; }
        const showLoader = getField(configFields, fieldMap.config.showLoader, false); if (loader) { if (showLoader) { loader.style.display = 'flex'; const lt=getField(configFields, fieldMap.config.loaderText,''); const lbc=getField(configFields, fieldMap.config.loaderBarColor); const lts=getField(configFields, fieldMap.config.loaderTextSize); const lw=getField(configFields, fieldMap.config.loaderWidth); const lbs=getField(configFields, fieldMap.config.loaderBarSpeed); if(loaderTextElement)loaderTextElement.textContent=lt; if(loaderBarElement)loaderBarElement.style.background=lbc||''; if(loaderTextElement)loaderTextElement.style.fontSize=lts||''; if(loader){loader.style.width=lw||'';loader.style.maxWidth=lw?'none':'';} if(loaderBarElement)loaderBarElement.style.animationDuration=(typeof lbs==='number'&&lbs>0)?`${lbs}s`:''; } else { loader.style.display = 'none'; } }
        const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl);
        logoContainer.innerHTML = ''; if (logoInfo && logoInfo.url) { const logoImg=document.createElement('img'); logoImg.src=logoInfo.url; logoImg.alt='Logo'; logoContainer.appendChild(logoImg); processLogoImage(logoInfo.url); } else { logoShapeCalculated = false; currentShapeIndex = 0; morphParticleShape(currentShapeIndex, true); if (particleGui) particleGui.controllers.find(c => c.property === 'shape')?.setValue(particleShapes[0]); particleParams.guiControls.shape = particleShapes[0]; }
        linkContainer.innerHTML = ''; if (fetchedLinks && fetchedLinks.length > 0) { const bfz=getField(configFields, fieldMap.config.buttonFontSize); const bp=getField(configFields, fieldMap.config.buttonPadding); fetchedLinks.forEach(link => { if(!link.url){return;} const button=document.createElement('a'); button.href=link.url; button.textContent=getField(link, fieldMap.links.label, 'Link'); button.className='link-button'; button.target='_top'; button.style.background=getField(link, fieldMap.links.color, defaultButtonColor); button.style.fontSize=bfz||''; button.style.padding=bp||''; linkContainer.appendChild(button); }); } else { linkContainer.innerHTML = '<p>Nessun link attivo.</p>'; }
        const footerImageInfo = getAttachmentInfo(configFields, fieldMap.config.footerImageUrl); if (footerImageContainer) { footerImageContainer.innerHTML = ''; if (footerImageInfo && footerImageInfo.url) { const alt=getField(configFields, fieldMap.config.footerImageAlt,'Img Footer'); const footerImg=document.createElement('img'); footerImg.src=footerImageInfo.url; footerImg.alt=alt; footerImageContainer.appendChild(footerImg); } }
        if (loadingMessage) loadingMessage.style.display = 'none';
        console.log("MAIN APP: Dati caricati e applicati.");
    }
    
    console.log("MAIN APP: Avvio l'inizializzazione...");
    initParticles();
    loadData();
    toggleAutoShapeChange(particleParams.autoShapeChangeEnabled);
    if (autoColorChangeIntervalId) clearInterval(autoColorChangeIntervalId);
    autoColorChangeIntervalId = setInterval(autoChangeParticleColor, 7000);
}