// netlify/functions/check-passcode.js (VERSIONE CORRETTA E AGGIORNATA)

const fetch = require('node-fetch');

// --- MAPPATURA CAMPI AGGIORNATA IN BASE AI TUOI SCREENSHOT ---
const fieldMap = {
    config: {
        // Questi sono i campi che il frontend (script.js) si aspetta di ricevere
        title: 'Nome Configurazione', // Uso "Nome Configurazione" come titolo principale
        logoUrl: 'Logo', // Assumo che tu abbia una colonna 'Logo'
        backgroundAttachment: 'Sfondo', // Assumo che tu abbia una colonna 'Sfondo'
        linkedLinks: 'Link Attivi',
        passcode: 'Passcode' // Corrisponde al tuo screenshot
    },
    links: {
        label: 'Etichetta', // Corrisponde al tuo screenshot
        url: 'Scrivi URL', // Corrisponde al tuo screenshot
        color: 'Scrivi Colore Pulsante' // Corrisponde al tuo screenshot
    }
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const { passcode } = JSON.parse(event.body);
        const { AIRTABLE_BASE_ID, AIRTABLE_PAT, CONFIG_TABLE_NAME, LINKS_TABLE_NAME } = process.env;

        const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };
        
        // 1. Recupera la configurazione
        const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`;
        const configResponse = await fetch(configUrl, { headers });
        if (!configResponse.ok) throw new Error("Airtable config fetch failed");
        
        const configResult = await configResponse.json();
        if (!configResult.records || configResult.records.length === 0) throw new Error("Config record not found");
        
        const configFields = configResult.records[0].fields;
        
        // 2. Controlla il passcode usando il nome campo corretto
        const correctPasscode = configFields[fieldMap.config.passcode];
        if (passcode !== correctPasscode) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Access Denied' }) };
        }

        // 3. Recupera i link
        const linkedLinkIds = configFields[fieldMap.config.linkedLinks] || [];
        let linksData = [];
        if (linkedLinkIds.length > 0) {
            // NOTA: Il tuo campo "Link Attivi" linka a record nella stessa tabella "Links",
            // quindi la logica per recuperare i record linkati rimane la stessa.
            const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(',');
            const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=OR(${recordIdFilter})`;
            const linksResponse = await fetch(linksUrl, { headers });
            if (linksResponse.ok) {
                const linksResult = await linksResponse.json();
                // Trasformiamo i dati dei link in un formato pulito per il frontend
                linksData = linksResult.records.map(rec => rec.fields);
            }
        }

        // 4. Invia la risposta di successo con tutti i dati
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                config: configFields, // Invia tutti i campi di configurazione
                links: linksData      // Invia i dati puliti dei link
            }),
        };
    } catch (error) {
        console.error('Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Internal Server Error' }) };
    }
};