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
            if (!response.ok) { // Controlla lo stato della risposta
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
        
        // Esegui l'app principale passando i dati
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
    // Il tuo codice originale da qui in poi, con le chiavi API rimosse.
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
        particleCanvasElement = document.getElementById('particle-canvas'); if (!particleCanvasElement) { return; }
        particleScene = new THREE.Scene();
        const isMobile = window.innerWidth <= mobileBreakpoint; particleCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); particleCamera.position.z = isMobile ? 35 : 40;
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
        startParticleAnimation();
    }
    function setupParticleGUI() { /* ... tuo codice ... */ }
    function updateParticleCount() { /* ... tuo codice ... */ }
    function calculateParticleTargetPositions() { /* ... tuo codice ... */ }
    async function processLogoImage(imageUrl) { /* ... tuo codice ... */ }
    function morphParticleShape(shapeIndex, instant = false) { /* ... tuo codice ... */ }
    function changeParticleColor(colorName, forceUpdate = false) { /* ... tuo codice ... */ }
    function onParticleWindowResize() { /* ... tuo codice ... */ }
    function animateParticles() {
        particleAnimationId = requestAnimationFrame(animateParticles);
        if (!particleRenderer || !particleScene || !particleCamera || !particleGeometry || !particlePoints) return;
        const elapsedTime = particleClock.getElapsedTime(); const deltaTime = particleClock.getDelta();
        const positionAttribute = particleGeometry.attributes.position; const initialPositionAttribute = particleGeometry.attributes.initialPosition;
        const colorAttribute = particleGeometry.attributes.color; const initialColorAttribute = particleGeometry.attributes.initialColor; const targetColorAttribute = particleGeometry.attributes.targetColor;
        let didUpdatePositions = false; let didUpdateColors = false;
        if (morphStartTime >= 0) { const morphElapsedTime = elapsedTime - morphStartTime; const morphProgress = Math.min(morphElapsedTime / particleParams.morphDuration, 1.0); const targetAttributeName = `targetPosition${particleShapes[currentShapeIndex]}`; const targetAttribute = particleGeometry.attributes[targetAttributeName]; if (targetAttribute) { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; positionAttribute.array[i3] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3], targetAttribute.array[i3], morphProgress); positionAttribute.array[i3 + 1] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3 + 1], targetAttribute.array[i3 + 1], morphProgress); positionAttribute.array[i3 + 2] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3 + 2], targetAttribute.array[i3 + 2], morphProgress); } didUpdatePositions = true; if (morphProgress >= 1.0) { morphStartTime = -1; } } else { morphStartTime = -1; } }
        if (colorMorphStartTime >= 0) { const colorMorphElapsedTime = elapsedTime - colorMorphStartTime; const colorMorphProgress = Math.min(colorMorphElapsedTime / particleParams.colorMorphDuration, 1.0); for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; colorAttribute.array[i3] = THREE.MathUtils.lerp(initialColorAttribute.array[i3], targetColorAttribute.array[i3], colorMorphProgress); colorAttribute.array[i3 + 1] = THREE.MathUtils.lerp(initialColorAttribute.array[i3 + 1], targetColorAttribute.array[i3 + 1], colorMorphProgress); colorAttribute.array[i3 + 2] = THREE.MathUtils.lerp(initialColorAttribute.array[i3 + 2], targetColorAttribute.array[i3 + 2], colorMorphProgress); } didUpdateColors = true; if (colorMorphProgress >= 1.0) { colorMorphStartTime = -1; } }
        if (particleParams.autorotate && morphStartTime < 0 && particlePoints) { particlePoints.rotation.y += particleParams.autoRotateSpeed * deltaTime; particlePoints.rotation.x += particleParams.autoRotateSpeed * 0.5 * deltaTime; }
        if (didUpdatePositions) { positionAttribute.needsUpdate = true; }
        if (didUpdateColors) { colorAttribute.needsUpdate = true; }
        particleRenderer.render(particleScene, particleCamera);
    }
    function startParticleAnimation() { if (particleAnimationId === null) { animateParticles(); } }
    function handleGuiToggle(event) { /* ... tuo codice ... */ }
    function autoChangeParticleShape() { /* ... tuo codice ... */ }
    function autoChangeParticleColor() { /* ... tuo codice ... */ }
    function toggleAutoShapeChange(enabled) { /* ... tuo codice ... */ }

    function loadData() {
        const configFields = airtableData.config;
        const fetchedLinks = airtableData.links;
        logoShapeCalculated = false;
        const backgroundInfo = getAttachmentInfo(configFields, fieldMap.config.backgroundAttachment);
        let showParticlesOnly = true; if (backgroundInfo && backgroundInfo.url) { showParticlesOnly = false; if (backgroundInfo.type && backgroundInfo.type.startsWith('video/')) { if (backgroundVideoContainer && backgroundVideoSource && particleCanvasElement && particleRenderer) { backgroundVideoSource.src = backgroundInfo.url; backgroundVideoSource.type = backgroundInfo.type; backgroundVideo.load(); setTimeout(() => { backgroundVideo.play().catch(e => {}); backgroundVideoContainer.style.display = 'block'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; }, 100); } } else if (backgroundInfo.type && backgroundInfo.type.startsWith('image/')) { if (particleCanvasElement && particleRenderer) { document.body.style.backgroundImage = `url('${backgroundInfo.url}')`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; } } } if (showParticlesOnly) { if (particleCanvasElement && particleRenderer) { particleRenderer.setClearColor(0x000000, 1); particleCanvasElement.style.display = 'block'; } }
        const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub'); document.title = pageTitle; if (titleElement) { titleElement.textContent = pageTitle; }
        const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl);
        logoContainer.innerHTML = ''; if (logoInfo && logoInfo.url) { const logoImg=document.createElement('img'); logoImg.src=logoInfo.url; logoImg.alt='Logo'; logoContainer.appendChild(logoImg); processLogoImage(logoInfo.url); } else { currentShapeIndex = 0; morphParticleShape(currentShapeIndex, true); }
        linkContainer.innerHTML = ''; if (fetchedLinks && fetchedLinks.length > 0) { fetchedLinks.forEach(link => { if(!link.url){return;} const button=document.createElement('a'); button.href=link.url; button.textContent=getField(link, fieldMap.links.label, 'Link'); button.className='link-button'; button.target='_top'; button.style.background=getField(link, fieldMap.links.color, defaultButtonColor); linkContainer.appendChild(button); }); } else { linkContainer.innerHTML = '<p>Nessun link attivo.</p>'; }
    }
    
    initParticles();
    loadData();
    toggleAutoShapeChange(particleParams.autoShapeChangeEnabled);
    if (autoColorChangeIntervalId) clearInterval(autoColorChangeIntervalId);
    autoColorChangeIntervalId = setInterval(autoChangeParticleColor, 7000);
}