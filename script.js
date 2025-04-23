document.addEventListener('DOMContentLoaded', () => {
    // --- Configurazione Airtable ---
    const AIRTABLE_BASE_ID = 'appWu01VUobV0pbwS';
    // !!! ATTENZIONE: Il tuo Personal Access Token è esposto qui nel codice frontend.
    // Per produzione, considera l'uso di un backend proxy (es. Netlify Functions, Cloudflare Workers)
    // per tenere nascosto il token.
    const AIRTABLE_PAT = 'patynTw7e7sYb05V5.710a97591ba84b3d68bcb73bbe0e9447a5ada08aa25958125d8dddccbe8d854d';
    const CONFIG_TABLE_NAME = 'Configurazione'; // Nome esatto tabella Configurazione
    const LINKS_TABLE_NAME = 'Links';         // Nome esatto tabella Links

    // Mappatura tra nomi chiave usati nello script e nomi REALI dei campi Airtable
    // Aggiorna qui se rinomini i campi in Airtable
    const fieldMap = {
        config: {
            title: 'Titolo Pagina',
            titleSize: 'Dimensione Titolo',
            logoUrl: 'Logo',                     // Attachment
            footerImageAlt: 'Alt Img Footer',
            footerImageUrl: 'Immagine Footer',       // Attachment
            backgroundUrl: 'Sfondo',                 // Attachment
            showLoader: 'Mostra Loader',           // Checkbox
            loaderText: 'Testo Loader',
            loaderBarColor: 'Colore Barra Loader',
            loaderTextSize: 'Dimensione Testo Loader',
            loaderWidth: 'Larghezza Loader',
            loaderBarSpeed: 'Velocità Barra Loader', // Number
            buttonFontSize: 'Dimensione Font Pulsanti',
            buttonPadding: 'Padding Pulsanti',
            showCountdown: 'Mostra Countdown',       // Checkbox
            countdownTarget: 'Data Target Countdown',// DateTime
            countdownLabel: 'Etichetta Countdown',
            linkedLinks: 'Link Attivi'             // Link to Records
        },
        links: {
            label: 'Etichetta',
            url: 'Scrivi URL', // <-- Nome corretto dallo screenshot
            color: 'Scrivi Colore Pulsante', // <-- Nome corretto dallo screenshot
            // 'Attivo' (Checkbox) non serve qui, viene usato per filtrare
            // 'Configurazione' (Link to Record) non serve qui
        }
    };

    const defaultButtonColor = 'linear-gradient(45deg, #ff00ff, #00ffff)'; // Colore default se non specificato

    // --- Elementi DOM ---
    const titleElement = document.getElementById('page-title');
    const logoContainer = document.getElementById('logo-container');
    const linkContainer = document.getElementById('link-container');
    const loadingMessage = document.getElementById('loading-message');
    const loader = document.getElementById('loader');
    const loaderTextElement = document.getElementById('loading-text-container');
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

    // --- Funzioni Helper ---

    /**
     * Estrae il valore da un campo Airtable, gestendo i casi undefined.
     * @param {object} fields - L'oggetto 'fields' del record Airtable.
     * @param {string} fieldName - Il nome ESATTO del campo in Airtable.
     * @param {*} [defaultValue=null] - Il valore da restituire se il campo è vuoto/inesistente.
     * @returns {*} Il valore del campo o il defaultValue.
     */
    const getField = (fields, fieldName, defaultValue = null) => {
        return (fields && fields[fieldName] !== undefined && fields[fieldName] !== null && fields[fieldName] !== '')
               ? fields[fieldName]
               : defaultValue;
    };

    /**
     * Estrae l'URL del primo allegato da un campo Airtable Attachment.
     * Preferisce la thumbnail grande se disponibile.
     * @param {object} fields - L'oggetto 'fields' del record Airtable.
     * @param {string} fieldName - Il nome ESATTO del campo Attachment in Airtable.
     * @returns {string|null} L'URL dell'immagine o null.
     */
    const getAttachmentUrl = (fields, fieldName) => {
        const attachments = getField(fields, fieldName);
        if (Array.isArray(attachments) && attachments.length > 0) {
            const firstAttachment = attachments[0];
            // Prova a prendere la thumbnail grande, altrimenti l'URL diretto
            if (firstAttachment.thumbnails && firstAttachment.thumbnails.large) {
                return firstAttachment.thumbnails.large.url;
            }
            return firstAttachment.url;
        }
        return null;
    };

    // --- Funzione Principale di Caricamento ---
    async function loadData() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (linkContainer) linkContainer.innerHTML = ''; // Pulisci i link precedenti

        try {
            const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };

            // 1. Recupera il record di configurazione (si assume ce ne sia solo uno)
            const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`;
            console.log("Tentativo fetch Configurazione:", configUrl);
            const configResponse = await fetch(configUrl, { headers });
            console.log("Risposta Configurazione Status:", configResponse.status);
            if (!configResponse.ok) { throw new Error(`Errore API Configurazione: ${configResponse.status} ${await configResponse.text()}`); }
            const configResult = await configResponse.json();
            if (!configResult.records || configResult.records.length === 0) { throw new Error("Nessun record di configurazione trovato in Airtable."); }
            const configRecord = configResult.records[0];
            const configFields = configRecord.fields;
            console.log("Dati Configurazione Ricevuti:", configFields);

            // Estrai gli ID dei link collegati (se presenti)
            const linkedLinkIds = getField(configFields, fieldMap.config.linkedLinks, []);

            // 2. Recupera i dettagli dei link collegati (se ce ne sono)
            let linksData = [];
            let linksFieldsById = {}; // Per riordinare dopo
            if (linkedLinkIds.length > 0) {
                // Costruisci la formula per recuperare solo i link specificati
                const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(',');
                const filterFormula = `OR(${recordIdFilter})`;
                const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=${encodeURIComponent(filterFormula)}`;
                console.log("Tentativo fetch Links:", linksUrl);

                const linksResponse = await fetch(linksUrl, { headers });
                console.log("Risposta Links Status:", linksResponse.status);
                if (!linksResponse.ok) { throw new Error(`Errore API Links: ${linksResponse.status} ${await linksResponse.text()}`); }
                const linksResult = await linksResponse.json();
                console.log("Dati Links Ricevuti:", linksResult.records);

                // Mappa i campi dei link recuperati in un formato più semplice e per ID
                 if (linksResult.records) {
                    linksResult.records.forEach(linkRecord => {
                         const fields = linkRecord.fields;
                         linksFieldsById[linkRecord.id] = {
                            id: linkRecord.id, // Conserva l'ID per il riordino
                            label: getField(fields, fieldMap.links.label, 'Link'),
                            url: getField(fields, fieldMap.links.url),
                            color: getField(fields, fieldMap.links.color, defaultButtonColor)
                         };
                    });
                 }

                // Riordina i link nell'ordine specificato in 'Link Attivi'
                linksData = linkedLinkIds
                    .map(id => linksFieldsById[id])
                    .filter(link => link !== undefined); // Filtra eventuali ID non trovati
            }
             console.log("Dati Links Elaborati e Ordinati:", linksData);


            // --- Applica Configurazione Visiva (usando configFields) ---

            // Sfondo
            const backgroundUrl = getAttachmentUrl(configFields, fieldMap.config.backgroundUrl);
            if (backgroundUrl) {
                console.log("Applicando immagine di sfondo:", backgroundUrl);
                document.body.style.backgroundImage = `url('${backgroundUrl}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center center';
                document.body.style.backgroundRepeat = 'no-repeat';
                document.body.style.backgroundAttachment = 'fixed'; // Mantiene lo sfondo fisso durante lo scroll
            } else {
                console.log("Nessuna immagine di sfondo specificata.");
                document.body.style.backgroundImage = 'none'; // Rimuovi eventuali sfondi precedenti
            }

            // Titolo
            const pageTitle = getField(configFields, fieldMap.config.title, 'Link Hub');
            document.title = pageTitle;
            if (titleElement) {
                titleElement.textContent = pageTitle;
                const titleSize = getField(configFields, fieldMap.config.titleSize);
                if (titleSize) { titleElement.style.fontSize = titleSize; } else { titleElement.style.fontSize = ''; }
                // Aggiungere font-family se necessario
            }

            // Countdown Timer
            if (countdownIntervalId) clearInterval(countdownIntervalId); // Pulisci timer precedente
            if (countdownContainer) countdownContainer.style.display = 'none'; // Nascondi di default
            if (document.getElementById('countdown-timer')) document.getElementById('countdown-timer').style.display = 'block';
            if (countdownLabelElement) countdownLabelElement.style.display = 'block';
            if (countdownMessageElement) countdownMessageElement.style.display = 'none';

            const showCountdown = getField(configFields, fieldMap.config.showCountdown, false); // Default a false
            const countdownTargetStr = getField(configFields, fieldMap.config.countdownTarget);
            const countdownLabel = getField(configFields, fieldMap.config.countdownLabel, '');

            if (countdownContainer && showCountdown === true && countdownTargetStr) {
                console.log("Avvio configurazione countdown...");
                // Airtable restituisce ISO 8601, new Date() lo capisce
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
                                countdownMessageElement.textContent = "Tempo Scaduto!"; // Messaggio di default
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
                    updateCountdown(); // Chiamata iniziale
                    countdownIntervalId = setInterval(updateCountdown, 1000);
                } else {
                    console.error("Formato data/ora countdown non valido:", countdownTargetStr);
                    if (countdownContainer) countdownContainer.style.display = 'none';
                }
            } else {
                console.log("Countdown non attivo o data target mancante.");
                if (countdownContainer) countdownContainer.style.display = 'none';
            }

            // Loader
            const showLoader = getField(configFields, fieldMap.config.showLoader, true); // Default a true
            if (loader) {
                if (showLoader === true) {
                    loader.style.display = 'flex'; // Usa flex come nel CSS
                    const loaderText = getField(configFields, fieldMap.config.loaderText, '');
                    const loaderBarColor = getField(configFields, fieldMap.config.loaderBarColor);
                    const loaderTextSize = getField(configFields, fieldMap.config.loaderTextSize);
                    const loaderWidth = getField(configFields, fieldMap.config.loaderWidth);
                    const loaderBarSpeed = getField(configFields, fieldMap.config.loaderBarSpeed); // Numero

                    if (loaderTextElement) loaderTextElement.textContent = loaderText;
                    if (loaderBarElement && loaderBarColor) loaderBarElement.style.background = loaderBarColor; else if (loaderBarElement) loaderBarElement.style.background = ''; // Reset
                    if (loaderTextElement && loaderTextSize) loaderTextElement.style.fontSize = loaderTextSize; else if (loaderTextElement) loaderTextElement.style.fontSize = ''; // Reset
                    if (loaderWidth) { loader.style.width = loaderWidth; loader.style.maxWidth = 'none'; } else { loader.style.width = ''; loader.style.maxWidth = ''; } // Reset
                    if (loaderBarElement && typeof loaderBarSpeed === 'number' && loaderBarSpeed > 0) {
                        loaderBarElement.style.animationDuration = loaderBarSpeed + 's';
                    } else if (loaderBarElement) {
                        loaderBarElement.style.animationDuration = ''; // Reset
                    }
                } else {
                    loader.style.display = 'none';
                }
            } else { console.warn("Elemento Loader non trovato."); }

            // Logo
            const logoUrl = getAttachmentUrl(configFields, fieldMap.config.logoUrl);
            logoContainer.innerHTML = ''; // Pulisci
            if (logoUrl) {
                console.log("Cerco logo:", logoUrl);
                const logoImg = document.createElement('img');
                logoImg.src = logoUrl;
                logoImg.alt = 'Logo';
                logoImg.onerror = () => {
                    console.error("Errore caricando logo:", logoUrl);
                    logoContainer.innerHTML = '<p style="font-size: 0.8em; color: #ffcc00;">Logo non trovato</p>';
                };
                logoContainer.appendChild(logoImg);
            } else {
                console.log("Nessun logo specificato.");
            }

            // Pulsanti Link (usa linksData)
            linkContainer.innerHTML = ''; // Pulisci messaggio caricamento
            if (linksData && linksData.length > 0) {
                const buttonFontSize = getField(configFields, fieldMap.config.buttonFontSize);
                const buttonPadding = getField(configFields, fieldMap.config.buttonPadding);

                linksData.forEach(link => {
                    if (!link.url) { // Salta i link senza URL
                         console.warn(`Link '${link.label}' saltato perché manca l'URL.`);
                         return;
                    }
                    const button = document.createElement('a');
                    button.href = link.url;
                    button.textContent = link.label;
                    button.className = 'link-button';
                    button.target = '_top'; // O '_blank' se vuoi aprire in nuova scheda

                    // Applica colore (usa default se manca)
                    button.style.background = link.color || defaultButtonColor;

                    // Applica stili pulsante da configurazione
                    if (buttonFontSize) button.style.fontSize = buttonFontSize; else button.style.fontSize = '';
                    if (buttonPadding) button.style.padding = buttonPadding; else button.style.padding = '';

                    linkContainer.appendChild(button);
                });
                console.log("Creati", linksData.length, "pulsanti link.");
            } else {
                linkContainer.innerHTML = '<p>Nessun link attivo.</p>';
            }

            // Immagine Footer
            const footerImageUrl = getAttachmentUrl(configFields, fieldMap.config.footerImageUrl);
            if (footerImageContainer) {
                footerImageContainer.innerHTML = ''; // Pulisci
                if (footerImageUrl) {
                    const imageAlt = getField(configFields, fieldMap.config.footerImageAlt, 'Immagine Footer');
                    console.log("Cerco immagine footer:", footerImageUrl, "Alt:", imageAlt);
                    const footerImg = document.createElement('img');
                    footerImg.src = footerImageUrl;
                    footerImg.alt = imageAlt;
                    footerImg.onerror = () => {
                        console.error("Errore img footer:", footerImageUrl);
                        footerImageContainer.innerHTML = '<p style="font-size: 0.8em; color: #ffcc00;">Immagine non trovata</p>';
                    };
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
            document.body.classList.add('error-page'); // Applica stile errore generale
        }
    }

    // Carica i dati all'avvio
    loadData();
});