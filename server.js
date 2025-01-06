const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Token de verificación (debe coincidir con el configurado en WhatsApp)
const VERIFY_TOKEN = 'mi_token_secreto';

// Endpoint para la verificación del webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado correctamente');
        res.status(200).send(challenge); // Responde con el challenge
    } else {
        console.log('Falló la verificación del webhook');
        res.status(403).send('Token inválido');
    }
});

// Endpoint para recibir mensajes de WhatsApp
app.post('/webhook', (req, res) => {
    const body = req.body;

    // Verifica que el webhook está recibiendo mensajes
    if (body.object) {
        console.log('Mensaje recibido:', JSON.stringify(body, null, 2));

        // Responde a WhatsApp para confirmar recepción
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.status(404).send('No encontrado');
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en el puerto ${PORT}`));
