document.addEventListener('DOMContentLoaded', () => {
    // --- Configurazione Airtable ---
    const AIRTABLE_BASE_ID = 'appWu01VUobV0pbwS';
    // !!! ATTENZIONE: Token esposto. Usare un backend proxy per produzione.
    const AIRTABLE_PAT = 'patynTw7e7sYb05V5.710a97591ba84b3d68bcb73bbe0e9447a5ada08aa25958125d8dddccbe8d854d';
    const CONFIG_TABLE_NAME = 'Configurazione';
    const LINKS_TABLE_NAME = 'Links';

    // Mappatura Campi Airtable
    const fieldMap = {
        config: {
            title: 'Titolo Pagina',
            titleSize: 'Dimensione Titolo',
            logoUrl: 'Logo',
            footerImageAlt: 'Alt Img Footer',
            footerImageUrl: 'Immagine Footer',
            backgroundAttachment: 'Sfondo', // <<< Modificato per chiarezza, useremo per leggere l'allegato intero
            showLoader: 'Mostra Loader',
            loaderText: 'Testo Loader',
            loaderBarColor: 'Colore Barra Loader',
            loaderTextSize: 'Dimensione Testo Loader',
            loaderWidth: 'Larghezza Loader',
            loaderBarSpeed: 'Velocità Barra Loader',
            buttonFontSize: 'Dimensione Font Pulsanti',
            buttonPadding: 'Padding Pulsanti',
            showCountdown: 'Mostra Countdown',
            countdownTarget: 'Data Target Countdown',
            countdownLabel: 'Etichetta Countdown',
            linkedLinks: 'Link Attivi'
        },
        links: {
            label: 'Etichetta',
            url: 'Scrivi URL',
            color: 'Scrivi Colore Pulsante',
        }
    };

    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)';

    // --- Elementi DOM ---
    const titleElement = document.getElementById('page-title');
    const logoContainer = document.getElementById('logo-container');
    const linkContainer = document.getElementById('link-container');
    const loadingMessage = document.getElementById('loading-message');
    const loader = document.getElementById('loader');
    const loaderTextElement = loader ? loader.querySelector('#loading-text-container') : null; // Corretto selettore
    const loaderBarElement = loader ? loader.querySelector('.loader-bar') : null;
    const footerImageContainer = document.getElementById('footer-image-container');
    // Countdown
    const countdownContainer = document.getElementById('countdown-container');
    const countdownLabelElement = document.getElementById('countdown-label');
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    const countdownMessageElement = document.getElementById('countdown-message');
    let countdownIntervalId = null;
    // Background Video
    const backgroundVideoContainer = document.getElementById('background-video-container'); // Nuovo
    const backgroundVideo = document.getElementById('background-video');                // Nuovo
    const backgroundVideoSource = backgroundVideo ? backgroundVideo.querySelector('source') : null; // Nuovo


    // --- Funzioni Helper ---

    const getField = (fields, fieldName, defaultValue = null) => {
        return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '')
               ? fields[fieldName]
               : defaultValue;
    };

    /**
     * Estrae le informazioni del primo allegato (URL e tipo) da un campo Airtable Attachment.
     * @param {object} fields - L'oggetto 'fields' del record Airtable.
     * @param {string} fieldName - Il nome ESATTO del campo Attachment in Airtable.
     * @returns {{url: string, type: string, filename: string}|null} Un oggetto con url, type e filename, o null.
     */
    const getAttachmentInfo = (fields, fieldName) => { // <<< NUOVA FUNZIONE
        const attachments = getField(fields, fieldName);
        if (Array.isArray(attachments) && attachments.length > 0) {
            const firstAttachment = attachments[0];
            let url = firstAttachment.url; // URL principale come fallback

            // Prova a prendere la thumbnail grande SE è un'immagine, per ottimizzare
            if (firstAttachment.type && firstAttachment.type.startsWith('image/') && firstAttachment.thumbnails && firstAttachment.thumbnails.large) {
                url = firstAttachment.thumbnails.large.url;
            }

            return {
                url: url,
                type: firstAttachment.type || null, // es: 'image/jpeg', 'video/mp4'
                filename: firstAttachment.filename || null
            };
        }
        return null;
    };


    // --- Funzione Principale di Caricamento ---
    async function loadData() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (linkContainer) linkContainer.innerHTML = ''; // Pulisci i link precedenti
        // Nascondi video di default all'inizio di ogni caricamento
        if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none';
        document.body.style.backgroundImage = ''; // Pulisci sfondo body

        try {
            const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };

            // 1. Recupera Configurazione
            const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`;
            console.log("Tentativo fetch Configurazione:", configUrl);
            const configResponse = await fetch(configUrl, { headers });
            console.log("Risposta Configurazione Status:", configResponse.status);
            if (!configResponse.ok) { throw new Error(`Errore API Configurazione: ${configResponse.status} ${await configResponse.text()}`); }
            const configResult = await configResponse.json();
            if (!configResult.records || configResult.records.length === 0) { throw new Error("Nessun record di configurazione trovato."); }
            const configFields = configResult.records[0].fields;
            console.log("Dati Configurazione Ricevuti:", configFields);

            // Estrai gli ID dei link collegati
            const linkedLinkIds = getField(configFields, fieldMap.config.linkedLinks, []);

            // 2. Recupera Links
            let linksData = [];
            let linksFieldsById = {};
            if (linkedLinkIds.length > 0) {
                const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(',');
                const filterFormula = `OR(${recordIdFilter})`;
                const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=${encodeURIComponent(filterFormula)}`;
                console.log("Tentativo fetch Links:", linksUrl);
                const linksResponse = await fetch(linksUrl, { headers });
                console.log("Risposta Links Status:", linksResponse.status);
                if (!linksResponse.ok) { throw new Error(`Errore API Links: ${linksResponse.status} ${await linksResponse.text()}`); }
                const linksResult = await linksResponse.json();
                console.log("Dati Links Ricevuti:", linksResult.records);

                if (linksResult.records) {
                    linksResult.records.forEach(linkRecord => {
                         linksFieldsById[linkRecord.id] = {
                            id: linkRecord.id,
                            label: getField(linkRecord.fields, fieldMap.links.label, 'Link'),
                            url: getField(linkRecord.fields, fieldMap.links.url),
                            color: getField(linkRecord.fields, fieldMap.links.color, defaultButtonColor)
                         };
                    });
                }
                linksData = linkedLinkIds.map(id => linksFieldsById[id]).filter(Boolean);
            }
            console.log("Dati Links Elaborati e Ordinati:", linksData);


            // --- Applica Configurazione Visiva ---

            // <<< NUOVA LOGICA SFONDO (Immagine o Video) >>>
            const backgroundInfo = getAttachmentInfo(configFields, fieldMap.config.backgroundAttachment);
            if (backgroundInfo && backgroundInfo.url) {
                console.log("Info Sfondo:", backgroundInfo);
                if (backgroundInfo.type && backgroundInfo.type.startsWith('video/')) {
                    // È un video
                    if (backgroundVideoContainer && backgroundVideoSource) {
                        console.log("Applicando video di sfondo:", backgroundInfo.url);
                        backgroundVideoSource.src = backgroundInfo.url;
                        backgroundVideoSource.type = backgroundInfo.type; // Imposta il tipo corretto
                        backgroundVideo.load(); // Ricarica il video con la nuova sorgente
                         // Aggiungi un piccolo delay per assicurare che il video sia pronto prima di mostrarlo
                        setTimeout(() => {
                            backgroundVideo.play().catch(e => console.warn("Autoplay video bloccato dal browser:", e));
                            backgroundVideoContainer.style.display = 'block'; // Mostra il contenitore video
                        }, 100); // Delay di 100ms, aggiustabile se necessario
                        document.body.style.backgroundImage = 'none'; // Assicura che non ci sia immagine di sfondo sul body
                    } else {
                        console.warn("Elementi video non trovati nel DOM.");
                    }
                } else if (backgroundInfo.type && backgroundInfo.type.startsWith('image/')) {
                    // È un'immagine
                    console.log("Applicando immagine di sfondo:", backgroundInfo.url);
                    document.body.style.backgroundImage = `url('${backgroundInfo.url}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center center';
                    document.body.style.backgroundRepeat = 'no-repeat';
                    // document.body.style.backgroundAttachment = 'fixed'; // Rimosso, gestito da video se necessario
                    if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; // Nascondi il video
                } else {
                    // Tipo non riconosciuto o mancante, non fare nulla o usa fallback
                    console.warn("Tipo file sfondo non riconosciuto o mancante:", backgroundInfo.type);
                    document.body.style.backgroundImage = 'none';
                    if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none';
                }
            } else {
                // Nessun allegato per lo sfondo
                console.log("Nessuno sfondo specificato.");
                document.body.style.backgroundImage = 'none'; // Rimuovi eventuali sfondi precedenti
                if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; // Nascondi video
            }
            // <<< FINE NUOVA LOGICA SFONDO >>>


            // Titolo
            const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub');
            document.title = pageTitle;
            if (titleElement) {
                titleElement.textContent = pageTitle;
                const titleSize = getField(configFields, fieldMap.config.titleSize);
                titleElement.style.fontSize = titleSize || '';
            }

            // Countdown Timer (logica invariata)
            if (countdownIntervalId) clearInterval(countdownIntervalId);
            if (countdownContainer) countdownContainer.style.display = 'none';
            if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'block';
            if (countdownLabelElement) countdownLabelElement.style.display = 'block';
            if (countdownMessageElement) countdownMessageElement.style.display = 'none';

            const showCountdown = getField(configFields, fieldMap.config.showCountdown, false);
            const countdownTargetStr = getField(configFields, fieldMap.config.countdownTarget);
            const countdownLabel = getField(configFields, fieldMap.config.countdownLabel, '');

            if (countdownContainer && showCountdown === true && countdownTargetStr) {
                console.log("Avvio configurazione countdown...");
                const targetDate = new Date(countdownTargetStr);

                if (!isNaN(targetDate)) {
                    console.log("Data target countdown valida:", targetDate);
                    if (countdownLabelElement) countdownLabelElement.textContent = countdownLabel;

                    const updateCountdown = () => {
                        const now = new Date().getTime();
                        const distance = targetDate.getTime() - now;

                        if (distance < 0) {
                            clearInterval(countdownIntervalId);
                            if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'none';
                            if (countdownLabelElement) countdownLabelElement.style.display = 'none';
                            if (countdownMessageElement) {
                                countdownMessageElement.textContent = "Tempo Scaduto!";
                                countdownMessageElement.style.display = 'block';
                            }
                            console.log("Countdown terminato.");
                            return;
                        }

                        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                        if (daysElement) daysElement.textContent = String(days).padStart(2, '0');
                        if (hoursElement) hoursElement.textContent = String(hours).padStart(2, '0');
                        if (minutesElement) minutesElement.textContent = String(minutes).padStart(2, '0');
                        if (secondsElement) secondsElement.textContent = String(seconds).padStart(2, '0');

                        if (countdownContainer.style.display === 'none') {
                            countdownContainer.style.display = 'block';
                            console.log("Countdown container reso visibile.");
                        }
                    };
                    updateCountdown();
                    countdownIntervalId = setInterval(updateCountdown, 1000);
                } else {
                    console.error("Formato data/ora countdown non valido:", countdownTargetStr);
                    if (countdownContainer) countdownContainer.style.display = 'none';
                }
            } else {
                console.log("Countdown non attivo o data target mancante.");
                if (countdownContainer) countdownContainer.style.display = 'none';
            }

            // Loader (logica invariata)
            const showLoader = getField(configFields, fieldMap.config.showLoader, false); // Cambiato default a false
            if (loader) {
                if (showLoader === true) {
                    loader.style.display = 'flex';
                    const loaderText = getField(configFields, fieldMap.config.loaderText, '');
                    const loaderBarColor = getField(configFields, fieldMap.config.loaderBarColor);
                    const loaderTextSize = getField(configFields, fieldMap.config.loaderTextSize);
                    const loaderWidth = getField(configFields, fieldMap.config.loaderWidth);
                    const loaderBarSpeed = getField(configFields, fieldMap.config.loaderBarSpeed);

                    if (loaderTextElement) loaderTextElement.textContent = loaderText;
                    if (loaderBarElement) loaderBarElement.style.background = loaderBarColor || '';
                    if (loaderTextElement) loaderTextElement.style.fontSize = loaderTextSize || '';
                    if (loader) { loader.style.width = loaderWidth || ''; loader.style.maxWidth = loaderWidth ? 'none' : ''; }
                    if (loaderBarElement) loaderBarElement.style.animationDuration = (typeof loaderBarSpeed === 'number' && loaderBarSpeed > 0) ? `${loaderBarSpeed}s` : '';
                } else {
                    loader.style.display = 'none';
                }
            } else { console.warn("Elemento Loader non trovato."); }

            // Logo (Usiamo getAttachmentInfo ma solo l'URL)
            const logoInfo = getAttachmentInfo(configFields, fieldMap.config.logoUrl);
            logoContainer.innerHTML = ''; // Pulisci
            if (logoInfo && logoInfo.url) {
                console.log("Cerco logo:", logoInfo.url);
                const logoImg = document.createElement('img');
                logoImg.src = logoInfo.url;
                logoImg.alt = 'Logo';
                logoImg.onerror = () => { console.error("Errore caricando logo:", logoInfo.url); logoContainer.innerHTML = '<p style="font-size: 0.8em; color: #ffcc00;">Logo non trovato</p>'; };
                logoContainer.appendChild(logoImg);
            } else { console.log("Nessun logo specificato."); }


            // Pulsanti Link (logica invariata)
            linkContainer.innerHTML = ''; // Pulisci messaggio caricamento
            if (linksData && linksData.length > 0) {
                const buttonFontSize = getField(configFields, fieldMap.config.buttonFontSize);
                const buttonPadding = getField(configFields, fieldMap.config.buttonPadding);

                linksData.forEach(link => {
                    if (!link.url) { console.warn(`Link '${link.label}' saltato perché manca l'URL.`); return; }
                    const button = document.createElement('a');
                    button.href = link.url;
                    button.textContent = link.label;
                    button.className = 'link-button';
                    button.target = '_top';
                    button.style.background = link.color || defaultButtonColor;
                    button.style.fontSize = buttonFontSize || '';
                    button.style.padding = buttonPadding || '';
                    linkContainer.appendChild(button);
                });
                console.log("Creati", linksData.length, "pulsanti link.");
            } else {
                linkContainer.innerHTML = '<p>Nessun link attivo.</p>';
            }

            // Immagine Footer (Usiamo getAttachmentInfo ma solo l'URL)
            const footerImageInfo = getAttachmentInfo(configFields, fieldMap.config.footerImageUrl);
            if (footerImageContainer) {
                footerImageContainer.innerHTML = ''; // Pulisci
                if (footerImageInfo && footerImageInfo.url) {
                    const imageAlt = getField(configFields, fieldMap.config.footerImageAlt, 'Immagine Footer');
                    console.log("Cerco immagine footer:", footerImageInfo.url, "Alt:", imageAlt);
                    const footerImg = document.createElement('img');
                    footerImg.src = footerImageInfo.url;
                    footerImg.alt = imageAlt;
                    footerImg.onerror = () => { console.error("Errore img footer:", footerImageInfo.url); footerImageContainer.innerHTML = '<p style="font-size: 0.8em; color: #ffcc00;">Immagine non trovata</p>'; };
                    footerImageContainer.appendChild(footerImg);
                } else { console.log("Nessun URL immagine footer specificato."); }
            } else { console.warn("#footer-image-container non trovato."); }

            // Nascondi Messaggio Testo 'Caricamento...' alla fine
            if (loadingMessage) loadingMessage.style.display = 'none';

        } catch (error) {
            console.error('ERRORE DURANTE IL CARICAMENTO DATI AIRTABLE:', error);
            if (linkContainer) linkContainer.innerHTML = `<p class="error-message">Impossibile caricare i dati: ${error.message}</p>`;
            if (titleElement) titleElement.textContent = 'Errore'; document.title = 'Errore';
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (loader) loader.style.display = 'none';
            if (countdownIntervalId) clearInterval(countdownIntervalId);
            if (countdownContainer) countdownContainer.style.display = 'none';
            if (backgroundVideoContainer) backgroundVideoContainer.style.display = 'none'; // Nascondi video in caso di errore
            document.body.classList.add('error-page');
        }
    }

    // Carica i dati all'avvio
    loadData();
});
