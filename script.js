document.addEventListener('DOMContentLoaded', () => {
    // --- Configurazione Airtable (Credenziali VECCHIE come da input) ---
    const AIRTABLE_BASE_ID = 'appWu01VUobV0pbwS'; // ID Base VECCHIO
    const AIRTABLE_PAT = 'patynTw7e7sYb05V5.710a97591ba84b3d68bcb73bbe0e9447a5ada08aa25958125d8dddccbe8d854d'; // Token VECCHIO
    const CONFIG_TABLE_NAME = 'Configurazione';
    const LINKS_TABLE_NAME = 'Links';

    // Mappatura campi Airtable (VERIFICA vs Base appWu01VUobV0pbwS)
    const fieldMap = {
        config: {
            title: 'Titolo Pagina', titleSize: 'Dimensione Titolo', logoUrl: 'Logo',
            footerImageAlt: 'Alt Img Footer', footerImageUrl: 'Immagine Footer',
            backgroundUrl: 'Sfondo', // <<<<<< CAMPO PER SFONDO (ATTACHMENT)
            showLoader: 'Mostra Loader', loaderText: 'Testo Loader', loaderBarColor: 'Colore Barra Loader',
            loaderTextSize: 'Dimensione Testo Loader', loaderWidth: 'Larghezza Loader', loaderBarSpeed: 'Velocità Barra Loader',
            buttonFontSize: 'Dimensione Font Pulsanti', buttonPadding: 'Padding Pulsanti',
            showCountdown: 'Mostra Countdown', countdownTarget: 'Data Target Countdown', countdownLabel: 'Etichetta Countdown',
            linkedLinks: 'Link Attivi'
        },
        links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' }
    };

    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';

    // --- Elementi DOM ---
    const titleElement = document.getElementById('page-title');
    const logoContainer = document.getElementById('logo-container');
    const linkContainer = document.getElementById('link-container');
    const loadingMessage = document.getElementById('loading-message');
    const loader = document.getElementById('loader');
    const loaderTextElement = document.getElementById('loading-text-container');
    const loaderBarElement = loader ? loader.querySelector('.loader-bar') : null;
    const footerImageContainer = document.getElementById('footer-image-container');
    const countdownContainer = document.getElementById('countdown-container');
    const countdownLabelElement = document.getElementById('countdown-label');
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    const countdownMessageElement = document.getElementById('countdown-message');
    let countdownIntervalId = null;
    // *** NUOVO: Elementi per Sfondo Video ***
    const videoContainer = document.getElementById('video-bg-container');
    const videoElement = document.getElementById('bg-video');


    // --- Funzioni Helper ---
    const getField = (fields, fieldName, defaultValue = null) => { /* ... (invariato) ... */ };

    // *** MODIFICATO: Helper per ottenere URL e TIPO MIME ***
    const getAttachmentDetails = (fields, fieldName) => {
        const attachments = getField(fields, fieldName);
        if (Array.isArray(attachments) && attachments.length > 0) {
            const file = attachments[0];
            let url = file.url;
            // Usa thumbnail grande per immagini, se disponibile
            if (file.type && file.type.startsWith('image/') && file.thumbnails && file.thumbnails.large) {
                url = file.thumbnails.large.url;
            }
            return { url: url, type: file.type }; // Ritorna URL e tipo
        }
        return null; // Nessun allegato valido
    };
    // Vecchia funzione getAttachmentUrl non più necessaria se usiamo getAttachmentDetails
    // const getAttachmentUrl = (fields, fieldName) => { ... };


    // --- Funzione Principale di Caricamento ---
    async function loadData() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (linkContainer) linkContainer.innerHTML = '';

        // Resetta stati precedenti
        document.body.style.backgroundImage = '';
        if (videoContainer) videoContainer.style.display = 'none';
        if (videoElement) videoElement.innerHTML = '';
        if (countdownIntervalId) clearInterval(countdownIntervalId);

        try {
            const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` }; // Usa token vecchio

            // 1. Recupera Configurazione
            const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`; // Usa ID Base vecchio
            console.log("Tentativo fetch Configurazione:", configUrl);
            const configResponse = await fetch(configUrl, { headers });
            if (!configResponse.ok) { throw new Error(`Errore API Configurazione: ${configResponse.status} ${await configResponse.text()}`); }
            const configResult = await configResponse.json();
            if (!configResult.records || configResult.records.length === 0) { throw new Error("Nessun record Configurazione trovato."); }
            const configRecord = configResult.records[0];
            const configFields = configRecord.fields;
            console.log("Dati Configurazione Ricevuti:", configFields);

            // 2. Recupera Links Collegati
            const linkedLinkIds = getField(configFields, fieldMap.config.linkedLinks, []);
            let linksData = []; let linksFieldsById = {};
            if (linkedLinkIds.length > 0) { /* ... (logica fetch/map/sort links invariata) ... */ }
            console.log("Dati Links Elaborati e Ordinati:", linksData);


            // --- Applica Configurazione Visiva ---

            // *** SFONDO DINAMICO (Immagine o Video) - Logica INSERITA ***
            const backgroundDetails = getAttachmentDetails(configFields, fieldMap.config.backgroundUrl); // Usa nuova helper

            if (backgroundDetails && backgroundDetails.url) {
                const fileUrl = backgroundDetails.url;
                const fileType = backgroundDetails.type;
                console.log("File Sfondo Trovato:", fileUrl, "Tipo:", fileType);

                if (fileType && fileType.startsWith('video/')) { // È UN VIDEO
                    console.log("Rilevato video come sfondo.");
                    if (videoContainer && videoElement) {
                        document.body.style.backgroundImage = 'none'; document.body.style.backgroundColor = '#000'; // Sfondo nero dietro video
                        videoElement.innerHTML = ''; // Pulisci sources
                        const source = document.createElement('source'); source.src = fileUrl; source.type = fileType;
                        videoElement.appendChild(source);
                        videoContainer.style.display = 'block'; // Mostra video
                        videoElement.load();
                        videoElement.play().catch(e => console.warn("Autoplay bloccato:", e));
                    } else { console.warn("Elementi HTML video non trovati."); }
                } else if (fileType && fileType.startsWith('image/')) { // È UN'IMMAGINE
                    console.log("Applicando immagine come sfondo CSS.");
                    document.body.style.backgroundImage = `url('${fileUrl}')`; // Applica immagine
                    document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center center'; document.body.style.backgroundRepeat = 'no-repeat'; document.body.style.backgroundAttachment = 'fixed';
                } else { // Tipo non riconosciuto o Immagine senza tipo specificato
                    console.warn("Tipo file sfondo non video/immagine o non riconosciuto:", fileType, ". Tratto come immagine.");
                    document.body.style.backgroundImage = `url('${fileUrl}')`; // Prova comunque come immagine
                    // ... (imposta altri stili background immagine) ...
                }
            } else { // Nessun allegato
                console.log("Nessun allegato sfondo in Airtable, mantengo sfondo CSS (se presente).");
                 document.body.style.backgroundImage = 'none'; // Rimuove eventuali sfondi precedenti (comportamento originale)
            }
            // *** FINE BLOCCO SFONDO DINAMICO ***


            // Titolo (Logica originale invariata)
            const pageTitle=getField(configFields,fieldMap.config.title,'Link Hub');document.title=pageTitle;if(titleElement){titleElement.textContent=pageTitle;const ts=getField(configFields,fieldMap.config.titleSize);if(ts){titleElement.style.fontSize=ts;}else{titleElement.style.fontSize='';}}

            // Countdown Timer (Logica originale invariata)
            const showCountdown=getField(configFields,fieldMap.config.showCountdown,false);const countdownTargetStr=getField(configFields,fieldMap.config.countdownTarget);const countdownLabel=getField(configFields,fieldMap.config.countdownLabel,'');if(countdownContainer&&showCountdown===true&&countdownTargetStr){/* ... */}else{if(countdownContainer)countdownContainer.style.display='none';}

            // Loader (Logica originale invariata)
            const showLoader=getField(configFields,fieldMap.config.showLoader,false);if(loader){if(showLoader===true){/* ... */}else{loader.style.display='none';}}else{console.warn("Elemento Loader non trovato.");}

            // Logo (Logica originale invariata - usa getAttachmentUrl originale)
            const logoUrl = getAttachmentUrl(configFields, fieldMap.config.logoUrl); // Usa vecchia helper qui
            logoContainer.innerHTML='';if(logoUrl){/* ... */}else{console.log("Nessun logo specificato.");}

            // Pulsanti Link (Logica originale invariata - crea solo <a>)
            linkContainer.innerHTML='';if(linksData&&linksData.length>0){/* ... */}else{linkContainer.innerHTML='<p>Nessun link attivo.</p>';}

            // Immagine Footer (Logica originale invariata - usa getAttachmentUrl originale)
            const footerImageUrl = getAttachmentUrl(configFields, fieldMap.config.footerImageUrl); // Usa vecchia helper qui
            if(footerImageContainer){footerImageContainer.innerHTML='';if(footerImageUrl){/* ... */}else{console.log("Nessun URL immagine footer.");}}else{console.warn("#footer-image-container non trovato.");}


            if (loadingMessage) loadingMessage.style.display = 'none';

        } catch (error) { /* ... (Gestione Errore Invariata) ... */ }
    }
    loadData();

    // *** Helper getField (già presente sopra) ***
    // *** Helper getAttachmentUrl (vecchio) è ancora usato per Logo e Footer ***
    const getAttachmentUrl = (fields, fieldName) => { const attachments = getField(fields, fieldName); if (Array.isArray(attachments) && attachments.length > 0) { const firstAttachment = attachments[0]; if (firstAttachment.thumbnails && firstAttachment.thumbnails.large) { return firstAttachment.thumbnails.large.url; } return firstAttachment.url; } return null; };


}); // Fine DOMContentLoaded
