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
    const fieldMap = { config: { title: 'Titolo Pagina', titleSize: 'Dimensione Titolo', logoUrl: 'Logo', footerImageAlt: 'Alt Img Footer', footerImageUrl: 'Immagine Footer', backgroundAttachment: 'Sfondo', showLoader: 'Mostra Loader', loaderText: 'Testo Loader', loaderBarColor: 'Colore Barra Loader', loaderTextSize: 'Dimensione Testo Loader', loaderWidth: 'Larghezza Loader', loaderBarSpeed: 'Velocità Barra Loader', buttonFontSize: 'Dimensione Font Pulsanti', buttonPadding: 'Padding Pulsanti', showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown', countdownLabel: 'Etichetta Countdown', linkedLinks: 'Link Attivi' }, links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' } };
    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';
    
    // --- Elementi DOM ---
    const titleElement = document.getElementById('page-title'); const logoContainer = document.getElementById('logo-container'); const linkContainer = document.getElementById('link-container'); const loadingMessage = document.getElementById('loading-message'); const loader = document.getElementById('loader'); const loaderTextElement = loader ? loader.querySelector('#loading-text-container') : null; const loaderBarElement = loader ? loader.querySelector('.loader-bar') : null; const footerImageContainer = document.getElementById('footer-image-container'); const countdownContainer = document.getElementById('countdown-container'); const countdownLabelElement = document.getElementById('countdown-label'); const daysElement = document.getElementById('days'); const hoursElement = document.getElementById('hours'); const minutesElement = document.getElementById('minutes'); const secondsElement = document.getElementById('seconds'); const countdownMessageElement = document.getElementById('countdown-message'); const backgroundVideoContainer = document.getElementById('background-video-container'); const backgroundVideo = document.getElementById('background-video'); const backgroundVideoSource = backgroundVideo ? backgroundVideo.querySelector('source') : null; let countdownIntervalId = null; const toggleGuiButton = document.getElementById('toggle-gui-btn');
    
    // --- Variabili Globali ---
    let particleScene, particleCamera, particleRenderer, particlePoints, particleGui, particleMaterial; let particleTargetPositions = {}; let currentShapeIndex = -1; const particleShapes = ['Sphere', 'Cube', 'Torus', 'Spiral', 'Pyramid', 'Cylinder', 'Logo']; let morphStartTime = -1; const particleClock = new THREE.Clock();
    const particleParams = { particleCount: 5000, particleSize: 0.1, morphDuration: 2.0, autoRotateSpeed: 0.2, autorotate: true, autoShapeChangeEnabled: true, colorMorphDuration: 1.5, guiControls: { shape: 'Logo', colorPreset: 'orange' } };
    const numParticlesMax = 10000; let particleCanvasElement; let particleAnimationId = null; const mobileBreakpoint = 600;
    let autoShapeChangeIntervalId = null; let autoColorChangeIntervalId = null; const particleColorPresets = ['orange', 'purple', 'lime', 'multi']; let currentColorIndex = 0; let logoShapeCalculated = false;
    let colorMorphStartTime = -1;

    // --- Funzioni Helper ---
    const getField = (fields, fieldName, defaultValue = null) => { return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '') ? fields[fieldName] : defaultValue; };
    const getAttachmentInfo = (fields, fieldName) => { const att = getField(fields, fieldName); if (Array.isArray(att) && att.length > 0) { const fA = att[0]; let url = fA.url; if (fA.type && fA.type.startsWith('image/') && fA.thumbnails && fA.thumbnails.large) { url = fA.thumbnails.large.url; } return { url: url, type: fA.type || null, filename: fA.filename || null }; } return null; };

    // --- Funzioni Particelle ---
    function initParticles() {
        console.log("Initializing particle system...");
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
        console.log("Particle system initialization complete."); startParticleAnimation();
    }
    function setupParticleGUI() {
        if (particleGui) particleGui.destroy();
        particleGui = new GUI(); particleGui.title("Particles (H / ⚙️)");
        particleGui.add(particleParams, 'particleCount', 100, numParticlesMax, 1).name('Count').onChange(updateParticleCount);
        particleGui.add(particleParams, 'particleSize', 0.01, 1, 0.01).name('Size').onChange(value => { if (particleMaterial) particleMaterial.size = value; });
        particleGui.add(particleParams, 'morphDuration', 0.5, 5, 0.1).name('Shape Morph (s)');
        particleGui.add(particleParams, 'colorMorphDuration', 0.2, 4, 0.1).name('Color Morph (s)');
        particleGui.add(particleParams, 'autorotate').name('Auto Rotate');
        particleGui.add(particleParams, 'autoRotateSpeed', 0, 1, 0.05).name('Rotate Speed');
        particleGui.add(particleParams, 'autoShapeChangeEnabled').name('Auto Shape').onChange(toggleAutoShapeChange);
        particleGui.add(particleParams.guiControls, 'shape', particleShapes).name('Shape').onChange(value => { const newIndex = particleShapes.indexOf(value); if (newIndex !== -1) { if (value === 'Logo' && !logoShapeCalculated) { console.warn("Logo shape not ready yet, skipping morph."); return; } currentShapeIndex = newIndex; morphParticleShape(currentShapeIndex); } });
        particleGui.add(particleParams.guiControls, 'colorPreset', particleColorPresets).name('Color Preset').onChange(value => { changeParticleColor(value); });
        particleGui.controllers.find(c => c.property === 'particleSize')?.setValue(particleParams.particleSize);
        particleGui.controllers.find(c => c.property === 'shape')?.setValue(particleParams.guiControls.shape);
        particleGui.domElement.style.display = 'none'; console.log("Particle GUI initialized hidden. Press 'H' or click ⚙️ to show.");
    }
    function updateParticleCount() { if (!particleGeometry) return; console.log("Updating particle count to:", particleParams.particleCount); calculateParticleTargetPositions(); changeParticleColor(particleParams.guiControls.colorPreset, true); morphParticleShape(currentShapeIndex, true); particleGeometry.setDrawRange(0, particleParams.particleCount); console.log("Particle count updated."); }
    function calculateParticleTargetPositions() { const isMobile = window.innerWidth <= mobileBreakpoint; const baseRadius = isMobile ? 12 : 15; const height = baseRadius * 1.5; const getTargetBuffer = (shapeName) => particleGeometry.attributes[`targetPosition${shapeName}`].array; const targets = { Sphere: getTargetBuffer('Sphere'), Cube: getTargetBuffer('Cube'), Torus: getTargetBuffer('Torus'), Spiral: getTargetBuffer('Spiral'), Pyramid: getTargetBuffer('Pyramid'), Cylinder: getTargetBuffer('Cylinder') }; for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; const phiS = Math.acos(-1 + (2 * i) / particleParams.particleCount); const thetaS = Math.sqrt(particleParams.particleCount * Math.PI) * phiS; targets.Sphere[i3]=baseRadius*Math.sin(phiS)*Math.cos(thetaS); targets.Sphere[i3+1]=baseRadius*Math.sin(phiS)*Math.sin(thetaS); targets.Sphere[i3+2]=baseRadius*Math.cos(phiS); const hsC = baseRadius*0.8; const sideC=Math.floor(Math.random()*6); const xC=(Math.random()-0.5)*2*hsC; const yC=(Math.random()-0.5)*2*hsC; if(sideC===0){targets.Cube[i3]=xC; targets.Cube[i3+1]=yC; targets.Cube[i3+2]=hsC;} else if(sideC===1){targets.Cube[i3]=xC; targets.Cube[i3+1]=yC; targets.Cube[i3+2]=-hsC;} else if(sideC===2){targets.Cube[i3]=hsC; targets.Cube[i3+1]=xC; targets.Cube[i3+2]=yC;} else if(sideC===3){targets.Cube[i3]=-hsC; targets.Cube[i3+1]=xC; targets.Cube[i3+2]=yC;} else if(sideC===4){targets.Cube[i3]=xC; targets.Cube[i3+1]=hsC; targets.Cube[i3+2]=yC;} else{targets.Cube[i3]=xC; targets.Cube[i3+1]=-hsC; targets.Cube[i3+2]=yC;} const trT=baseRadius*0.7; const turT=baseRadius*0.3; const uT=Math.random()*Math.PI*2; const vT=Math.random()*Math.PI*2; targets.Torus[i3]=(trT+turT*Math.cos(vT))*Math.cos(uT); targets.Torus[i3+1]=(trT+turT*Math.cos(vT))*Math.sin(uT); targets.Torus[i3+2]=turT*Math.sin(vT); const turnsSp=5; const spreadSp=baseRadius*1.5; const tSp=(i/(particleParams.particleCount-1)); const angleSp=tSp*Math.PI*2*turnsSp; const rSp=tSp*spreadSp*0.5; targets.Spiral[i3]=rSp*Math.cos(angleSp); targets.Spiral[i3+1]=rSp*Math.sin(angleSp); targets.Spiral[i3+2]=(tSp-0.5)*spreadSp*0.7; const yP = (Math.random() - 0.5) * height; const scaleFactor = (height / 2 - yP) / height; const xP_base = (Math.random() - 0.5) * baseRadius * 2; const zP_base = (Math.random() - 0.5) * baseRadius * 2; targets.Pyramid[i3] = xP_base * scaleFactor; targets.Pyramid[i3+1] = yP; targets.Pyramid[i3+2] = zP_base * scaleFactor; const cylRadius = baseRadius * 0.6; const cylHeight = height; const capRatio = 0.1; const randCy = Math.random(); const angleCy = Math.random() * Math.PI * 2; if (randCy < capRatio) { const rCy = Math.sqrt(Math.random()) * cylRadius; targets.Cylinder[i3] = rCy * Math.cos(angleCy); targets.Cylinder[i3+1] = cylHeight / 2; targets.Cylinder[i3+2] = rCy * Math.sin(angleCy); } else if (randCy < capRatio * 2) { const rCy = Math.sqrt(Math.random()) * cylRadius; targets.Cylinder[i3] = rCy * Math.cos(angleCy); targets.Cylinder[i3+1] = -cylHeight / 2; targets.Cylinder[i3+2] = rCy * Math.sin(angleCy); } else { targets.Cylinder[i3] = cylRadius * Math.cos(angleCy); targets.Cylinder[i3+1] = (Math.random() - 0.5) * cylHeight; targets.Cylinder[i3+2] = cylRadius * Math.sin(angleCy); } } particleShapes.filter(s => s !== 'Logo').forEach(shapeName => { const attr = particleGeometry.attributes[`targetPosition${shapeName}`]; if (attr) attr.needsUpdate = true; }); }
    async function processLogoImage(imageUrl) { if (!imageUrl || !particleGeometry) return; console.log("Processing logo image:", imageUrl); logoShapeCalculated = false; try { const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => { console.log("Logo image loaded."); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true }); const maxDim = 100; let imgWidth = img.width; let imgHeight = img.height; if (imgWidth > maxDim || imgHeight > maxDim) { const ratio = Math.min(maxDim / imgWidth, maxDim / imgHeight); imgWidth *= ratio; imgHeight *= ratio; } canvas.width = Math.round(imgWidth); canvas.height = Math.round(imgHeight); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data; const pixelCoords = []; const alphaThreshold = 120; for (let y = 0; y < canvas.height; y++) { for (let x = 0; x < canvas.width; x++) { const index = (y * canvas.width + x) * 4; const alpha = data[index + 3]; if (alpha > alphaThreshold) { pixelCoords.push({ x, y }); } } } console.log(`Found ${pixelCoords.length} valid pixels in logo.`); if (pixelCoords.length === 0) { console.warn("No valid pixels found in logo image."); currentShapeIndex = 0; morphParticleShape(currentShapeIndex, true); if(particleGui) particleGui.controllers.find(c => c.property === 'shape')?.setValue(particleShapes[0]); return; } const targetBuffer = particleGeometry.attributes.targetPositionLogo.array; const logoScale = 20; const depth = 2; for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; const coord = pixelCoords[Math.floor(Math.random() * pixelCoords.length)]; targetBuffer[i3] = (coord.x / canvas.width - 0.5) * logoScale; targetBuffer[i3 + 1] = -(coord.y / canvas.height - 0.5) * logoScale; targetBuffer[i3 + 2] = (Math.random() - 0.5) * depth; } particleGeometry.attributes.targetPositionLogo.needsUpdate = true; logoShapeCalculated = true; console.log("Logo particle positions calculated."); currentShapeIndex = particleShapes.indexOf('Logo'); morphParticleShape(currentShapeIndex, true); if(particleGui) particleGui.controllers.find(c => c.property === 'shape')?.setValue('Logo'); }; img.onerror = (err) => { console.error("Error loading logo image:", err); logoShapeCalculated = false; currentShapeIndex = 0; morphParticleShape(currentShapeIndex, true); if(particleGui) particleGui.controllers.find(c => c.property === 'shape')?.setValue(particleShapes[0]); }; img.src = imageUrl; } catch (error) { console.error("Error in processLogoImage:", error); logoShapeCalculated = false; currentShapeIndex = 0; morphParticleShape(currentShapeIndex, true); if(particleGui) particleGui.controllers.find(c => c.property === 'shape')?.setValue(particleShapes[0]); } }
    function morphParticleShape(shapeIndex, instant = false) { if (shapeIndex < 0 || shapeIndex >= particleShapes.length) { console.error("Invalid shape index:", shapeIndex); return; } const shapeName = particleShapes[shapeIndex]; if (shapeName === 'Logo' && !logoShapeCalculated) { console.warn("Logo shape not calculated yet, cannot morph."); return; } const targetAttributeName = `targetPosition${shapeName}`; if (!particleGeometry || !particleGeometry.attributes[targetAttributeName]) { console.error(`Target attribute ${targetAttributeName} not found!`); return; } const targetPosArray = particleGeometry.attributes[targetAttributeName].array; const currentPosAttr = particleGeometry.attributes.position; const initialPosAttr = particleGeometry.attributes.initialPosition; if (instant) { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; currentPosAttr.array[i3] = targetPosArray[i3]; currentPosAttr.array[i3 + 1] = targetPosArray[i3 + 1]; currentPosAttr.array[i3 + 2] = targetPosArray[i3 + 2]; } currentPosAttr.needsUpdate = true; morphStartTime = -1; } else { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; initialPosAttr.array[i3] = currentPosAttr.array[i3]; initialPosAttr.array[i3 + 1] = currentPosAttr.array[i3 + 1]; initialPosAttr.array[i3 + 2] = currentPosAttr.array[i3 + 2]; } initialPosAttr.needsUpdate = true; morphStartTime = particleClock.getElapsedTime(); } particleGeometry.setDrawRange(0, particleParams.particleCount); }
    function changeParticleColor(colorName, forceUpdate = false) { if (!particleGeometry || !particleGeometry.attributes.color) return; if (forceUpdate) { console.log(`Forcing particle color update to ${colorName}`); particleParams.guiControls.colorPreset = colorName; const colorAttribute = particleGeometry.attributes.color; const initialColorAttribute = particleGeometry.attributes.initialColor; const targetColorAttribute = particleGeometry.attributes.targetColor; const tempColor = new THREE.Color(); let needsUpdate = false; if (colorName === 'multi') { for (let i = 0; i < particleParams.particleCount; i++) { tempColor.setHSL(Math.random(), 0.9, 0.6); tempColor.toArray(colorAttribute.array, i * 3); tempColor.toArray(initialColorAttribute.array, i*3); tempColor.toArray(targetColorAttribute.array, i*3); } needsUpdate = true; } else { try { tempColor.set(colorName); } catch (e) { console.warn(`Invalid color "${colorName}", defaulting.`); tempColor.set('orange'); particleParams.guiControls.colorPreset = 'orange'; if(particleGui) particleGui.controllers.find(c => c.property === 'colorPreset')?.setValue('orange'); } for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; if (colorAttribute.array[i3] !== tempColor.r || colorAttribute.array[i3+1] !== tempColor.g || colorAttribute.array[i3+2] !== tempColor.b) { tempColor.toArray(colorAttribute.array, i3); tempColor.toArray(initialColorAttribute.array, i3); tempColor.toArray(targetColorAttribute.array, i3); needsUpdate = true; } else { tempColor.toArray(initialColorAttribute.array, i3); tempColor.toArray(targetColorAttribute.array, i3); } } } if (needsUpdate) { colorAttribute.needsUpdate = true; initialColorAttribute.needsUpdate = true; targetColorAttribute.needsUpdate = true; } colorMorphStartTime = -1; return; } if (colorName === particleParams.guiControls.colorPreset && colorMorphStartTime < 0) return; console.log(`Preparing color morph to ${colorName}`); particleParams.guiControls.colorPreset = colorName; const currentColorAttr = particleGeometry.attributes.color; const initialColorAttr = particleGeometry.attributes.initialColor; const targetColorAttr = particleGeometry.attributes.targetColor; const tempColor = new THREE.Color(); initialColorAttr.array.set(currentColorAttr.array); initialColorAttr.needsUpdate = true; if (colorName === 'multi') { for (let i = 0; i < particleParams.particleCount; i++) { tempColor.setHSL(Math.random(), 0.9, 0.6); tempColor.toArray(targetColorAttr.array, i * 3); } } else { try { tempColor.set(colorName); } catch (e) { console.warn(`Invalid color "${colorName}" during morph prep, defaulting.`); tempColor.set('orange'); particleParams.guiControls.colorPreset = 'orange'; if(particleGui) particleGui.controllers.find(c => c.property === 'colorPreset')?.setValue('orange'); } for (let i = 0; i < particleParams.particleCount; i++) { tempColor.toArray(targetColorAttr.array, i * 3); } } targetColorAttr.needsUpdate = true; colorMorphStartTime = particleClock.getElapsedTime(); console.log("Color morph started at:", colorMorphStartTime); }
    function onParticleWindowResize() { if (!particleCamera || !particleRenderer || !particleMaterial) return; const width = window.innerWidth; const height = window.innerHeight; const isMobile = width <= mobileBreakpoint; particleCamera.position.z = isMobile ? 35 : 40; particleCamera.aspect = width / height; particleCamera.updateProjectionMatrix(); particleRenderer.setSize(width, height); const newSize = isMobile ? 0.1 : 0.15; particleParams.particleSize = newSize; particleMaterial.size = newSize; particleGui?.controllers.find(c => c.property === 'particleSize')?.setValue(newSize); console.log(`Resized: Mobile=${isMobile}, CameraZ=${particleCamera.position.z}, ParticleSize=${newSize}`); }
    function animateParticles() {
        particleAnimationId = requestAnimationFrame(animateParticles);
        if (!particleRenderer || !particleScene || !particleCamera || !particleGeometry || !particlePoints) return;
        const deltaTime = particleClock.getDelta(); const elapsedTime = particleClock.getElapsedTime();
        const positionAttribute = particleGeometry.attributes.position; const initialPositionAttribute = particleGeometry.attributes.initialPosition;
        const colorAttribute = particleGeometry.attributes.color; const initialColorAttribute = particleGeometry.attributes.initialColor; const targetColorAttribute = particleGeometry.attributes.targetColor;
        let didUpdatePositions = false; let didUpdateColors = false;
        if (morphStartTime >= 0) { const morphElapsedTime = elapsedTime - morphStartTime; const morphProgress = Math.min(morphElapsedTime / particleParams.morphDuration, 1.0); const targetAttributeName = `targetPosition${particleShapes[currentShapeIndex]}`; const targetAttribute = particleGeometry.attributes[targetAttributeName]; if (targetAttribute) { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; positionAttribute.array[i3] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3], targetAttribute.array[i3], morphProgress); positionAttribute.array[i3 + 1] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3 + 1], targetAttribute.array[i3 + 1], morphProgress); positionAttribute.array[i3 + 2] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3 + 2], targetAttribute.array[i3 + 2], morphProgress); } didUpdatePositions = true; if (morphProgress >= 1.0) { morphStartTime = -1; } } else { morphStartTime = -1; } }
        if (colorMorphStartTime >= 0) { const colorMorphElapsedTime = elapsedTime - colorMorphStartTime; const colorMorphProgress = Math.min(colorMorphElapsedTime / particleParams.colorMorphDuration, 1.0); for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; colorAttribute.array[i3] = THREE.MathUtils.lerp(initialColorAttribute.array[i3], targetColorAttribute.array[i3], colorMorphProgress); colorAttribute.array[i3 + 1] = THREE.MathUtils.lerp(initialColorAttribute.array[i3 + 1], targetColorAttribute.array[i3 + 1], colorMorphProgress); colorAttribute.array[i3 + 2] = THREE.MathUtils.lerp(initialColorAttribute.array[i3 + 2], targetColorAttribute.array[i3 + 2], colorMorphProgress); } didUpdateColors = true; if (colorMorphProgress >= 1.0) { console.log("Color morph complete."); colorMorphStartTime = -1; } }
        if (particleParams.autorotate && morphStartTime < 0 && particlePoints) { particlePoints.rotation.y += particleParams.autoRotateSpeed * deltaTime; particlePoints.rotation.x += particleParams.autoRotateSpeed * 0.5 * deltaTime; }
        if (didUpdatePositions) { positionAttribute.needsUpdate = true; }
        if (didUpdateColors) { colorAttribute.needsUpdate = true; }
        particleRenderer.render(particleScene, particleCamera);
    }
    function startParticleAnimation() { if (particleAnimationId === null) { console.log("Starting particle animation loop."); animateParticles(); } }
    function handleGuiToggle(event) { if ((event.type === 'keydown' && event.key.toLowerCase() === 'h') || event.type === 'click') { if (particleGui) { const guiElement = particleGui.domElement; if (guiElement.style.display === 'none') { guiElement.style.display = ''; console.log("Particle GUI shown"); } else { guiElement.style.display = 'none'; console.log("Particle GUI hidden"); } } } }
    function autoChangeParticleShape() { if (!particleGui || !particleGeometry || !particleParams.autoShapeChangeEnabled) return; let nextIndex; let attempts = 0; const maxAttempts = particleShapes.length + 1; do { nextIndex = (currentShapeIndex + 1) % particleShapes.length; attempts++; if (particleShapes[nextIndex] === 'Logo' && !logoShapeCalculated) { console.log("Auto Shape Change: Skipping Logo (not ready)."); currentShapeIndex = nextIndex; } else { break; } } while (attempts < maxAttempts); if (attempts >= maxAttempts) { console.warn("Auto Shape Change: Could not find a valid shape."); return; } currentShapeIndex = nextIndex; const nextShapeName = particleShapes[currentShapeIndex]; morphParticleShape(currentShapeIndex); const shapeController = particleGui.controllers.find(c => c.property === 'shape'); if (shapeController) { shapeController.setValue(nextShapeName); } console.log("Auto-morphing to:", nextShapeName); }
    function autoChangeParticleColor() { if (!particleGui || !particleGeometry) return; currentColorIndex = (currentColorIndex + 1) % particleColorPresets.length; const nextColorName = particleColorPresets[currentColorIndex]; changeParticleColor(nextColorName); const colorController = particleGui.controllers.find(c => c.property === 'colorPreset'); if (colorController) { colorController.setValue(nextColorName); } console.log("Auto-changing color to:", nextColorName); }
    function toggleAutoShapeChange(enabled) { if (enabled) { if (!autoShapeChangeIntervalId) { console.log("Starting Auto Shape Change (15s interval)"); autoShapeChangeIntervalId = setInterval(autoChangeParticleShape, 15000); } } else { if (autoShapeChangeIntervalId) { clearInterval(autoShapeChangeIntervalId); autoShapeChangeIntervalId = null; console.log("Stopped Auto Shape Change"); } } }

    // --- Funzione Principale di Caricamento Dati ---
    function loadData() {
        const configFields = airtableData.config;
        const fetchedLinks = airtableData.links;

        // Sfondo
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
                        backgroundVideo.play().catch(e => console.warn("Autoplay bloccato:", e));
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
            } else { showParticlesOnly = true; }
        }
        if (showParticlesOnly) {
            if (particleCanvasElement && particleRenderer) {
                particleRenderer.setClearColor(0x000000, 1);
                particleCanvasElement.style.display = 'block';
            }
        }

        // Titolo e Logo
        const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub');
        document.title = pageTitle;
        if (titleElement) { titleElement.textContent = pageTitle; }
        const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl);
        if (logoContainer) logoContainer.innerHTML = '';
        if (logoInfo && logoInfo.url) {
            const logoImg = document.createElement('img');
            logoImg.src = logoInfo.url;
            logoImg.alt = 'Logo';
            if (logoContainer) logoContainer.appendChild(logoImg);
            processLogoImage(logoInfo.url);
        } else {
            logoShapeCalculated = false;
            currentShapeIndex = 0;
            morphParticleShape(currentShapeIndex, true);
        }
        
        // Pulsanti
        if (linkContainer) linkContainer.innerHTML = '';
        if (fetchedLinks && fetchedLinks.length > 0) {
            const buttonFontSize = getField(configFields, fieldMap.config.buttonFontSize);
            const buttonPadding = getField(configFields, fieldMap.config.buttonPadding);
            fetchedLinks.forEach(linkFields => {
                const url = getField(linkFields, fieldMap.links.url);
                if (!url) return;
                const button = document.createElement('a');
                button.href = url;
                button.textContent = getField(linkFields, fieldMap.links.label, 'Link');
                button.className = 'link-button';
                button.target = '_top';
                button.style.background = getField(linkFields, fieldMap.links.color, defaultButtonColor);
                if (buttonFontSize) button.style.fontSize = buttonFontSize;
                if (buttonPadding) button.style.padding = buttonPadding;
                if (linkContainer) linkContainer.appendChild(button);
            });
        } else {
            if (linkContainer) linkContainer.innerHTML = '<p>Nessun link attivo.</p>';
        }

        // Countdown
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
                    if (distance < 0) {
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
                countdownContainer.style.display = 'block';
                updateCountdown();
                countdownIntervalId = setInterval(updateCountdown, 1000);
            }
        }
    }
    
    // Avvio dell'applicazione principale
    initParticles();
    loadData();
    toggleAutoShapeChange(particleParams.autoShapeChangeEnabled);
    if (autoColorChangeIntervalId) clearInterval(autoColorChangeIntervalId);
    autoColorChangeIntervalId = setInterval(autoChangeParticleColor, 7000);
}