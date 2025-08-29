// netlify/functions/check-passcode.js (VERSIONE CON DEBUG AVANZATO)

const fetch = require('node-fetch');

const fieldMap = {
    config: { passcode: 'Passcode', linkedLinks: 'Link Attivi' },
    links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' }
};

exports.handler = async function(event, context) {
    console.log("--- Funzione check-passcode AVVIATA ---");

    if (event.httpMethod !== 'POST') {
        console.log("ERRORE: Metodo non consentito:", event.httpMethod);
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { passcode } = JSON.parse(event.body);
        console.log("Passcode ricevuto dal browser:", passcode);

        const { AIRTABLE_BASE_ID, AIRTABLE_PAT, CONFIG_TABLE_NAME, LINKS_TABLE_NAME } = process.env;

        // CONTROLLO VARIABILI D'AMBIENTE
        if (!AIRTABLE_BASE_ID || !AIRTABLE_PAT || !CONFIG_TABLE_NAME || !LINKS_TABLE_NAME) {
            console.error("ERRORE CRITICO: Una o più variabili d'ambiente mancano!");
            console.error("BASE_ID presente:", !!AIRTABLE_BASE_ID);
            console.error("PAT presente:", !!AIRTABLE_PAT); // Non loggare il valore del PAT per sicurezza
            console.error("CONFIG_TABLE_NAME presente:", !!CONFIG_TABLE_NAME);
            console.error("LINKS_TABLE_NAME presente:", !!LINKS_TABLE_NAME);
            throw new Error("Configurazione del server incompleta.");
        }
        console.log("Variabili d'ambiente caricate correttamente.");

        const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };
        const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`;
        console.log("Chiamata API in corso verso:", configUrl);

        const configResponse = await fetch(configUrl, { headers });
        console.log("Risposta da Airtable ricevuta. Status:", configResponse.status);
        
        if (!configResponse.ok) {
            const errorBody = await configResponse.text();
            console.error("ERRORE da Airtable:", errorBody);
            throw new Error(`Airtable ha risposto con un errore: ${configResponse.status}`);
        }
        
        const configResult = await configResponse.json();
        if (!configResult.records || configResult.records.length === 0) {
            console.error("ERRORE: Nessun record trovato nella tabella Configurazione.");
            throw new Error("Config record not found");
        }
        
        const configFields = configResult.records[0].fields;
        console.log("Dati di configurazione caricati con successo.");

        const correctPasscode = configFields[fieldMap.config.passcode];
        console.log("Passcode corretto da Airtable:", correctPasscode);

        if (passcode !== correctPasscode) {
            console.log("Login FALLITO. Passcode inserito:", passcode, "Passcode corretto:", correctPasscode);
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Access Denied' }) };
        }
        console.log("Login RIUSCITO!");
        
        // Se il passcode è corretto, recupera anche i link (logica invariata)
        const linkedLinkIds = configFields[fieldMap.config.linkedLinks] || [];
        let linksData = [];
        if (linkedLinkIds.length > 0) {
            const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(',');
            const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=OR(${recordIdFilter})`;
            const linksResponse = await fetch(linksUrl, { headers });
            if (linksResponse.ok) {
                const linksResult = await linksResponse.json();
                linksData = linksResult.records.map(rec => rec.fields);
            }
        }
        console.log("Recuperati", linksData.length, "link.");

        console.log("--- Funzione completata con SUCCESSO. Invio dati al browser. ---");
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, config: configFields, links: linksData }),
        };

    } catch (error) {
        console.error('--- ERRORE CATTURATO NEL BLOCCO CATCH ---');
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Internal Server Error' }) };
    }
};