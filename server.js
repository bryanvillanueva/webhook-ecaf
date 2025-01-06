const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Para enviar solicitudes a Make

const app = express();
app.use(bodyParser.json());

// Token de verificación
const VERIFY_TOKEN = 'mi_token_secreto';

// Endpoint para manejar la verificación del webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Responde con el hub.challenge
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Token inválido');
    }
});

// Endpoint para recibir mensajes entrantes de WhatsApp
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object) {
        console.log('Mensaje recibido:', JSON.stringify(body, null, 2));

        // Redirige el mensaje a Make
        try {
            const makeResponse = await axios.post(
                'https://hook.eu2.make.com/ve2tavn6hjsvscq1t3q5y6jc0m47ee68',
                body
            );
            console.log('Mensaje enviado a Make:', makeResponse.status);
        } catch (error) {
            console.error('Error al enviar el mensaje a Make:', error.message);
        }

        // Confirma la recepción a WhatsApp
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.status(404).send('No encontrado');
    }
});

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
