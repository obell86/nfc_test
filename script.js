import * as THREE from 'three';
import { GUI } from 'lil-gui'; // << Importa GUI

document.addEventListener('DOMContentLoaded', () => {
    // --- Configurazione Airtable ---
    // ... (invariata)
    const AIRTABLE_BASE_ID = 'appWu01VUobV0pbwS';
    const AIRTABLE_PAT = 'patynTw7e7sYb05V5.710a97591ba84b3d68bcb73bbe0e9447a5ada08aa25958125d8dddccbe8d854d'; // USARE PROXY IN PROD!
    const CONFIG_TABLE_NAME = 'Configurazione';
    const LINKS_TABLE_NAME = 'Links';


    // --- Mappatura Campi Airtable ---
    // ... (invariata)
     const fieldMap = {
        config: {
            title: 'Titolo Pagina', titleSize: 'Dimensione Titolo', logoUrl: 'Logo',
            footerImageAlt: 'Alt Img Footer', footerImageUrl: 'Immagine Footer',
            backgroundAttachment: 'Sfondo', showLoader: 'Mostra Loader', loaderText: 'Testo Loader',
            loaderBarColor: 'Colore Barra Loader', loaderTextSize: 'Dimensione Testo Loader',
            loaderWidth: 'Larghezza Loader', loaderBarSpeed: 'Velocità Barra Loader',
            buttonFontSize: 'Dimensione Font Pulsanti', buttonPadding: 'Padding Pulsanti',
            showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown',
            countdownLabel: 'Etichetta Countdown', linkedLinks: 'Link Attivi'
        },
        links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' }
    };

    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';

    // --- Elementi DOM Principali ---
    // ... (invariati)
     const titleElement = document.getElementById('page-title');
    const logoContainer = document.getElementById('logo-container');
    const linkContainer = document.getElementById('link-container');
    const loadingMessage = document.getElementById('loading-message');
    const loader = document.getElementById('loader');
    const loaderTextElement = loader ? loader.querySelector('#loading-text-container') : null;
    const loaderBarElement = loader ? loader.querySelector('.loader-bar') : null;
    const footerImageContainer = document.getElementById('footer-image-container');
    const countdownContainer = document.getElementById('countdown-container');
    const countdownLabelElement = document.getElementById('countdown-label');
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    const countdownMessageElement = document.getElementById('countdown-message');
    const backgroundVideoContainer = document.getElementById('background-video-container');
    const backgroundVideo = document.getElementById('background-video');
    const backgroundVideoSource = backgroundVideo ? backgroundVideo.querySelector('source') : null;
    let countdownIntervalId = null;


    // --- Variabili Globali per le Particelle ---
    let particleScene, particleCamera, particleRenderer, particlePoints, particleGui; // << Aggiunto particleGui
    let particleGeometry, particleMaterial;
    let particleTargetPositions = {};
    let currentShapeIndex = 0;
    // Aggiunte nuove forme
    const particleShapes = ['Sphere', 'Cube', 'Torus', 'Spiral', 'Pyramid', 'Cylinder'];
    let morphStartTime = -1;
    const particleClock = new THREE.Clock();
    const particleParams = {
        particleCount: 5000,
        particleSize: 0.1,
        morphDuration: 2.0,
        autoRotateSpeed: 0.2,
        autorotate: true,
        // Usiamo un oggetto separato per i parametri controllati dalla GUI
        // per evitare conflitti con il modo in cui lil-gui gestisce i colori
        guiControls: {
             shape: particleShapes[0], // Forma iniziale
             colorPreset: 'orange' // Colore iniziale
        }
    };
    const numParticlesMax = 10000;
    let particleCanvasElement;
    let particleAnimationId = null;


    // --- Funzioni Helper (Airtable - invariate) ---
    const getField = (fields, fieldName, defaultValue = null) => { /* ... */ return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '') ? fields[fieldName] : defaultValue; };
    const getAttachmentInfo = (fields, fieldName) => { /* ... */ const att = getField(fields, fieldName); if (Array.isArray(att) && att.length > 0) { const fA = att[0]; let url = fA.url; if (fA.type && fA.type.startsWith('image/') && fA.thumbnails && fA.thumbnails.large) { url = fA.thumbnails.large.url; } return { url: url, type: fA.type || null, filename: fA.filename || null }; } return null; };

    // --- Funzioni Logica Particelle ---

    function initParticles() {
        console.log("Initializing particle system...");
        particleCanvasElement = document.getElementById('particle-canvas');
        if (!particleCanvasElement) { console.error("Particle canvas element not found!"); return; }

        particleScene = new THREE.Scene();
        particleCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        particleCamera.position.z = 30;

        particleRenderer = new THREE.WebGLRenderer({ canvas: particleCanvasElement, antialias: true, alpha: true });
        particleRenderer.setSize(window.innerWidth, window.innerHeight);
        particleRenderer.setPixelRatio(window.devicePixelRatio);
        particleRenderer.setClearColor(0x000000, 0); // Trasparente di default

        particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(numParticlesMax * 3);
        const colors = new Float32Array(numParticlesMax * 3);
        const initialPositions = new Float32Array(numParticlesMax * 3);
        // Usa il colore preset iniziale dai controlli GUI
        const initialColor = new THREE.Color(particleParams.guiControls.colorPreset);
        for (let i = 0; i < particleParams.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 0.1; positions[i3 + 1] = (Math.random() - 0.5) * 0.1; positions[i3 + 2] = (Math.random() - 0.5) * 0.1;
            initialColor.toArray(colors, i3);
            initialPositions[i3] = positions[i3]; initialPositions[i3 + 1] = positions[i3 + 1]; initialPositions[i3 + 2] = positions[i3 + 2];
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('initialPosition', new THREE.BufferAttribute(initialPositions, 3));

        // Aggiungere buffer per TUTTE le forme, incluse le nuove
        particleShapes.forEach(shapeName => {
            particleGeometry.setAttribute(`targetPosition${shapeName}`, new THREE.BufferAttribute(new Float32Array(numParticlesMax * 3), 3));
        });

        particleMaterial = new THREE.PointsMaterial({ size: particleParams.particleSize, vertexColors: true, sizeAttenuation: true, depthWrite: false });
        particlePoints = new THREE.Points(particleGeometry, particleMaterial);
        particleScene.add(particlePoints);

        calculateParticleTargetPositions(); // Calcola per tutte le forme
        morphParticleShape(currentShapeIndex, true); // Imposta forma iniziale

        setupParticleGUI(); // << Chiama setup GUI

        window.addEventListener('resize', onParticleWindowResize);
        console.log("Particle system initialization complete.");
        startParticleAnimation();
    }

    // <<< NUOVA FUNZIONE per creare il pannello GUI >>>
    function setupParticleGUI() {
        if (particleGui) particleGui.destroy(); // Rimuovi GUI precedente se esiste
        particleGui = new GUI();
        particleGui.title("Particle Controls");

        // Controllo Conteggio Particelle (con callback per aggiornare)
        particleGui.add(particleParams, 'particleCount', 100, numParticlesMax, 1)
            .name('Count')
            .onChange(updateParticleCount); // Chiama funzione specifica su cambio

        // Controllo Dimensione Particelle
        particleGui.add(particleParams, 'particleSize', 0.01, 1, 0.01)
            .name('Size')
            .onChange(value => { if (particleMaterial) particleMaterial.size = value; });

        // Controllo Durata Morphing
        particleGui.add(particleParams, 'morphDuration', 0.5, 5, 0.1).name('Morph (s)');

        // Controllo Rotazione Automatica
        particleGui.add(particleParams, 'autorotate').name('Auto Rotate');
        particleGui.add(particleParams, 'autoRotateSpeed', 0, 1, 0.05).name('Rotate Speed');

        // Controllo Forma (Dropdown)
        particleGui.add(particleParams.guiControls, 'shape', particleShapes)
           .name('Shape')
           .onChange(value => {
               const newIndex = particleShapes.indexOf(value);
               if (newIndex !== -1) {
                   currentShapeIndex = newIndex;
                   morphParticleShape(currentShapeIndex); // Avvia morph alla nuova forma
               }
           });

        // Controllo Colore (Preset Dropdown)
        particleGui.add(particleParams.guiControls, 'colorPreset', ['orange', 'purple', 'lime', 'multi'])
            .name('Color Preset')
            .onChange(value => {
                changeParticleColor(value); // Cambia colore particelle
            });
    }

    // <<< NUOVA FUNZIONE per gestire l'update del conteggio >>>
    function updateParticleCount() {
        if (!particleGeometry) return;
        console.log("Updating particle count to:", particleParams.particleCount);
        // Recalculate target positions for the new count (important!)
        calculateParticleTargetPositions();
        // Update the active particle colors immediately
        changeParticleColor(particleParams.guiControls.colorPreset, true); // Force update colors
        // Instantly move *active* particles to their new position in the *current* shape
        morphParticleShape(currentShapeIndex, true); // Morph istantaneo alla forma corrente
        // Update the draw range
        particleGeometry.setDrawRange(0, particleParams.particleCount);
        console.log("Particle count updated.");
    }


    function calculateParticleTargetPositions() {
         const radius = 15;
         const height = radius * 1.5; // Altezza per piramide/cilindro
         const getTargetBuffer = (shapeName) => particleGeometry.attributes[`targetPosition${shapeName}`].array;

         const targets = { Sphere: getTargetBuffer('Sphere'), Cube: getTargetBuffer('Cube'), Torus: getTargetBuffer('Torus'), Spiral: getTargetBuffer('Spiral'), Pyramid: getTargetBuffer('Pyramid'), Cylinder: getTargetBuffer('Cylinder') };

         for (let i = 0; i < particleParams.particleCount; i++) {
             const i3 = i * 3;

             // Sphere
             const phiS = Math.acos(-1 + (2 * i) / particleParams.particleCount); const thetaS = Math.sqrt(particleParams.particleCount * Math.PI) * phiS;
             targets.Sphere[i3]=radius*Math.sin(phiS)*Math.cos(thetaS); targets.Sphere[i3+1]=radius*Math.sin(phiS)*Math.sin(thetaS); targets.Sphere[i3+2]=radius*Math.cos(phiS);

             // Cube
             const hsC = radius*0.8; const sideC=Math.floor(Math.random()*6); const xC=(Math.random()-0.5)*2*hsC; const yC=(Math.random()-0.5)*2*hsC;
             if(sideC===0){targets.Cube[i3]=xC; targets.Cube[i3+1]=yC; targets.Cube[i3+2]=hsC;} else if(sideC===1){targets.Cube[i3]=xC; targets.Cube[i3+1]=yC; targets.Cube[i3+2]=-hsC;} else if(sideC===2){targets.Cube[i3]=hsC; targets.Cube[i3+1]=xC; targets.Cube[i3+2]=yC;} else if(sideC===3){targets.Cube[i3]=-hsC; targets.Cube[i3+1]=xC; targets.Cube[i3+2]=yC;} else if(sideC===4){targets.Cube[i3]=xC; targets.Cube[i3+1]=hsC; targets.Cube[i3+2]=yC;} else{targets.Cube[i3]=xC; targets.Cube[i3+1]=-hsC; targets.Cube[i3+2]=yC;}

             // Torus
             const trT=radius*0.7; const turT=radius*0.3; const uT=Math.random()*Math.PI*2; const vT=Math.random()*Math.PI*2;
             targets.Torus[i3]=(trT+turT*Math.cos(vT))*Math.cos(uT); targets.Torus[i3+1]=(trT+turT*Math.cos(vT))*Math.sin(uT); targets.Torus[i3+2]=turT*Math.sin(vT);

             // Spiral
             const turnsSp=5; const spreadSp=radius*1.5; const tSp=(i/(particleParams.particleCount-1)); const angleSp=tSp*Math.PI*2*turnsSp; const rSp=tSp*spreadSp*0.5;
             targets.Spiral[i3]=rSp*Math.cos(angleSp); targets.Spiral[i3+1]=rSp*Math.sin(angleSp); targets.Spiral[i3+2]=(tSp-0.5)*spreadSp*0.7;

             // Pyramid (Square Base Volume)
             const yP = (Math.random() - 0.5) * height; // Altezza da -h/2 a +h/2
             const scaleFactor = (height / 2 - yP) / height; // Scala da 1 (base) a 0 (apice)
             const xP_base = (Math.random() - 0.5) * radius * 2; // Base quadrata larga 'radius * 2'
             const zP_base = (Math.random() - 0.5) * radius * 2;
             targets.Pyramid[i3]   = xP_base * scaleFactor;
             targets.Pyramid[i3+1] = yP;
             targets.Pyramid[i3+2] = zP_base * scaleFactor;

            // Cylinder (Surface: Side + Caps)
            const cylRadius = radius * 0.6;
            const cylHeight = height;
            const capRatio = 0.1; // 10% chance for each cap
            const randCy = Math.random();
            const angleCy = Math.random() * Math.PI * 2;
            if (randCy < capRatio) { // Top Cap
                const rCy = Math.sqrt(Math.random()) * cylRadius; // Distribuzione uniforme area
                targets.Cylinder[i3] = rCy * Math.cos(angleCy);
                targets.Cylinder[i3+1] = cylHeight / 2;
                targets.Cylinder[i3+2] = rCy * Math.sin(angleCy);
            } else if (randCy < capRatio * 2) { // Bottom Cap
                const rCy = Math.sqrt(Math.random()) * cylRadius;
                targets.Cylinder[i3] = rCy * Math.cos(angleCy);
                targets.Cylinder[i3+1] = -cylHeight / 2;
                targets.Cylinder[i3+2] = rCy * Math.sin(angleCy);
            } else { // Side
                targets.Cylinder[i3] = cylRadius * Math.cos(angleCy);
                targets.Cylinder[i3+1] = (Math.random() - 0.5) * cylHeight;
                targets.Cylinder[i3+2] = cylRadius * Math.sin(angleCy);
            }
         }

         // Aggiorna TUTTI i buffer target
         particleShapes.forEach(shapeName => {
             const attr = particleGeometry.attributes[`targetPosition${shapeName}`];
             if (attr) attr.needsUpdate = true;
         });
     }

    function morphParticleShape(shapeIndex, instant = false) {
        const shapeName = particleShapes[shapeIndex];
        const targetAttributeName = `targetPosition${shapeName}`;
        if (!particleGeometry || !particleGeometry.attributes[targetAttributeName]) { console.error(`Target attribute ${targetAttributeName} not found!`); return; }
        // ... (resto della logica morph invariata)
         const targetPosArray = particleGeometry.attributes[targetAttributeName].array;
         const currentPosAttr = particleGeometry.attributes.position;
         const initialPosAttr = particleGeometry.attributes.initialPosition;
         if (instant) { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; currentPosAttr.array[i3] = targetPosArray[i3]; currentPosAttr.array[i3 + 1] = targetPosArray[i3 + 1]; currentPosAttr.array[i3 + 2] = targetPosArray[i3 + 2]; } currentPosAttr.needsUpdate = true; morphStartTime = -1; }
         else { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; initialPosAttr.array[i3] = currentPosAttr.array[i3]; initialPosAttr.array[i3 + 1] = currentPosAttr.array[i3 + 1]; initialPosAttr.array[i3 + 2] = currentPosAttr.array[i3 + 2]; } initialPosAttr.needsUpdate = true; morphStartTime = particleClock.getElapsedTime(); }
         particleGeometry.setDrawRange(0, particleParams.particleCount);

         // Aggiorna il valore nel GUI se cambia programmaticamente (non serve qui)
         // if (particleGui) particleGui.controllers.find(c => c.property === 'shape')?.setValue(shapeName);
    }

    // Modificato per accettare anche 'forceUpdate' da updateParticleCount
    function changeParticleColor(colorName, forceUpdate = false) {
        if (!particleGeometry || (!forceUpdate && colorName === particleParams.guiControls.colorPreset)) return; // Usa guiControls
        particleParams.guiControls.colorPreset = colorName; // Aggiorna stato GUI
        // ... (resto logica colore invariata)
        const colorAttribute = particleGeometry.attributes.color;
        const tempColor = new THREE.Color();
        if (colorName === 'multi') { for (let i = 0; i < particleParams.particleCount; i++) { tempColor.setHSL(Math.random(), 0.9, 0.6); tempColor.toArray(colorAttribute.array, i * 3); } }
        else { try { tempColor.set(colorName); } catch (e) { console.warn(`Invalid color "${colorName}", defaulting.`); tempColor.set('orange'); particleParams.guiControls.colorPreset = 'orange'; } for (let i = 0; i < particleParams.particleCount; i++) { tempColor.toArray(colorAttribute.array, i * 3); } }
        colorAttribute.needsUpdate = true;

        // Aggiorna il valore nel GUI se cambia programmaticamente (non serve qui)
        // if (particleGui) particleGui.controllers.find(c => c.property === 'colorPreset')?.setValue(colorName);
    }


    function onParticleWindowResize() { /* ... (invariata) ... */ if (!particleCamera || !particleRenderer) return; particleCamera.aspect = window.innerWidth / window.innerHeight; particleCamera.updateProjectionMatrix(); particleRenderer.setSize(window.innerWidth, window.innerHeight); }
    function animateParticles() { /* ... (invariata) ... */ particleAnimationId = requestAnimationFrame(animateParticles); if (!particleRenderer || !particleScene || !particleCamera || !particleGeometry || !particlePoints) return; const deltaTime = particleClock.getDelta(); const elapsedTime = particleClock.getElapsedTime(); const positionAttribute = particleGeometry.attributes.position; const initialPositionAttribute = particleGeometry.attributes.initialPosition; let didUpdatePositions = false; if (morphStartTime >= 0) { const morphElapsedTime = elapsedTime - morphStartTime; const morphProgress = Math.min(morphElapsedTime / particleParams.morphDuration, 1.0); const targetAttributeName = `targetPosition${particleShapes[currentShapeIndex]}`; const targetAttribute = particleGeometry.attributes[targetAttributeName]; if (targetAttribute) { for (let i = 0; i < particleParams.particleCount; i++) { const i3 = i * 3; positionAttribute.array[i3] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3], targetAttribute.array[i3], morphProgress); positionAttribute.array[i3 + 1] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3 + 1], targetAttribute.array[i3 + 1], morphProgress); positionAttribute.array[i3 + 2] = THREE.MathUtils.lerp(initialPositionAttribute.array[i3 + 2], targetAttribute.array[i3 + 2], morphProgress); } didUpdatePositions = true; if (morphProgress >= 1.0) { morphStartTime = -1; } } else { morphStartTime = -1; } } if (particleParams.autorotate && morphStartTime < 0) { particlePoints.rotation.y += particleParams.autoRotateSpeed * deltaTime; particlePoints.rotation.x += particleParams.autoRotateSpeed * 0.5 * deltaTime; } if (didUpdatePositions) { positionAttribute.needsUpdate = true; } particleRenderer.render(particleScene, particleCamera); }
    function startParticleAnimation() { /* ... (invariata) ... */ if (particleAnimationId === null) { console.log("Starting particle animation loop."); animateParticles(); } }
    // function scheduleParticleShapeChange() { /* Rimosso - controllato da GUI */ }
    // function scheduleParticleColorChange() { /* Rimosso - controllato da GUI */ }

    // --- Funzione Principale di Caricamento Dati ---
    async function loadData() {
        // ... (logica iniziale e recupero dati invariati) ...
        if (loadingMessage) loadingMessage.style.display = 'block'; if (linkContainer) linkContainer.innerHTML = ''; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; if (particleCanvasElement) particleCanvasElement.style.display = 'none'; document.body.style.backgroundImage = '';
        try { const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` }; const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`; const configResponse = await fetch(configUrl, { headers }); if (!configResponse.ok) { throw new Error(`API Config: ${configResponse.status} ${await configResponse.text()}`); } const configResult = await configResponse.json(); if (!configResult.records || configResult.records.length === 0) { throw new Error("No config record."); } const configFields = configResult.records[0].fields; const linkedLinkIds = getField(configFields, fieldMap.config.linkedLinks, []); let linksData = []; if (linkedLinkIds.length > 0) { const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(','); const filterFormula = `OR(${recordIdFilter})`; const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=${encodeURIComponent(filterFormula)}`; const linksResponse = await fetch(linksUrl, { headers }); if (!linksResponse.ok) { throw new Error(`API Links: ${linksResponse.status} ${await linksResponse.text()}`); } const linksResult = await linksResponse.json(); let linksFieldsById = {}; if (linksResult.records) { linksResult.records.forEach(lr => { linksFieldsById[lr.id] = { id: lr.id, label: getField(lr.fields, fieldMap.links.label, 'Link'), url: getField(lr.fields, fieldMap.links.url), color: getField(lr.fields, fieldMap.links.color, defaultButtonColor) }; }); } linksData = linkedLinkIds.map(id => linksFieldsById[id]).filter(Boolean); }

            // Sfondo e Particelle (Logica invariata)
            const backgroundInfo = getAttachmentInfo(configFields, fieldMap.config.backgroundAttachment); let showParticlesOnly = true; if (backgroundInfo && backgroundInfo.url) { showParticlesOnly = false; if (backgroundInfo.type && backgroundInfo.type.startsWith('video/')) { if (backgroundVideoContainer && backgroundVideoSource && particleCanvasElement && particleRenderer) { console.log("BG: Video + Particles (Transparent)"); backgroundVideoSource.src = backgroundInfo.url; backgroundVideoSource.type = backgroundInfo.type; backgroundVideo.load(); setTimeout(() => { backgroundVideo.play().catch(e => console.warn("Autoplay blocked:", e)); backgroundVideoContainer.style.display = 'block'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; }, 100); document.body.style.backgroundImage = 'none'; } } else if (backgroundInfo.type && backgroundInfo.type.startsWith('image/')) { if (particleCanvasElement && particleRenderer) { console.log("BG: Image + Particles (Transparent)"); document.body.style.backgroundImage = `url('${backgroundInfo.url}')`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; document.body.style.backgroundRepeat = 'no-repeat'; particleRenderer.setClearColor(0x000000, 0); particleCanvasElement.style.display = 'block'; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; } } else { console.warn("BG Type unknown:", backgroundInfo.type); showParticlesOnly = true; } } if (showParticlesOnly) { if (particleCanvasElement && particleRenderer) { console.log("BG: Particles Only (Opaque Black)"); document.body.style.backgroundImage = 'none'; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; particleRenderer.setClearColor(0x000000, 1); particleCanvasElement.style.display = 'block'; } }

            // Titolo, Countdown, Loader, Logo, Pulsanti, Footer (Logica invariata)
            const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub'); document.title = pageTitle; if (titleElement) { titleElement.textContent = pageTitle; const ts = getField(configFields, fieldMap.config.titleSize); titleElement.style.fontSize = ts || ''; }
            if (countdownIntervalId) clearInterval(countdownIntervalId); if (countdownContainer) countdownContainer.style.display = 'none'; if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'block'; if (countdownLabelElement) countdownLabelElement.style.display = 'block'; if (countdownMessageElement) countdownMessageElement.style.display = 'none'; const showCountdown = getField(configFields, fieldMap.config.showCountdown, false); const countdownTargetStr = getField(configFields, fieldMap.config.countdownTarget); const countdownLabel = getField(configFields, fieldMap.config.countdownLabel, ''); if (countdownContainer && showCountdown === true && countdownTargetStr) { const targetDate = new Date(countdownTargetStr); if (!isNaN(targetDate)) { if (countdownLabelElement) countdownLabelElement.textContent = countdownLabel; const updateCountdown = () => { const now = new Date().getTime(); const dist = targetDate.getTime() - now; if (dist < 0) { clearInterval(countdownIntervalId); if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'none'; if (countdownLabelElement) countdownLabelElement.style.display = 'none'; if (countdownMessageElement) { countdownMessageElement.textContent = "Tempo Scaduto!"; countdownMessageElement.style.display = 'block'; } return; } const d = Math.floor(dist / 864e5); const h = Math.floor((dist % 864e5) / 36e5); const m = Math.floor((dist % 36e5) / 6e4); const s = Math.floor((dist % 6e4) / 1e3); if (daysElement) daysElement.textContent = String(d).padStart(2, '0'); if (hoursElement) hoursElement.textContent = String(h).padStart(2, '0'); if (minutesElement) minutesElement.textContent = String(m).padStart(2, '0'); if (secondsElement) secondsElement.textContent = String(s).padStart(2, '0'); if (countdownContainer.style.display === 'none') { countdownContainer.style.display = 'block'; } }; updateCountdown(); countdownIntervalId = setInterval(updateCountdown, 1000); } else { console.error("Data countdown non valida"); if (countdownContainer) countdownContainer.style.display = 'none'; } } else { if (countdownContainer) countdownContainer.style.display = 'none'; }
            const showLoader = getField(configFields, fieldMap.config.showLoader, false); if (loader) { if (showLoader) { loader.style.display = 'flex'; const lt=getField(configFields, fieldMap.config.loaderText,''); const lbc=getField(configFields, fieldMap.config.loaderBarColor); const lts=getField(configFields, fieldMap.config.loaderTextSize); const lw=getField(configFields, fieldMap.config.loaderWidth); const lbs=getField(configFields, fieldMap.config.loaderBarSpeed); if(loaderTextElement)loaderTextElement.textContent=lt; if(loaderBarElement)loaderBarElement.style.background=lbc||''; if(loaderTextElement)loaderTextElement.style.fontSize=lts||''; if(loader){loader.style.width=lw||'';loader.style.maxWidth=lw?'none':'';} if(loaderBarElement)loaderBarElement.style.animationDuration=(typeof lbs==='number'&&lbs>0)?`${lbs}s`:''; } else { loader.style.display = 'none'; } }
            const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl); logoContainer.innerHTML = ''; if (logoInfo && logoInfo.url) { const logoImg=document.createElement('img'); logoImg.src=logoInfo.url; logoImg.alt='Logo'; logoImg.onerror=()=>{console.error("Errore logo");logoContainer.innerHTML='<p style="font-size:0.8em;color:#ffcc00">Logo?</p>';}; logoContainer.appendChild(logoImg); } else { console.log("Nessun logo."); }
            linkContainer.innerHTML = ''; if (linksData && linksData.length > 0) { const bfz=getField(configFields, fieldMap.config.buttonFontSize); const bp=getField(configFields, fieldMap.config.buttonPadding); linksData.forEach(link => { if(!link.url){console.warn(`Link '${link.label}' saltato (no URL).`); return;} const button=document.createElement('a'); button.href=link.url; button.textContent=link.label; button.className='link-button'; button.target='_top'; button.style.background=link.color||defaultButtonColor; button.style.fontSize=bfz||''; button.style.padding=bp||''; linkContainer.appendChild(button); }); } else { linkContainer.innerHTML = '<p>Nessun link attivo.</p>'; }
            const footerImageInfo = getAttachmentInfo(configFields, fieldMap.config.footerImageUrl); if (footerImageContainer) { footerImageContainer.innerHTML = ''; if (footerImageInfo && footerImageInfo.url) { const alt=getField(configFields, fieldMap.config.footerImageAlt,'Img Footer'); const footerImg=document.createElement('img'); footerImg.src=footerImageInfo.url; footerImg.alt=alt; footerImg.onerror=()=>{console.error("Errore img footer");footerImageContainer.innerHTML='<p style="font-size:0.8em;color:#ffcc00">Img?</p>';}; footerImageContainer.appendChild(footerImg); } else { console.log("No img footer."); } }

            if (loadingMessage) loadingMessage.style.display = 'none';

        } catch (error) {
            console.error('ERRORE CARICAMENTO AIRTABLE:', error);
            if (linkContainer) linkContainer.innerHTML = `<p class="error-message">Errore: ${error.message}</p>`;
            if (titleElement) titleElement.textContent = 'Errore'; document.title = 'Errore';
            if (loadingMessage) loadingMessage.style.display = 'none'; if (loader) loader.style.display = 'none'; if (countdownIntervalId) clearInterval(countdownIntervalId); if (countdownContainer) countdownContainer.style.display = 'none'; if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; if (particleCanvasElement) particleCanvasElement.style.display = 'none'; document.body.classList.add('error-page');
        }
    }

    // --- Inizializzazione ---
    initParticles(); // Prepara Three.js e il canvas delle particelle
    loadData();    // Carica dati e decide come visualizzare sfondi/particelle
    // Rimosse chiamate a schedule...Change(), ora controllato da GUI

}); // Fine DOMContentLoaded listener
