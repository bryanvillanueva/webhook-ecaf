const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Para enviar solicitudes
const cors = require('cors'); // Para habilitar CORS
const multer = require('multer');
const mysql = require('mysql2'); // Para conectarse a la base de datos
const FormData = require('form-data'); // Add this import at the top of your file
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bcryptjs = require('bcryptjs');

// Importa Socket.IO y configura el servidor HTTP
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*", // En producción, limita esto a tus dominios permitidos
    methods: ["GET", "POST"]
  }
});

// Configura Socket.IO para las conexiones
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado a Socket.IO:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado de Socket.IO:', socket.id);
  });
});


const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

const db = mysql.createPool({
    host: 'srv1041.hstgr.io',
    user: 'u255066530_ecafAdmin',
    password: 'wZ>3QG:WBk|BS0l$$BjBA0E4y',
    database: 'u255066530_ecaf',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
}); 

// Verifica la conexión a la base de datos
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos MySQL');
        connection.release(); // Liberar la conexión
    }
}); 

// Crear una conexión a la segunda base de datos (GoDaddy)
const authDB = mysql.createPool({
  host: '192.169.145.218',      // Reemplaza con la dirección de tu servidor GoDaddy
  user: 'plataforma',                    // Reemplaza con tu usuario
  password: 'NR22gBzwXtkje4a',             // Reemplaza con tu contraseña 
  database: 'ecaf_plataforma', // Reemplaza con el nombre de tu base de datos
  waitForConnections: true,
  connectionLimit: 5,                    // Menor límite de conexiones para autenticación
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Verifica la conexión a la base de datos de autenticación
authDB.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos de autenticación:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos de autenticación en GoDaddy');
    connection.release(); // Liberar la conexión
  }
});

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});



 // Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
}) 




 // Configure multer to store the file in memory

const storage = multer.memoryStorage();

const upload = multer({ storage }); // Esto es necesario */

// Token de verificación
const PHONE_NUMBER_ID = '511705378704158';
const VERIFY_TOKEN = 'Mi_Nuevo_Token_Secreto_ECAF';
const ACCESS_TOKEN = 'EAAJZASnMRogsBOyBcSh7jSjwQCRYb3i5NeZBP1sN7KgpkEN8WhvMNEym2ocH2g97vh53ZAy9GiDpZCBhSvZAuZCZBaYf173O6NahZCB3AeKDq4gEDlwy1JKYgr02dQN5Xpbfw2dx5yNlQJie3n3QlgTO2xDIbeT1ZCWlRZC1GaTDZAcX8fKzUCoA6QDVJwlNUuySIlEOQZDZD'; // 

const fs = require('fs');

// 📌 Endpoint para manejar la verificación del webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Token inválido!');
    }
});
 
// 📌 Endpoint para recibir mensajes de WhatsApp y enviarlos a Make (text, audio, image, document)
app.post('/webhook', async (req, res) => {
  console.log('Mensaje recibido en Webhook:', JSON.stringify(req.body, null, 2));
  const body = req.body;

  if (body.object) {
      // Assume messages are in: body.entry[0].changes[0].value.messages
      const messagesArray = body.entry?.[0]?.changes?.[0]?.value?.messages;

      // Determine message type
      let messageType = 'text'; // default
      if (Array.isArray(messagesArray)) {
          const firstMessage = messagesArray[0];
          if (firstMessage) {
              messageType = firstMessage.type;
          }
      }

      // Choose target webhook URL based on message type
      const webhookMap = {
          'text': 'https://hook.eu2.make.com/ue8dxmxmuq6sr5own5yftq89ynethvqn',
          'audio': 'https://hook.eu2.make.com/pch3avcjrya2et6gqol5vdoyh11txfrl',
          'image': 'https://hook.eu2.make.com/smdk4pbh2txc94fdvj73mmpt3ehdxuj3',
          'document': 'https://hook.eu2.make.com/smdk4pbh2txc94fdvj73mmpt3ehdxuj3'
      };

      // Default to text webhook if type is not recognized
      const targetWebhook = webhookMap[messageType] || webhookMap['text'];

      try {
          const makeResponse = await axios.post(targetWebhook, body);
          console.log('✅ Mensaje enviado a Make:', makeResponse.status, 'Webhook:', targetWebhook);
      } catch (error) {
          console.error('❌ Error al enviar mensaje a Make:', error.message);
      }

      res.status(200).send('EVENT_RECEIVED');
  } else {
      res.status(404).send('No encontrado');
  }
});


// 📌 Endpoint para enviar mensajes de respuesta a WhatsApp
app.post('/send-message', async (req, res) => {
    const { to, response } = req.body;

    if (!to || !response) {
        return res.status(400).send('Datos incompletos');
    }

    try {
        const data = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: response }
        };

        const url = `https://graph.facebook.com/v22.0/511705378704158/messages`;

        const whatsappResponse = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Mensaje enviado a WhatsApp:', whatsappResponse.data);
        res.status(200).send('Mensaje enviado');
    } catch (error) {
        console.error('❌ Error al enviar mensaje a WhatsApp:', error.response ? error.response.data : error.message);
        res.status(500).send('Error al enviar mensaje');
    }
});


app.post('/send-manual-message', async (req, res) => {
    // Expecting: to (recipient phone), conversationId, message (text), and optionally sender
    const { to, conversationId, message, sender } = req.body;
  
    if (!to || !conversationId || !message) {
      return res.status(400).send('Missing required fields: to, conversationId, and message are required.');
    }
  
    try {
      // Build the payload to send via WhatsApp API
      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      };
  
      const url = `https://graph.facebook.com/v22.0/511705378704158/messages`;
  
      // Send the message via the WhatsApp API
      const whatsappResponse = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
  
      console.log('✅ Manual message sent to WhatsApp:', whatsappResponse.data);
  
      // After successful sending, insert the message into the database
      const sql = `
        INSERT INTO messages (conversation_id, sender, message, sent_at)
        VALUES (?, ?, ?, NOW())
      `;
      // Use "Sharky" as default sender if not provided
      db.query(sql, [conversationId, sender || 'Sharky', message], (err, result) => {
        if (err) {
          console.error('❌ Error storing message in DB:', err.message);
          return res.status(500).json({ error: 'Error storing message in DB' });
        }
        res.status(200).json({ message: 'Message sent and stored successfully', insertId: result.insertId });
      });
    } catch (error) {
      console.error('❌ Error sending manual message:', error.response ? error.response.data : error.message);
      res.status(500).send('Error sending manual message');
    }
  });

// 📌 Endpoint para obtener todas las conversaciones con el último mensaje
app.get('/api/conversations', (req, res) => {
    const sql = `
SELECT 
    c.id AS conversation_id, 
    c.client_id, 
    cl.name AS client_name, 
    c.status,
    c.autoresponse,
    (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message,
    (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message_type,
    (SELECT sender FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message_sender,
    c.last_message_at
FROM conversations c
JOIN clients cl ON c.client_id = cl.id
ORDER BY c.last_message_at ASC;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error al obtener conversaciones:', err.message);
            return res.status(500).json({ error: 'Error al obtener conversaciones' });
        }
        res.json(results);
    });
});


app.get('/api/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;

    const sql = `
        SELECT 
            id AS message_id, 
            sender, 
            message_type,
            media_id,
            CASE 
              WHEN message_type = 'audio' THEN media_url 
              ELSE message 
            END AS message,
            sent_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY sent_at ASC;
    `;

    db.query(sql, [conversationId], (err, results) => {
        if (err) {
            console.error('❌ Error al obtener mensajes:', err.message);
            return res.status(500).json({ error: 'Error al obtener mensajes' });
        }
        res.json(results);
    });
});


  // 📌 New Endpoint for fetching details of a single conversation
  app.get('/api/conversation-detail/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const sql = `
      SELECT 
        c.id AS conversation_id, 
        c.client_id, 
        cl.name AS client_name, 
        c.status,
        c.autoresponse,
        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message,
        c.last_message_at
      FROM conversations c
      JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
    `;
    db.query(sql, [conversationId], (err, results) => {
      if (err) {
        console.error('❌ Error al obtener la conversación:', err.message);
        return res.status(500).json({ error: 'Error al obtener la conversación' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Conversación no encontrada' });
      }
      res.json(results[0]);
    });
  });
  

// 📌 Endpoint to update the autoresponse value for a conversation
app.put('/api/conversations/:conversationId/autoresponse', (req, res) => {
    const { conversationId } = req.params;
    const { autoresponse } = req.body;
  
    // Validate that the autoresponse field is provided
    if (typeof autoresponse === 'undefined') {
      return res.status(400).json({ error: 'Missing autoresponse field in request body' });
    }
  
    const sql = 'UPDATE conversations SET autoresponse = ? WHERE id = ?';
    db.query(sql, [autoresponse, conversationId], (err, result) => {
      if (err) {
        console.error('❌ Error updating autoresponse:', err.message);
        return res.status(500).json({ error: 'Error updating autoresponse' });
      }
      res.status(200).json({ message: 'Autoresponse updated successfully' });
    });
  });


 // Función para actualizar la URL en la base de datos
 async function updateMediaUrlInDatabase(mediaId, newUrl) {
    try {
      const [result] = await db.promise().execute(
        'UPDATE messages SET media_url = ? WHERE media_id = ?',
        [newUrl, mediaId]
      );
      console.log(`✅ URL actualizada para mediaId: ${mediaId}, filas afectadas: ${result.affectedRows}`);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Error al actualizar la URL en la base de datos:', error.message);
      throw error;
    }
  }
  
 // Endpoint para obtener la URL del audio a partir de su mediaId (primera vez)
app.get('/api/media-url/:mediaId', async (req, res) => {
    const { mediaId } = req.params;
    try {
      const response = await axios.get(`https://graph.facebook.com/v13.0/${mediaId}`, {
        params: { access_token: ACCESS_TOKEN }
      });
      // Simplemente devolvemos la URL, asumiendo que Make se encarga de guardarla
      res.json({ url: response.data.url });
    } catch (error) {
      console.error('❌ Error fetching media URL:', error.message);
      res.status(500).json({ error: 'Error fetching media URL' });
    }
  });

  // Endpoint para renovar una URL expirada
app.get('/api/renew-media-url/:mediaId', async (req, res) => {
    const { mediaId } = req.params;
    try {
      const response = await axios.get(`https://graph.facebook.com/v13.0/${mediaId}`, {
        params: { access_token: ACCESS_TOKEN }
      });
      
      // Actualizar la URL en la base de datos
      await updateMediaUrlInDatabase(mediaId, response.data.url);
      
      res.json({ url: response.data.url });
    } catch (error) {
      console.error('❌ Error renovando media URL:', error.message);
      res.status(500).json({ error: 'Error renovando media URL' });
    }
  });



  // Proxy endpoint para descargar la media y enviarla al frontend
app.get('/api/download-media', async (req, res) => {
    const { url, mediaId } = req.query; // URL del audio y mediaId almacenados en DB
    
    if (!url) {
      return res.status(400).json({ error: 'Se requiere URL' });
    }
    
    // Función para verificar si una respuesta es un archivo de audio válido
    const isValidAudioResponse = (response) => {
      const contentType = response.headers['content-type'] || '';
      // Verificar si el contentType comienza con audio/ o es application/octet-stream
      return contentType.startsWith('audio/') || contentType === 'application/octet-stream';
    };
    
    try {
      let audioResponse;
      let needNewUrl = false;
      
      // Intentar descargar con la URL existente
      try {
        audioResponse = await axios.get(url, { 
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        
        // Verificar si la respuesta parece ser un archivo de audio válido
        if (!isValidAudioResponse(audioResponse)) {
          console.log('🔍 La respuesta no parece ser un archivo de audio válido');
          needNewUrl = true;
        }
      } catch (error) {
        console.log('🔄 Error con la URL original:', error.message);
        needNewUrl = true;
      }
      
      // Si necesitamos una nueva URL y tenemos el mediaId
      if (needNewUrl && mediaId) {
        console.log('🔄 Obteniendo una nueva URL para mediaId:', mediaId);
        
        try {
          // Obtener una nueva URL usando el mediaId
          const mediaResponse = await axios.get(`https://graph.facebook.com/v13.0/${mediaId}`, {
            params: { access_token: ACCESS_TOKEN }
          });
          
          const newUrl = mediaResponse.data.url;
          
          // Actualizar la URL en la base de datos
          await updateMediaUrlInDatabase(mediaId, newUrl);
          
          // Intentar la descarga con la nueva URL
          audioResponse = await axios.get(newUrl, { 
            responseType: 'arraybuffer',
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
          });
          
          // Verificar nuevamente si parece un archivo de audio válido
          if (!isValidAudioResponse(audioResponse)) {
            throw new Error('La respuesta con la nueva URL tampoco es un archivo de audio válido');
          }
        } catch (refreshError) {
          console.error('❌ Error al obtener o usar la nueva URL:', refreshError.message);
          return res.status(500).json({ error: 'No se pudo obtener o usar una nueva URL para el archivo de audio' });
        }
      }
      
      // Si llegamos aquí, tenemos una respuesta válida
      const contentType = audioResponse.headers['content-type'] || 'audio/ogg';
      res.setHeader('Content-Type', contentType);
      return res.send(Buffer.from(audioResponse.data, 'binary'));
      
    } catch (error) {
      console.error('❌ Error fetching media:', error.message);
      res.status(500).json({ error: 'Error fetching media' });
    }
  });

// 📌 Endpoint para editar mensajes
app.put('/api/edit-message/:messageId', (req, res) => {
  const { messageId } = req.params;
  const { newMessage } = req.body;

  if (!messageId || newMessage === undefined) {
    return res.status(400).json({ error: 'Message ID and new message are required' });
  }

  const sql = 'UPDATE messages SET message = ? WHERE id = ?';
  db.query(sql, [newMessage, messageId], (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar el mensaje en la base de datos:', err.message);
      return res.status(500).json({ error: 'Error al actualizar el mensaje en la base de datos' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado o sin cambios' });
    }

    res.status(200).json({ 
      message: 'Mensaje actualizado correctamente',
      messageId: messageId,
      newContent: newMessage
    });
  });
});
// 📌 Endpoint para eliminar mensajes
app.delete('/api/delete-message/:messageId', (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  const sql = 'DELETE FROM messages WHERE id = ?';
  db.query(sql, [messageId], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar el mensaje en la base de datos:', err.message);
      return res.status(500).json({ error: 'Error al eliminar el mensaje en la base de datos' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.status(200).json({ 
      message: 'Mensaje eliminado correctamente',
      messageId: messageId
    });
  });
});


  // DASHBOARD //
/// Endpoint para obtener información del dashboard
app.get('/api/dashboard-info', (req, res) => {
    // Total de mensajes en la tabla de mensajes
    const queryTotalMessages = 'SELECT COUNT(*) AS total_mensajes FROM messages';
    // Mensajes enviados por Sharky
    const queryMessagesSharky = 'SELECT COUNT(*) AS mensajes_sharky FROM messages WHERE sender = "Sharky"';
    // Total de usuarios (clientes únicos) en conversaciones
    const queryTotalUsers = 'SELECT COUNT(DISTINCT client_id) AS total_usuarios FROM conversations';
    // Mensajes pendientes: conversaciones cuyo último mensaje no fue enviado por "Sharky"
    const queryPending = `
      SELECT COUNT(*) AS mensajes_pendientes
      FROM (
        SELECT c.id, 
          (SELECT sender FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message_sender
        FROM conversations c
      ) AS conv
      WHERE last_message_sender != 'Sharky'
    `;
    // Timeline global de mensajes recibidos (sender != "Sharky"), agrupados por fecha
    const queryTimeline = `
      SELECT DATE(sent_at) AS date, COUNT(*) AS count 
      FROM messages 
      WHERE sender != 'Sharky'
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `;
  
    db.query(queryTotalMessages, (err, totalMessagesResult) => {
      if (err) {
        console.error('❌ Error al obtener total de mensajes:', err.message);
        return res.status(500).json({ error: 'Error al obtener total de mensajes' });
      }
      const total_mensajes = totalMessagesResult[0].total_mensajes;
  
      db.query(queryMessagesSharky, (err, messagesSharkyResult) => {
        if (err) {
          console.error('❌ Error al obtener mensajes de Sharky:', err.message);
          return res.status(500).json({ error: 'Error al obtener mensajes de Sharky' });
        }
        const mensajes_sharky = messagesSharkyResult[0].mensajes_sharky;
  
        db.query(queryTotalUsers, (err, totalUsersResult) => {
          if (err) {
            console.error('❌ Error al obtener total de usuarios:', err.message);
            return res.status(500).json({ error: 'Error al obtener total de usuarios' });
          }
          const total_usuarios = totalUsersResult[0].total_usuarios;
  
          db.query(queryPending, (err, pendingResult) => {
            if (err) {
              console.error('❌ Error al obtener mensajes pendientes:', err.message);
              return res.status(500).json({ error: 'Error al obtener mensajes pendientes' });
            }
            const mensajes_pendientes = pendingResult[0].mensajes_pendientes;
  
            db.query(queryTimeline, (err, timelineResult) => {
              if (err) {
                console.error('❌ Error al obtener timeline de mensajes:', err.message);
                return res.status(500).json({ error: 'Error al obtener timeline de mensajes' });
              }
              res.json({
                total_mensajes,
                mensajes_sharky,
                total_usuarios,
                mensajes_pendientes,
                timeline: timelineResult
              });
            });
          });
        });
      });
    });
  });
  

  // END DASHBOARD //

  // Endpoint to send media messages (documents or images) from the frontend
// Expected fields in the request body:
// - to: recipient phone number
// - mediaType: either "image" or "document"
// - caption: (optional) caption for the media message
// And a file uploaded with key "file"
// Endpoint to send media messages (documents or images) from the frontend
// Endpoint para enviar imágenes según la documentación oficial de WhatsApp
app.post('/api/send-media', upload.single('file'), async (req, res) => {
  try {
    console.log('📝 Solicitud para enviar media recibida');
    const { to, conversationId, caption = '', sender = 'Sharky' } = req.body;
    
    if (!to || !conversationId) {
      console.error('❌ Faltan campos requeridos: to y conversationId');
      return res.status(400).json({ error: 'Missing required fields: to and conversationId are required.' });
    }
    
    if (!req.file) {
      console.error('❌ No se encontró el archivo en la solicitud');
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    // Determinar el tipo de medio basado en MIME
    let mediaType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (req.file.mimetype.startsWith('audio/')) {
      mediaType = 'audio';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    }
    
    console.log(`📤 Preparando para enviar ${mediaType} a ${to}`);
    
    // 1. Primero, cargar el archivo multimedia a la API de WhatsApp
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    console.log('📤 Subiendo media a WhatsApp API...');
    const mediaUploadUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/media`;
    
    try {
      const mediaResponse = await axios.post(mediaUploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      if (!mediaResponse.data || !mediaResponse.data.id) {
        console.error('❌ La API de WhatsApp no devolvió un ID de media válido');
        return res.status(500).json({ error: 'Failed to upload media to WhatsApp.' });
      }
      
      const mediaId = mediaResponse.data.id;
      console.log(`✅ Media subido correctamente, ID: ${mediaId}`);
      
      // 2. Enviar el mensaje con el ID del multimedia
      const messagesUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: mediaType
      };
      
      // Añadir el objeto de medio según el tipo
      payload[mediaType] = { 
        id: mediaId,
        caption: caption || ''
      };
      
      console.log(`📤 Enviando mensaje con ${mediaType}...`);
      
      const messageResponse = await axios.post(messagesUrl, payload, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Mensaje con media enviado: ${JSON.stringify(messageResponse.data)}`);
      
      // 3. Obtener la URL del multimedia para acceder al contenido
      console.log(`🔍 Obteniendo URL para el media ID: ${mediaId}...`);
      const getMediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
      const mediaUrlResponse = await axios.get(getMediaUrl, {
        params: { access_token: ACCESS_TOKEN }
      });
      
      if (!mediaUrlResponse.data || !mediaUrlResponse.data.url) {
        console.error('❌ No se pudo obtener la URL del media');
        return res.status(500).json({ error: 'Failed to get media URL from WhatsApp.' });
      }
      
      const mediaUrl = mediaUrlResponse.data.url;
      console.log(`✅ URL del media obtenida: ${mediaUrl.substring(0, 30)}...`);
      
      // 4. Guardar en la base de datos
      const sql = `
        INSERT INTO messages (conversation_id, sender, message_type, media_id, media_url, message, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      
      db.query(sql, [conversationId, sender, mediaType, mediaId, mediaUrl, caption || ''], (err, result) => {
        if (err) {
          console.error(`❌ Error al guardar mensaje en la BD: ${err.message}`);
          return res.status(500).json({ error: 'Error al guardar mensaje en la base de datos' });
        }
        
        console.log(`✅ Mensaje con media guardado en BD, ID: ${result.insertId}`);
        
        // 5. Responder al cliente con la información necesaria
        res.status(200).json({
          message: `${mediaType} sent and stored successfully`,
          mediaId,
          mediaUrl,
          messageId: result.insertId
        });
      });
      
    } catch (apiError) {
      console.error('❌ Error en la API de WhatsApp:', 
                    apiError.response?.data ? JSON.stringify(apiError.response.data) : apiError.message);
      return res.status(apiError.response?.status || 500).json({
        error: 'Error with WhatsApp API',
        details: apiError.response?.data || apiError.message
      });
    }
    
  } catch (error) {
    console.error(`❌ Error general enviando media: ${error.message}`);
    res.status(500).json({ 
      error: 'Error sending media message', 
      details: error.message 
    });
  }
});

// Endpoint para obtener la URL de una imagen desde la base de datos o renovarla si ha expirado
app.get('/api/media-url/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  if (!mediaId) {
    return res.status(400).json({ error: 'Media ID is required' });
  }

  console.log(`🔍 Solicitud de URL para media: ${mediaId}${forceRefresh ? ' (forzando actualización)' : ''}`);

  try {
    // Buscar la URL y el tipo de mensaje en la base de datos
    const sql = 'SELECT media_url, message_type FROM messages WHERE media_id = ? LIMIT 1';
    db.query(sql, [mediaId], async (err, results) => {
      if (err) {
        console.error('❌ Error al obtener media_url:', err.message);
        return res.status(500).json({ error: 'Error al obtener media_url' });
      }

      if (results.length === 0) {
        console.error(`❌ Media ID ${mediaId} no encontrado en la base de datos`);
        return res.status(404).json({ error: 'Media not found in database' });
      }

      const mediaUrl = results[0].media_url;
      const messageType = results[0].message_type;
      
      console.log(`ℹ️ Media encontrado: ID=${mediaId}, Type=${messageType}, URL=${mediaUrl?.substring(0, 30)}...`);

      // Si no es una imagen o no tiene URL, solo devolver lo que hay
      if (messageType !== 'image') {
        console.log(`⚠️ Media ID ${mediaId} no es una imagen (tipo: ${messageType}). Retornando URL actual.`);
        return res.json({ mediaUrl });
      }

      // Verificar si debemos renovar la URL (sea porque está expirada o porque se fuerza la actualización)
      let needsRefresh = forceRefresh;
      
      if (!forceRefresh) {
        try {
          const response = await axios.head(mediaUrl);
          if (response.status === 200) {
            console.log(`✅ URL de imagen válida para ${mediaId}`);
            needsRefresh = false;
          } else {
            console.log(`⚠️ URL de imagen para ${mediaId} devolvió estado ${response.status}`);
            needsRefresh = true;
          }
        } catch (error) {
          console.log(`🔄 URL de imagen expirada para ${mediaId}, validación falló: ${error.message}`);
          needsRefresh = true;
        }
      }

      // Si necesitamos actualizar la URL, obtener una nueva desde la API de WhatsApp
      if (needsRefresh) {
        try {
          console.log(`🔄 Obteniendo nueva URL para ${mediaId} desde la API de WhatsApp...`);
          const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
            params: { access_token: ACCESS_TOKEN }
          });

          if (!mediaResponse.data || !mediaResponse.data.url) {
            console.error(`❌ La API de WhatsApp no devolvió una URL válida para ${mediaId}`);
            return res.status(500).json({ error: 'No se pudo obtener una nueva URL desde WhatsApp' });
          }

          const newMediaUrl = mediaResponse.data.url;
          console.log(`🆕 Nueva URL obtenida para ${mediaId}: ${newMediaUrl.substring(0, 30)}...`);

          // Actualizar la URL en la base de datos
          const updateSql = 'UPDATE messages SET media_url = ? WHERE media_id = ?';
          db.query(updateSql, [newMediaUrl, mediaId], (updateErr) => {
            if (updateErr) {
              console.error(`❌ Error actualizando la media_url en la BD: ${updateErr.message}`);
            } else {
              console.log(`✅ URL actualizada en BD para ${mediaId}`);
            }
          });

          return res.json({ mediaUrl: newMediaUrl });
        } catch (error) {
          console.error(`❌ Error obteniendo la nueva media URL: ${error.message}`);
          return res.status(500).json({ error: 'Error obteniendo la nueva media URL' });
        }
      } else {
        // Devolver la URL actual si sigue siendo válida
        return res.json({ mediaUrl });
      }
    });
  } catch (error) {
    console.error(`❌ Error en el endpoint: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint proxy para descargar imágenes desde WhatsApp
app.get('/api/download-image/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  
  if (!mediaId) {
    return res.status(400).json({ error: 'Media ID is required' });
  }
  
  console.log(`🔍 Solicitud para descargar imagen con ID: ${mediaId}`);
  
  try {
    // 1. Primero obtener la URL desde WhatsApp API o la base de datos
    const sql = 'SELECT media_url, message_type FROM messages WHERE media_id = ? LIMIT 1';
    db.query(sql, [mediaId], async (err, results) => {
      if (err) {
        console.error('❌ Error al obtener media_url:', err.message);
        return res.status(500).json({ error: 'Error al obtener media_url' });
      }

      if (results.length === 0) {
        console.error(`❌ Media ID ${mediaId} no encontrado en la base de datos`);
        return res.status(404).json({ error: 'Media not found in database' });
      }

      let mediaUrl = results[0].media_url;
      const messageType = results[0].message_type;
      
      if (messageType !== 'image') {
        return res.status(400).json({ error: 'El media ID no corresponde a una imagen' });
      }
      
      // Verificar si la URL ha expirado
      let needsRefresh = false;
      try {
        const response = await axios.head(mediaUrl, {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        if (response.status !== 200) {
          needsRefresh = true;
        }
      } catch (error) {
        console.log(`🔄 URL de imagen expirada, obteniendo nueva...`);
        needsRefresh = true;
      }
      
      // Si la URL expiró, obtener una nueva
      if (needsRefresh) {
        try {
          const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
            params: { access_token: ACCESS_TOKEN }
          });
          
          if (!mediaResponse.data || !mediaResponse.data.url) {
            return res.status(500).json({ error: 'No se pudo obtener la URL de la imagen' });
          }
          
          mediaUrl = mediaResponse.data.url;
          
          // Actualizar la URL en la base de datos
          const updateSql = 'UPDATE messages SET media_url = ? WHERE media_id = ?';
          db.query(updateSql, [mediaUrl, mediaId], (updateErr) => {
            if (updateErr) {
              console.error(`❌ Error actualizando la media_url: ${updateErr.message}`);
            } else {
              console.log(`✅ URL actualizada en BD para ${mediaId}`);
            }
          });
        } catch (error) {
          console.error(`❌ Error obteniendo la nueva media URL: ${error.message}`);
          return res.status(500).json({ error: 'Error obteniendo la nueva media URL' });
        }
      }
      
      // 2. Descargar la imagen desde WhatsApp
      try {
        console.log(`📥 Descargando imagen desde URL: ${mediaUrl.substring(0, 30)}...`);
        const imageResponse = await axios.get(mediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        
        // 3. Determinar el tipo de contenido (MIME type)
        const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
        
        // 4. Enviar la imagen al frontend
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'max-age=300'); // Caché de 5 minutos
        return res.send(Buffer.from(imageResponse.data, 'binary'));
        
      } catch (error) {
        console.error(`❌ Error descargando la imagen: ${error.message}`);
        return res.status(500).json({ error: 'Error descargando la imagen' });
      }
    });
  } catch (error) {
    console.error(`❌ Error general: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint proxy para descargar documentos desde WhatsApp
app.get('/api/download-document/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  
  if (!mediaId) {
    return res.status(400).json({ error: 'Media ID is required' });
  }
  
  console.log(`🔍 Solicitud para descargar documento con ID: ${mediaId}`);
  
  try {
    // 1. Primero obtener la URL y el tipo de documento desde la base de datos
    const sql = 'SELECT media_url, message_type, message AS file_name FROM messages WHERE media_id = ? LIMIT 1';
    db.query(sql, [mediaId], async (err, results) => {
      if (err) {
        console.error('❌ Error al obtener media_url:', err.message);
        return res.status(500).json({ error: 'Error al obtener media_url' });
      }

      if (results.length === 0) {
        console.error(`❌ Media ID ${mediaId} no encontrado en la base de datos`);
        return res.status(404).json({ error: 'Media not found in database' });
      }

      let mediaUrl = results[0].media_url;
      const messageType = results[0].message_type;
      // Usar el campo message como nombre del archivo si está disponible
      const fileName = results[0].file_name || `document-${mediaId}.pdf`;
      
      if (messageType !== 'document') {
        return res.status(400).json({ error: 'El media ID no corresponde a un documento' });
      }
      
      // Verificar si la URL ha expirado
      let needsRefresh = false;
      try {
        const response = await axios.head(mediaUrl, {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        if (response.status !== 200) {
          needsRefresh = true;
        }
      } catch (error) {
        console.log(`🔄 URL de documento expirada, obteniendo nueva...`);
        needsRefresh = true;
      }
      
      // Si la URL expiró, obtener una nueva
      if (needsRefresh) {
        try {
          const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
            params: { access_token: ACCESS_TOKEN }
          });
          
          if (!mediaResponse.data || !mediaResponse.data.url) {
            return res.status(500).json({ error: 'No se pudo obtener la URL del documento' });
          }
          
          mediaUrl = mediaResponse.data.url;
          
          // Actualizar la URL en la base de datos
          const updateSql = 'UPDATE messages SET media_url = ? WHERE media_id = ?';
          db.query(updateSql, [mediaUrl, mediaId], (updateErr) => {
            if (updateErr) {
              console.error(`❌ Error actualizando la media_url: ${updateErr.message}`);
            } else {
              console.log(`✅ URL actualizada en BD para ${mediaId}`);
            }
          });
        } catch (error) {
          console.error(`❌ Error obteniendo la nueva media URL: ${error.message}`);
          return res.status(500).json({ error: 'Error obteniendo la nueva media URL' });
        }
      }
      
      // 2. Descargar el documento desde WhatsApp
      try {
        console.log(`📥 Descargando documento desde URL: ${mediaUrl.substring(0, 30)}...`);
        const documentResponse = await axios.get(mediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        
        // 3. Determinar el tipo de contenido (MIME type)
        // Si el nombre del archivo contiene una extensión, intentar determinar el MIME type basado en eso
        let contentType = 'application/octet-stream'; // Default
        
        if (fileName.endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (fileName.endsWith('.doc')) {
          contentType = 'application/msword';
        } else if (fileName.endsWith('.docx')) {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileName.endsWith('.xls')) {
          contentType = 'application/vnd.ms-excel';
        } else if (fileName.endsWith('.xlsx')) {
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (fileName.endsWith('.ppt')) {
          contentType = 'application/vnd.ms-powerpoint';
        } else if (fileName.endsWith('.pptx')) {
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        } else {
          // Intentar determinar a partir de headers de respuesta
          contentType = documentResponse.headers['content-type'] || contentType;
        }
        
        // 4. Enviar el documento al frontend
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Cache-Control', 'max-age=300'); // Caché de 5 minutos
        return res.send(Buffer.from(documentResponse.data, 'binary'));
        
      } catch (error) {
        console.error(`❌ Error descargando el documento: ${error.message}`);
        return res.status(500).json({ error: 'Error descargando el documento' });
      }
    });
  } catch (error) {
    console.error(`❌ Error general: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// CERTIFICADOS //

// Endpoint para crear un nuevo certificado

app.post('/api/certificados', (req, res) => {
  // Extraemos los datos enviados en el cuerpo de la solicitud
  const { nombre, apellido, tipo_identificacion, numero_identificacion, tipo_certificado, telefono, correo } = req.body;

  // Validamos que se hayan enviado todos los campos requeridos
  if (!nombre || !apellido || !tipo_identificacion || !numero_identificacion || !tipo_certificado || !telefono || !correo) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Preparamos la consulta SQL para insertar el registro.
  // La columna "estado" se asigna por defecto a 'pendiente' y "created_at" se genera automáticamente.
  const sql = `
    INSERT INTO certificados 
      (nombre, apellido, tipo_identificacion, numero_identificacion, tipo_certificado, telefono, correo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [nombre, apellido, tipo_identificacion, numero_identificacion, tipo_certificado, telefono, correo], (err, result) => {
    if (err) {
      console.error('❌ Error al insertar certificado:', err.message);
      return res.status(500).json({ error: 'Error al insertar certificado en la base de datos' });
    }
    res.status(201).json({ message: 'Certificado insertado exitosamente', id: result.insertId });
  });
});

// Endpoint para obtener todos los certificados

app.get('/api/certificados', (req, res) => {
  const sql = `SELECT * FROM certificados ORDER BY created_at ASC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener certificados:', err.message);
      return res.status(500).json({ error: 'Error al obtener certificados de la base de datos' });
    }
    res.json(results);
  });
});


// LOGIN // 

// Endpoint para autenticación (inicio de sesión) usando username/email y contraseña
app.post('/api/login', (req, res) => {
  const { username, email, password } = req.body;
  
  // Logs para depuración (ocultar la contraseña en los logs)
  console.log('🔐 Solicitud de login recibida:', {
    username: username || 'no proporcionado',
    email: email || 'no proporcionado',
    passwordProvided: !!password
  });

  // Validar que se haya proporcionado (username o email) y contraseña
  if ((!username && !email) || !password) {
    console.log('❌ Faltan datos de login requeridos');
    return res.status(400).json({ error: 'Se requiere username o email y contraseña.' });
  }

  // Solución rápida para el usuario admin (usar para pruebas iniciales)
  if ((username === 'admin' || email === 'admin@ecaf.com') && password === 'Ecafadmin2024*') {
    console.log('✅ Admin login con credenciales directas');
    
    // Crear un objeto de usuario simulado para el administrador
    const adminUser = {
      id: 1,
      username: 'admin',
      email: 'admin@ecaf.com',
      firstname: 'Administrador',
      lastname: 'ECAF',
      role: 'admin'
    };
    
    return res.json({ 
      message: 'Inicio de sesión exitoso.', 
      user: adminUser 
    });
  }

  // Construir la consulta SQL según los datos enviados
  let sqlQuery = '';
  let params = [];
  
  if (username && email) {
    sqlQuery = 'SELECT * FROM mdl_user WHERE (username = ? OR email = ?) LIMIT 1';
    params = [username, email];
  } else if (username) {
    sqlQuery = 'SELECT * FROM mdl_user WHERE username = ? LIMIT 1';
    params = [username];
  } else {
    sqlQuery = 'SELECT * FROM mdl_user WHERE email = ? LIMIT 1';
    params = [email];
  }

  console.log('🔍 Buscando usuario en la base de datos authDB...');
  
  authDB.query(sqlQuery, params, async (err, results) => {
    if (err) {
      console.error('❌ Error al consultar el usuario:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    if (results.length === 0) {
      console.log('⚠️ Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = results[0];
    console.log('✅ Usuario encontrado, verificando contraseña...');
    
    try {
      // Verificación con bcryptjs - esto maneja el salting automáticamente
      // Si el hash está en formato bcrypt ($2y$, $2a$, etc.), esto funcionará
      const match = await bcryptjs.compare(password, user.password);
      
      if (match) {
        console.log('✅ Contraseña correcta, login exitoso para:', user.username);
        
        // Crear copia del usuario sin la contraseña
        const userResponse = { ...user };
        delete userResponse.password;
        
        // Devolver respuesta exitosa
        return res.json({ 
          message: 'Inicio de sesión exitoso.', 
          user: userResponse 
        });
      } else {
        console.log('❌ Contraseña incorrecta para usuario:', user.username);
        
        // Comprobación de respaldo: comparar directamente (útil si las contraseñas no usan bcrypt)
        if (password === user.password) {
          console.log('✅ Contraseña correcta (verificación directa), login exitoso para:', user.username);
          
          const userResponse = { ...user };
          delete userResponse.password;
          
          return res.json({ 
            message: 'Inicio de sesión exitoso.', 
            user: userResponse 
          });
        }
        
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }
    } catch (error) {
      console.error('❌ Error en verificación de contraseña:', error.message);
      
      // Si bcryptjs.compare falla, intenta comparación directa como último recurso
      if (password === user.password) {
        console.log('✅ Contraseña correcta (fallback), login exitoso para:', user.username);
        
        const userResponse = { ...user };
        delete userResponse.password;
        
        return res.json({ 
          message: 'Inicio de sesión exitoso.', 
          user: userResponse 
        });
      }
      
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }
  });
});

// Ruta para verificar el token (útil para mantener la sesión)
app.post('/api/verify-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ valid: false });
  }
  
  try {
    // Decodificar el token básico
    const tokenData = JSON.parse(atob(token));
    
    // Verificar si ha expirado
    if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
      console.log('⚠️ Token expirado');
      return res.status(401).json({ valid: false, reason: 'expired' });
    }
    
    return res.status(200).json({ valid: true, userId: tokenData.userId });
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res.status(401).json({ valid: false, reason: 'invalid' });
  }
});


// Endpoint para verificar el rol de un usuario en Moodle
app.get('/api/moodle/user-role/:username', (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere un nombre de usuario'
    });
  }
  
  console.log(`🔍 Verificando rol para el usuario: ${username}`);
  
  const query = `
    SELECT u.id, u.username, u.email, r.shortname AS role, r.id AS roleId
    FROM mdl_user u
    JOIN mdl_role_assignments ra ON u.id = ra.userid
    JOIN mdl_role r ON ra.roleid = r.id
    WHERE u.username = ?
  `;
  
  // Usar la conexión a la base de datos de autenticación (authDB)
  authDB.query(query, [username], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar el rol del usuario:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar el rol del usuario',
        error: err.message
      });
    }
    
    if (results.length === 0) {
      console.log(`⚠️ Usuario '${username}' no encontrado o sin roles asignados`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin roles asignados'
      });
    }
    
    console.log(`✅ Roles encontrados para '${username}':`, results.map(r => r.role).join(', '));
    
    // Un usuario puede tener múltiples roles, así que enviamos todos
    res.status(200).json({
      success: true,
      data: {
        userId: results[0].id,
        username: results[0].username,
        email: results[0].email,
        roles: results.map(row => ({
          roleId: row.roleId,
          roleName: row.role
        }))
      }
    });
  });
});

// Endpoint para verificar si un usuario es administrador
app.get('/api/moodle/is-admin/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere un ID de usuario'
    });
  }
  
  console.log(`🔍 Verificando si el usuario con ID ${userId} es administrador`);
  
  const query = `
    SELECT COUNT(*) AS isAdmin
    FROM mdl_role_assignments ra
    JOIN mdl_role r ON ra.roleid = r.id
    WHERE ra.userid = ?
    AND r.shortname IN ('admin', 'manager', 'administrator')
  `;
  
  // Usar la conexión a la base de datos de autenticación (authDB)
  authDB.query(query, [userId], (err, results) => {
    if (err) {
      console.error('❌ Error al verificar si el usuario es administrador:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar el rol de administrador',
        error: err.message
      });
    }
    
    const isAdmin = results[0].isAdmin > 0;
    console.log(`✅ Usuario ${userId} es administrador: ${isAdmin ? 'Sí' : 'No'}`);
    
    res.status(200).json({
      success: true,
      isAdmin
    });
  });
});

// Endpoint para obtener el rol del usuario actualmente autenticado
app.get('/api/moodle/my-role', (req, res) => {
  // Obtener el username o userId del token de la sesión actual
  // Esta implementación depende de cómo estés manejando la autenticación
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No se proporcionó token de autenticación'
    });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    // Asumiendo que tienes el username en el token (ajusta según tu implementación)
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (!tokenData.username) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    
    // Redirigir al endpoint de verificación de rol con el username obtenido
    req.params.username = tokenData.username;
    return app.handle(req, res, req.url);
    
  } catch (error) {
    console.error('❌ Error al decodificar el token:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: error.message
    });
  }
});


// NOTIFICACIONES Y CAMBIOS DE ESTADOS EN LOS CERTIFICADOS //

// Endpoint para obtener todas las notificaciones
app.get('/api/certificados/notificaciones', (req, res) => {
  const { limit = 50, offset = 0, unreadOnly = false } = req.query;
  
  let sql = `
    SELECT n.*, c.nombre, c.apellido, c.tipo_certificado
    FROM certificate_notifications n
    JOIN certificados c ON n.certificate_id = c.id
  `;
  
  if (unreadOnly === 'true') {
    sql += ' WHERE n.read_status = FALSE';
  }
  
  sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
  
  db.query(sql, [parseInt(limit), parseInt(offset)], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener notificaciones:', err.message);
      return res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
    
    res.json(results);
  });
});

// Endpoint para marcar notificaciones como leídas
app.put('/api/certificados/notificaciones/marcar-leidas', (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de IDs' });
  }
  
  const sql = 'UPDATE certificate_notifications SET read_status = TRUE WHERE id IN (?)';
  
  db.query(sql, [ids], (err, result) => {
    if (err) {
      console.error('❌ Error al marcar notificaciones como leídas:', err.message);
      return res.status(500).json({ error: 'Error al actualizar notificaciones' });
    }
    
    res.json({ 
      message: 'Notificaciones marcadas como leídas', 
      count: result.affectedRows 
    });
  });
});

// Endpoint para obtener el conteo de notificaciones no leídas
app.get('/api/certificados/notificaciones/contador', (req, res) => {
  const sql = 'SELECT COUNT(*) AS count FROM certificate_notifications WHERE read_status = FALSE';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener contador de notificaciones:', err.message);
      return res.status(500).json({ error: 'Error al obtener contador' });
    }
    
    res.json({ count: results[0].count });
  });
});

// Sistema de polling para detectar nuevas notificaciones
let lastNotificationId = 0; // Almacena el ID de la última notificación procesada

// Función para inicializar el sistema de notificaciones
async function initNotificationSystem() {
  try {
    // Obtener el ID de la última notificación actual
    const [result] = await db.promise().query('SELECT MAX(id) as maxId FROM certificate_notifications');
    lastNotificationId = result[0].maxId || 0;
    
    console.log(`✅ Sistema de notificaciones inicializado. Última notificación ID: ${lastNotificationId}`);
    
    // Iniciar el polling
    startNotificationPolling();
  } catch (error) {
    console.error('❌ Error al inicializar sistema de notificaciones:', error.message);
  }
}

// Función para verificar nuevas notificaciones periódicamente
function startNotificationPolling() {
  const POLLING_INTERVAL = 10000; // 10 segundos
  
  setInterval(async () => {
    try {
      // Consultar notificaciones más recientes que lastNotificationId
      const query = `
        SELECT n.*, c.nombre, c.apellido, c.tipo_certificado, c.tipo_identificacion, c.numero_identificacion
        FROM certificate_notifications n
        JOIN certificados c ON n.certificate_id = c.id
        WHERE n.id > ?
        ORDER BY n.id ASC
      `;
      
      const [notifications] = await db.promise().query(query, [lastNotificationId]);
      
      if (notifications.length > 0) {
        console.log(`🔔 Se encontraron ${notifications.length} nuevas notificaciones`);
        
        // Actualizar el último ID procesado
        lastNotificationId = notifications[notifications.length - 1].id;
        
        // Emitir cada notificación a través de Socket.IO
        notifications.forEach(notification => {
          io.emit('certificateStatusChanged', {
            id: notification.id,
            certificate_id: notification.certificate_id,
            oldStatus: notification.old_status,
            newStatus: notification.new_status,
            clientName: `${notification.nombre} ${notification.apellido}`,
            documentType: notification.tipo_identificacion,
            documentNumber: notification.numero_identificacion,
            certificateType: notification.tipo_certificado,
            timestamp: notification.created_at
          });
        });
      }
    } catch (error) {
      console.error('❌ Error en el polling de notificaciones:', error.message);
    }
  }, POLLING_INTERVAL);
}

// Iniciar el sistema de notificaciones cuando arranca la aplicación
initNotificationSystem();





// Manejo de SIGTERM para evitar cierre abrupto en Railway
process.on("SIGTERM", () => {
    console.log("🔻 Señal SIGTERM recibida. Cerrando servidor...");
    server.close(() => {
        console.log("✅ Servidor cerrado correctamente.");
        process.exit(0);
    });
});

// IMPORTANTE: Modificar la forma en que inicializas el servidor
// Reemplaza esto:
// app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
// Con esto:
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT} con Socket.IO`));
