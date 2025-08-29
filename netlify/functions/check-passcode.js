const fetch = require('node-fetch');

// Mappatura dei campi Airtable (per coerenza)
const fieldMap = {
    config: {
        title: 'Titolo Pagina', logoUrl: 'Logo', backgroundAttachment: 'Sfondo', linkedLinks: 'Link Attivi',
        passcode: 'Passcode'
    },
    links: { label: 'Etichetta', url: 'Scrivi URL', color: 'Scrivi Colore Pulsante' }
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { passcode } = JSON.parse(event.body);
        const { AIRTABLE_BASE_ID, AIRTABLE_PAT, CONFIG_TABLE_NAME, LINKS_TABLE_NAME } = process.env;

        const headers = { Authorization: `Bearer ${AIRTABLE_PAT}` };

        // 1. Recupera la configurazione e il passcode corretto
        const configUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(CONFIG_TABLE_NAME)}?maxRecords=1`;
        const configResponse = await fetch(configUrl, { headers });
        if (!configResponse.ok) throw new Error("Airtable config fetch failed");
        
        const configResult = await configResponse.json();
        if (!configResult.records || configResult.records.length === 0) throw new Error("Config record not found");
        
        const configFields = configResult.records[0].fields;
        const correctPasscode = configFields[fieldMap.config.passcode];

        // 2. Controlla il passcode
        if (passcode !== correctPasscode) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Access Denied' }) };
        }

        // 3. Se il passcode è corretto, recupera anche i link
        const linkedLinkIds = configFields[fieldMap.config.linkedLinks] || [];
        let linksData = [];
        if (linkedLinkIds.length > 0) {
            const recordIdFilter = linkedLinkIds.map(id => `RECORD_ID()='${id}'`).join(',');
            const linksUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(LINKS_TABLE_NAME)}?filterByFormula=OR(${recordIdFilter})`;
            const linksResponse = await fetch(linksUrl, { headers });
            if (linksResponse.ok) {
                const linksResult = await linksResponse.json();
                const linksById = linksResult.records.reduce((acc, rec) => { acc[rec.id] = rec.fields; return acc; }, {});
                linksData = linkedLinkIds.map(id => linksById[id]).filter(Boolean);
            }
        }

        // 4. Invia una risposta di successo con tutti i dati necessari al frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                config: configFields,
                links: linksData
            }),
        };

    } catch (error) {
        console.error('Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Internal Server Error' }) };
    }
};