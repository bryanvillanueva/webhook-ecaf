const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// const axios = require('axios'); // No se usa por ahora, ya que no se envían mensajes a Make
// const multer = require('multer');
// const mysql = require('mysql2');
// const FormData = require('form-data');
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Token de verificación
const VERIFY_TOKEN = 'Mi_Nuevo_Token_Secreto_ECAF';
const PHONE_NUMBER_ID = '511705378704158'; // No se usa en este endpoint
const ACCESS_TOKEN = 'EAAJZASnMRogsBOyBcSh7jSjwQCRYb3i5NeZBP1sN7KgpkEN8WhvMNEym2ocH2g97vh53ZAy9GiDpZCBhSvZAuZCZBaYf173O6NahZCB3AeKDq4gEDlwy1JKYgr02dQN5Xpbfw2dx5yNlQJie3n3QlgTO2xDIbeT1ZCWlRZC1GaTDZAcX8fKzUCoA6QDVJwlNUuySIlEOQZDZD'; // Token de acceso de WhatsApp (no se usa por ahora)

// ----------------------------------------------------------------------------
// Endpoint para la verificación del webhook (GET)
// ----------------------------------------------------------------------------
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Responde con el challenge para verificar el webhook
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Token inválido!');
    }
});

// ----------------------------------------------------------------------------
// Endpoint para recibir mensajes de WhatsApp (POST)
// ----------------------------------------------------------------------------
app.post('/webhook', (req, res) => {
    // Se imprime el payload recibido en el log del servidor
    console.log('Mensaje recibido en Webhook:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    // Se comprueba que se haya recibido un objeto válido
    if (body.object) {
        // Se comenta el envío a Make para esta prueba
        // const messagesArray = body.entry?.[0]?.changes?.[0]?.value?.messages;
        // let messageType = 'text'; // Por defecto
        // if (Array.isArray(messagesArray)) {
        //     const firstMessage = messagesArray[0];
        //     if (firstMessage) {
        //         messageType = firstMessage.type;
        //     }
        // }
        // console.log(`Mensaje de tipo: ${messageType}`);

        // Simplemente se responde con "EVENT_RECEIVED"
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.status(404).send('No encontrado');
    }
});

// ----------------------------------------------------------------------------
// Manejo de SIGTERM para un cierre controlado (útil en Railway)
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));

process.on("SIGTERM", () => {
    console.log("🔻 Señal SIGTERM recibida. Cerrando servidor...");
    server.close(() => {
        console.log("✅ Servidor cerrado correctamente.");
        process.exit(0);
    });
});
