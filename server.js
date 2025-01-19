const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Para enviar solicitudes

const app = express();
app.use(bodyParser.json());

// Token de verificación
const VERIFY_TOKEN = 'mi_token_secreto';
const ACCESS_TOKEN = 'EAAG8R2yWJOwBO3GpiXFoemE3R28SHLFlTHrZCY08dRbp4DyGNfUXEzFZAzPd5KrvIgO4mV0lFtjDLfCAZCdx9RgZBz2p82RqPZB1TZCap5DFjFSOdnmBphZBoNBWngVhEQRVLKZCunFsYook79E6ROjWEBzyAFtBSxZC6aBUICprp27gtHissBiWZAGf6Uc3ZCMMusn'; // Reemplazar con tu token de acceso de Meta

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

// Endpoint para recibir la respuesta de Make y enviar el mensaje a través de la API de WhatsApp
app.post('/send-message', async (req, res) => {
    const { to, response } = req.body;

    if (!to || !response) {
        return res.status(400).send('Datos incompletos');
    }

    try {
        // Construir el JSON para enviar el mensaje
        const data = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
                body: response
            }
        };

        // URL de la API de WhatsApp
        const url = `https://graph.facebook.com/v21.0/559822483873940/messages`; // Reemplaza <PHONE_NUMBER_ID> con tu número de teléfono ID

        // Enviar el mensaje a través de la API de WhatsApp
        const whatsappResponse = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Mensaje enviado a WhatsApp:', whatsappResponse.data);
        res.status(200).send('Mensaje enviado');
    } catch (error) {
        console.error('Error al enviar mensaje a WhatsApp:', error.response ? error.response.data : error.message);
        res.status(500).send('Error al enviar mensaje');
    }
});

app.post('/appointments', (req, res) => {
    const { phone_number, name, email, city, description, preferred_date, preferred_time, mode } = req.body;

    // Validar los datos recibidos
    if (!phone_number || !name || !city || !description || !preferred_date || !preferred_time) {
        return res.status(400).send('Todos los campos obligatorios deben completarse');
    }

    // Verificar que la modalidad sea válida si la ciudad es Barranquilla o Melbourne
    const validCities = ['Barranquilla', 'Melbourne'];
    if (validCities.includes(city) && !['Presencial', 'Virtual'].includes(mode)) {
        return res.status(400).send('Debe especificar si la cita será Presencial o Virtual para esta ciudad');
    }

    // Insertar la cita en la tabla appointments
    const sql = `
        INSERT INTO appointments 
        (phone_number, name, email, city, description, preferred_date, preferred_time, mode) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [phone_number, name, email, city, description, preferred_date, preferred_time, mode], (err, result) => {
        if (err) {
            console.error('Error al guardar la cita:', err.message);
            return res.status(500).send('Error al guardar la cita');
        }
        res.status(201).send({ message: 'Cita creada con éxito', id: result.insertId });
    });
});

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
