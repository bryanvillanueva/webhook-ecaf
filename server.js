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
const XLSX = require('xlsx');




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

// Importa Socket.IO y configura el servidor HTTP
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*", // En producción, limita esto a tus dominios frontend específicos
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  },
  // Configuración adicional para mejorar la estabilidad
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // Cuánto tiempo esperar antes de considerar la conexión cerrada
  pingInterval: 25000, // Intervalo para verificar la conexión
  // Path predeterminado, solo asegúrate de que coincida con el frontend
  path: '/socket.io/'
});


// Mejorar los logs de conexión/desconexión
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado a Socket.IO:', socket.id, 'desde IP:', socket.handshake.address);
  
  // Puedes añadir un ping/pong personalizado para verificar la conexión
  socket.on('ping', (callback) => {
    if (callback && typeof callback === 'function') {
      callback({ status: 'ok', timestamp: new Date() });
    }
  });

  // Monitorear desconexiones con la razón
  socket.on('disconnect', (reason) => {
    console.log('🔌 Cliente desconectado de Socket.IO:', socket.id, 'Razón:', reason);
  });
  
  // Manejar errores de socket
  socket.on('error', (error) => {
    console.error('🔌 Error de socket:', socket.id, error);
  });
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
          'image': 'https://hook.eu2.make.com/dgxr45oyidtttvwbge4c1wjycnnlfj4y',
          'document': 'https://hook.eu2.make.com/dgxr45oyidtttvwbge4c1wjycnnlfj4y'
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
      // Use "Ecaf" as default sender if not provided
      db.query(sql, [conversationId, sender || 'Ecaf', message], (err, result) => {
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
    // Mensajes enviados por Ecaf
    const queryMessagesEcaf = 'SELECT COUNT(*) AS mensajes_Ecaf FROM messages WHERE sender = "Ecaf"';
    // Total de usuarios (clientes únicos) en conversaciones
    const queryTotalUsers = 'SELECT COUNT(DISTINCT client_id) AS total_usuarios FROM conversations';
    // Mensajes pendientes: conversaciones cuyo último mensaje no fue enviado por "Ecaf"
    const queryPending = `
      SELECT COUNT(*) AS mensajes_pendientes
      FROM (
        SELECT c.id, 
          (SELECT sender FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message_sender
        FROM conversations c
      ) AS conv
      WHERE last_message_sender != 'Ecaf'
    `;
    // Timeline global de mensajes recibidos (sender != "Ecaf"), agrupados por fecha
    const queryTimeline = `
      SELECT DATE(sent_at) AS date, COUNT(*) AS count 
      FROM messages 
      WHERE sender != 'Ecaf'
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `;
  
    db.query(queryTotalMessages, (err, totalMessagesResult) => {
      if (err) {
        console.error('❌ Error al obtener total de mensajes:', err.message);
        return res.status(500).json({ error: 'Error al obtener total de mensajes' });
      }
      const total_mensajes = totalMessagesResult[0].total_mensajes;
  
      db.query(queryMessagesEcaf, (err, messagesEcafResult) => {
        if (err) {
          console.error('❌ Error al obtener mensajes de Ecaf:', err.message);
          return res.status(500).json({ error: 'Error al obtener mensajes de Ecaf' });
        }
        const mensajes_Ecaf = messagesEcafResult[0].mensajes_Ecaf;
  
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
                mensajes_Ecaf,
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
  
// Endpoint para obtener información del dashboard de certificados
// Endpoint modificado para incluir cálculos financieros
app.get('/api/dashboard-certificados', (req, res) => {
  // Definir precios por tipo de certificado
  const PRECIOS = {
    'Certificado de notas': 10000,
    'Certificado general': 20000,
    'Certificado de asistencia': 12000
  };

  // Array de consultas que necesitamos ejecutar
  const queries = {
    // Total de certificados
    totalCertificados: 'SELECT COUNT(*) AS total FROM certificados',
    
    // Certificados por tipo
    certificadosPorTipo: `
      SELECT tipo_certificado, COUNT(*) AS cantidad 
      FROM certificados 
      GROUP BY tipo_certificado
    `,
    
    // Certificados por estado (agrupando estados similares)
    certificadosPorEstado: `
      SELECT
        CASE
          WHEN estado IN ('pendiente', 'pending', 'en espera', 'waiting', 'pendiente de pago', 'on-hold') THEN 'pendiente'
          WHEN estado IN ('procesando', 'processing') THEN 'en_proceso'
          WHEN estado IN ('completado', 'completed') THEN 'completado'
          WHEN estado IN ('fallido', 'failed', 'cancelado', 'cancelled') THEN 'fallido'
          ELSE 'otro'
        END AS estado_normalizado,
        COUNT(*) AS cantidad
      FROM certificados
      GROUP BY estado_normalizado
    `,
    
    // Certificados recientes (últimos 10)
    certificadosRecientes: `
      SELECT 
        id, nombre, apellido, tipo_certificado, referencia, 
        CASE
          WHEN estado IN ('pendiente', 'pending', 'en espera', 'waiting', 'pendiente de pago', 'on-hold') THEN 'pendiente'
          WHEN estado IN ('procesando', 'processing') THEN 'en_proceso'
          WHEN estado IN ('completado', 'completed') THEN 'completado'
          WHEN estado IN ('fallido', 'failed', 'cancelado', 'cancelled') THEN 'fallido'
          ELSE estado
        END AS estado,
        created_at
      FROM certificados
      ORDER BY created_at DESC
      LIMIT 10
    `,
    
    // Timeline de creación de certificados (por día)
    timelineCertificados: `
      SELECT DATE(created_at) AS fecha, COUNT(*) AS cantidad 
      FROM certificados 
      GROUP BY DATE(created_at)
      ORDER BY fecha ASC
      LIMIT 30
    `,
    
    // Tiempo promedio de procesamiento usando la tabla certificate_notifications
    tiempoPromedio: `
      SELECT AVG(TIMESTAMPDIFF(HOUR, c.created_at, n.created_at)) AS promedio_horas
      FROM certificados c
      JOIN certificate_notifications n ON c.id = n.certificate_id
      WHERE n.new_status IN ('completado', 'completed')
    `,
    
    // Consulta para cálculos financieros - Certificados por tipo y estado
    certificadosPorTipoYEstado: `
      SELECT 
        tipo_certificado,
        CASE
          WHEN estado IN ('pendiente', 'pending', 'en espera', 'waiting', 'pendiente de pago', 'on-hold') THEN 'pendiente'
          WHEN estado IN ('procesando', 'processing') THEN 'en_proceso'
          WHEN estado IN ('completado', 'completed') THEN 'completado'
          WHEN estado IN ('fallido', 'failed', 'cancelado', 'cancelled') THEN 'fallido'
          ELSE 'otro'
        END AS estado_normalizado,
        COUNT(*) AS cantidad
      FROM certificados
      GROUP BY tipo_certificado, estado_normalizado
    `
  };
  
  // Objeto para almacenar todos los resultados
  const dashboardData = {};
  
  // Ejecutar todas las consultas en paralelo
  const promises = Object.entries(queries).map(([key, query]) => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) {
          console.error(`❌ Error al obtener ${key}:`, err.message);
          reject(err);
        } else {
          // Para consultas que devuelven un solo valor, simplificar la respuesta
          if (key === 'totalCertificados' || key === 'tiempoPromedio') {
            dashboardData[key] = results[0];
          } else {
            dashboardData[key] = results;
          }
          resolve();
        }
      });
    });
  });
  
  // Cuando todas las promesas se resuelvan, devolver los datos
  Promise.all(promises)
    .then(() => {
      // Añadir métricas calculadas adicionales si es necesario
      
      // Porcentaje de certificados completados
      if (dashboardData.certificadosPorEstado && dashboardData.totalCertificados) {
        const completados = dashboardData.certificadosPorEstado.find(item => item.estado_normalizado === 'completado');
        if (completados) {
          dashboardData.porcentajeCompletados = {
            porcentaje: (completados.cantidad / dashboardData.totalCertificados.total * 100).toFixed(2)
          };
        }
      }
      
      // Cálculos financieros
      if (dashboardData.certificadosPorTipoYEstado) {
        // Inicializar totales por estado
        const finanzas = {
          gananciasRealizadas: 0,    // Completados
          gananciasEsperadas: 0,     // Pendientes + En proceso
          gananciasPerdidas: 0       // Fallidos
        };
        
        // Calcular valores por tipo de certificado y estado
        dashboardData.certificadosPorTipoYEstado.forEach(item => {
          const precio = PRECIOS[item.tipo_certificado] || 0;
          const valorTotal = precio * item.cantidad;
          
          if (item.estado_normalizado === 'completado') {
            finanzas.gananciasRealizadas += valorTotal;
          } else if (item.estado_normalizado === 'pendiente' || item.estado_normalizado === 'en_proceso') {
            finanzas.gananciasEsperadas += valorTotal;
          } else if (item.estado_normalizado === 'fallido') {
            finanzas.gananciasPerdidas += valorTotal;
          }
        });
        
        dashboardData.finanzas = finanzas;
      }
      
      // Añadir estadísticas de certificados por mes (para gráficos de tendencia)
      db.query(`
        SELECT 
          YEAR(created_at) AS año,
          MONTH(created_at) AS mes,
          COUNT(*) AS cantidad
        FROM certificados
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY año ASC, mes ASC
        LIMIT 12
      `, (err, results) => {
        if (err) {
          console.error('❌ Error al obtener estadísticas por mes:', err.message);
          dashboardData.certificadosPorMes = [];
        } else {
          dashboardData.certificadosPorMes = results.map(item => ({
            ...item,
            etiqueta: `${item.mes}/${item.año}`
          }));
        }
        
        // Enviar la respuesta completa
        res.json(dashboardData);
      });
    })
    .catch(error => {
      console.error('❌ Error al obtener datos del dashboard de certificados:', error.message);
      res.status(500).json({ 
        error: 'Error al obtener datos del dashboard de certificados',
        details: error.message 
      });
    });
});


// Endpoint para obtener información de un certificado específico
app.get('/api/dashboard-certificados/:id', (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID del certificado' });
  }
  
  // Consulta principal para obtener detalles del certificado
  const sqlCertificado = `
    SELECT * FROM certificados WHERE id = ? LIMIT 1
  `;
  
  // Consulta para obtener el historial de cambios de estado
  const sqlHistorial = `
    SELECT * FROM certificate_notifications 
    WHERE certificate_id = ? 
    ORDER BY created_at ASC
  `;
  
  // Ejecutar ambas consultas
  db.query(sqlCertificado, [id], (err, certificadoResult) => {
    if (err) {
      console.error('❌ Error al obtener detalles del certificado:', err.message);
      return res.status(500).json({ error: 'Error al obtener detalles del certificado' });
    }
    
    if (certificadoResult.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }
    
    const certificado = certificadoResult[0];
    
    // Obtener historial
    db.query(sqlHistorial, [id], (err, historialResult) => {
      if (err) {
        console.error('❌ Error al obtener historial del certificado:', err.message);
        return res.status(500).json({
          error: 'Error al obtener historial del certificado',
          certificado // Incluir el certificado aunque falle el historial
        });
      }
      
      // Respuesta completa con certificado e historial
      res.json({
        certificado,
        historial: historialResult
      });
    });
  });
});

// Endpoint para obtener estadísticas de certificados por periodo (con normalización de estados)
app.get('/api/dashboard-certificados/estadisticas/:periodo', (req, res) => {
  const { periodo } = req.params;
  const { fechaInicio, fechaFin } = req.query;
  
  let query = '';
  let params = [];
  
  // Función para construir la normalización de estados en SQL
  const estadoNormalizado = `
    CASE
      WHEN estado IN ('pendiente', 'pending', 'en espera', 'waiting', 'pendiente de pago', 'on-hold') THEN 'pendiente'
      WHEN estado IN ('procesando', 'processing') THEN 'en_proceso'
      WHEN estado IN ('completado', 'completed') THEN 'completado'
      WHEN estado IN ('fallido', 'failed', 'cancelado', 'cancelled') THEN 'fallido'
      ELSE 'otro'
    END AS estado_normalizado
  `;
  
  // Construir consulta según el periodo solicitado
  switch (periodo) {
    case 'diario':
      query = `
        SELECT 
          DATE(created_at) AS fecha,
          COUNT(*) AS total,
          SUM(CASE WHEN ${estadoNormalizado} = 'completado' THEN 1 ELSE 0 END) AS completados,
          SUM(CASE WHEN ${estadoNormalizado} = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
          SUM(CASE WHEN ${estadoNormalizado} = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
          SUM(CASE WHEN ${estadoNormalizado} = 'fallido' THEN 1 ELSE 0 END) AS fallidos
        FROM certificados
        WHERE created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;
      params = [fechaInicio || '2000-01-01', fechaFin || '2099-12-31'];
      break;
      
    case 'mensual':
      query = `
        SELECT 
          CONCAT(YEAR(created_at), '-', MONTH(created_at)) AS periodo,
          YEAR(created_at) AS anio,
          MONTH(created_at) AS mes,
          COUNT(*) AS total,
          SUM(CASE WHEN ${estadoNormalizado} = 'completado' THEN 1 ELSE 0 END) AS completados,
          SUM(CASE WHEN ${estadoNormalizado} = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
          SUM(CASE WHEN ${estadoNormalizado} = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
          SUM(CASE WHEN ${estadoNormalizado} = 'fallido' THEN 1 ELSE 0 END) AS fallidos
        FROM certificados
        WHERE created_at BETWEEN ? AND ?
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY anio ASC, mes ASC
      `;
      params = [fechaInicio || '2000-01-01', fechaFin || '2099-12-31'];
      break;
      
    case 'tipo':
      query = `
        SELECT 
          tipo_certificado,
          COUNT(*) AS total,
          SUM(CASE WHEN ${estadoNormalizado} = 'completado' THEN 1 ELSE 0 END) AS completados,
          SUM(CASE WHEN ${estadoNormalizado} = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
          SUM(CASE WHEN ${estadoNormalizado} = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
          SUM(CASE WHEN ${estadoNormalizado} = 'fallido' THEN 1 ELSE 0 END) AS fallidos
        FROM certificados
        WHERE created_at BETWEEN ? AND ?
        GROUP BY tipo_certificado
        ORDER BY total DESC
      `;
      params = [fechaInicio || '2000-01-01', fechaFin || '2099-12-31'];
      break;
      
    default:
      return res.status(400).json({ error: 'Periodo no válido. Use: diario, mensual o tipo' });
  }
  
  // Ejecutar la consulta
  db.query(query, params, (err, results) => {
    if (err) {
      console.error(`❌ Error al obtener estadísticas por ${periodo}:`, err.message);
      return res.status(500).json({ error: `Error al obtener estadísticas por ${periodo}` });
    }
    
    res.json({
      periodo,
      fechaInicio: params[0],
      fechaFin: params[1],
      resultados: results
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
    const { to, conversationId, caption = '', sender = 'Ecaf' } = req.body;
    
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

  // Determinar el prefijo según el tipo de certificado
  let prefijo = '';
  switch (tipo_certificado.toLowerCase()) {
    case 'notas':
      prefijo = 'CNTS000';
      break;
    case 'asistencia':
    case 'conducta':
      prefijo = 'CASS000';
      break;
    case 'general':
      prefijo = 'CGNR000';
      break;
    default:
      prefijo = 'CGNR000'; // Valor por defecto
  }

  // Necesitamos obtener el próximo ID que se asignará a certificados
  db.query('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "certificados"', (err, idResult) => {
    if (err) {
      console.error('❌ Error al obtener próximo ID de certificados:', err.message);
      return res.status(500).json({ error: 'Error al generar referencia' });
    }

    const proximoId = idResult[0].AUTO_INCREMENT;
    const referencia = `${prefijo}${proximoId}`;

    // Preparamos la consulta SQL para insertar el registro en certificados con la referencia
    const sqlCertificado = `
      INSERT INTO certificados 
        (nombre, apellido, tipo_identificacion, numero_identificacion, tipo_certificado, referencia, telefono, correo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sqlCertificado, [
      nombre, 
      apellido, 
      tipo_identificacion, 
      numero_identificacion, 
      tipo_certificado, 
      referencia, 
      telefono, 
      correo
    ], (err, result) => {
      if (err) {
        console.error('❌ Error al insertar certificado:', err.message);
        return res.status(500).json({ error: 'Error al insertar certificado en la base de datos' });
      }
      
      const certificadoId = result.insertId;
      
      res.status(201).json({ 
        message: 'Certificado insertado exitosamente', 
        id: certificadoId,
        referencia: referencia
      });
    });
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
        console.log(`🔔 Se encontraron ${notifications.length} nuevas notificaciones. Último ID previo: ${lastNotificationId}`);
        
        // Actualizar el último ID procesado
        lastNotificationId = notifications[notifications.length - 1].id;
        console.log(`🔄 Actualizando lastNotificationId a: ${lastNotificationId}`);
        
        // Emitir cada notificación a través de Socket.IO
        notifications.forEach(notification => {
          const notificationData = {
            id: notification.id,
            certificate_id: notification.certificate_id,
            oldStatus: notification.old_status,
            newStatus: notification.new_status,
            clientName: `${notification.nombre} ${notification.apellido}`,
            documentType: notification.tipo_identificacion,
            documentNumber: notification.numero_identificacion,
            certificateType: notification.tipo_certificado,
            timestamp: notification.created_at
          };
          
          console.log(`📣 Emitiendo notificación ID ${notification.id} para certificado ${notification.certificate_id}`);
          io.emit('certificateStatusChanged', notificationData);
          console.log(`✅ Notificación emitida`);
          
          // Verificar clientes conectados
          const connectedClients = io.sockets.sockets.size;
          console.log(`ℹ️ Clientes Socket.IO conectados: ${connectedClients}`);
        });
      } else {
        // Opcional: log periódico para verificar que el polling está funcionando
        console.log(`⏱️ Polling de notificaciones: sin nuevas notificaciones. Último ID: ${lastNotificationId}`);
      }
    } catch (error) {
      console.error('❌ Error en el polling de notificaciones:', error.message);
    }
  }, POLLING_INTERVAL);
}


// CARGA DE DOCUMENTOS CON EXCEL // 

// Importaciones necesarias para el procesamiento de Excel
// Asegúrate de instalar xlsx con: npm install xlsx --save

// Configuración de multer para archivos Excel
const excelStorage = multer.memoryStorage();
const excelUpload = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no válido. Solo se permite Excel (.xls, .xlsx)'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Endpoint para servir las plantillas
app.get('/api/plantillas-excel/:tipo', (req, res) => {
  try {
    const { tipo } = req.params;
    
    if (!['estudiantes', 'notas'].includes(tipo.toLowerCase())) {
      return res.status(400).json({ error: 'Tipo de plantilla no válido. Use "estudiantes" o "notas".' });
    }
    
    // Ruta a las plantillas
    const rutaPlantilla = `./plantillas/Plantilla_${tipo === 'estudiantes' ? 'Estudiantes' : 'Notas_Programas'}.xlsx`;
    
    // Verificar existencia del archivo
    if (!fs.existsSync(rutaPlantilla)) {
      console.error(`❌ Plantilla no encontrada: ${rutaPlantilla}`);
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    
    // Enviar el archivo
    res.download(rutaPlantilla, `Plantilla_${tipo.charAt(0).toUpperCase() + tipo.slice(1)}.xlsx`);
    
  } catch (error) {
    console.error('❌ Error al servir plantilla:', error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// Endpoint para cargar archivos Excel
app.post('/api/cargar-excel', excelUpload.single('archivo'), async (req, res) => {
  try {
    // Validar archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se encontró ningún archivo' });
    }
    
    // Validar tipo
    const { tipo } = req.body;
    if (!tipo || !['estudiantes', 'notas'].includes(tipo.toLowerCase())) {
      return res.status(400).json({ error: 'Tipo de carga no válido. Use "estudiantes" o "notas".' });
    }
    
    console.log(`📊 Procesando archivo ${req.file.originalname} de tipo ${tipo}`);
    
    // Leer el archivo Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    
    // Obtener la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel no contiene datos' });
    }
    
    console.log(`📊 Se procesarán ${data.length} registros de tipo ${tipo}`);
    
    // Resultados
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: []
    };
    
    // Procesar según el tipo
    if (tipo.toLowerCase() === 'estudiantes') {
      await procesarEstudiantes(data, resultados);
    } else {
      await procesarNotas(data, resultados);
    }
    
    console.log(`✅ Proceso completado. Exitosos: ${resultados.exitosos}, Fallidos: ${resultados.fallidos}`);
    
    // Respuesta
    return res.status(200).json({
      mensaje: `Proceso de carga completado para ${tipo}`,
      procesados: data.length,
      resultados
    });
    
  } catch (error) {
    console.error('❌ Error en carga de Excel:', error.message);
    return res.status(500).json({ 
      error: 'Error al procesar el archivo Excel', 
      detalle: error.message 
    });
  }
});

// Función para procesar datos de estudiantes
async function procesarEstudiantes(data, resultados) {
  for (const estudiante of data) {
    try {
      // Normalizar datos
      const estudianteNormalizado = {
        tipo_documento: estudiante.tipo_documento?.toString().trim(),
        numero_documento: estudiante.numero_documento?.toString().trim(),
        nombres: estudiante.nombres?.toString().trim(),
        apellidos: estudiante.apellidos?.toString().trim(),
        fecha_nacimiento: estudiante.fecha_nacimiento ? new Date(estudiante.fecha_nacimiento) : null,
        genero: estudiante.genero?.toString().trim(),
        email: estudiante.email?.toString().trim(),
        telefono: estudiante.telefono?.toString().trim(),
        direccion: estudiante.direccion?.toString().trim(),
        ciudad: estudiante.ciudad?.toString().trim()
      };
      
      // Validar datos requeridos
      if (!estudianteNormalizado.tipo_documento || !estudianteNormalizado.numero_documento || 
          !estudianteNormalizado.nombres || !estudianteNormalizado.apellidos || 
          !estudianteNormalizado.email || !estudianteNormalizado.telefono) {
        resultados.fallidos++;
        resultados.errores.push(`Estudiante con documento ${estudianteNormalizado.numero_documento || 'desconocido'}: Faltan campos obligatorios`);
        continue;
      }
      
      // Verificar si el estudiante ya existe - CORREGIDO: usando id_estudiante
      const [existentes] = await db.promise().query(
        'SELECT id_estudiante FROM estudiantes WHERE tipo_documento = ? AND numero_documento = ?',
        [estudianteNormalizado.tipo_documento, estudianteNormalizado.numero_documento]
      );
      
      if (existentes.length > 0) {
        // Actualizar estudiante existente - CORREGIDO: usando id_estudiante
        await db.promise().query(
          `UPDATE estudiantes SET 
            nombres = ?, 
            apellidos = ?, 
            fecha_nacimiento = ?, 
            genero = ?, 
            email = ?, 
            telefono = ?, 
            direccion = ?, 
            ciudad = ?
          WHERE id_estudiante = ?`,
          [
            estudianteNormalizado.nombres,
            estudianteNormalizado.apellidos,
            estudianteNormalizado.fecha_nacimiento,
            estudianteNormalizado.genero,
            estudianteNormalizado.email,
            estudianteNormalizado.telefono,
            estudianteNormalizado.direccion,
            estudianteNormalizado.ciudad,
            existentes[0].id_estudiante
          ]
        );
        
        console.log(`✅ Estudiante actualizado: ${estudianteNormalizado.nombres} ${estudianteNormalizado.apellidos}`);
      } else {
        // Insertar nuevo estudiante - No necesita cambios
        await db.promise().query(
          `INSERT INTO estudiantes (
            tipo_documento, 
            numero_documento, 
            nombres, 
            apellidos, 
            fecha_nacimiento, 
            genero, 
            email, 
            telefono, 
            direccion, 
            ciudad,
            fecha_registro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            estudianteNormalizado.tipo_documento,
            estudianteNormalizado.numero_documento,
            estudianteNormalizado.nombres,
            estudianteNormalizado.apellidos,
            estudianteNormalizado.fecha_nacimiento,
            estudianteNormalizado.genero,
            estudianteNormalizado.email,
            estudianteNormalizado.telefono,
            estudianteNormalizado.direccion,
            estudianteNormalizado.ciudad
          ]
        );
        
        console.log(`✅ Nuevo estudiante creado: ${estudianteNormalizado.nombres} ${estudianteNormalizado.apellidos}`);
      }
      
      resultados.exitosos++;
      
    } catch (error) {
      resultados.fallidos++;
      resultados.errores.push(`Error procesando estudiante ${estudiante.numero_documento || 'desconocido'}: ${error.message}`);
      console.error('❌ Error:', error);
    }
  }
}

// Función para procesar datos de notas, programas y materias
async function procesarNotas(data, resultados) {
  for (const registro of data) {
    try {
      // Normalizar datos
      const registroNormalizado = {
        tipo_documento: registro.tipo_documento?.toString().trim(),
        numero_documento: registro.numero_documento?.toString().trim(),
        nombre_programa: registro.nombre_programa?.toString().trim(),
        tipo_programa: registro.tipo_programa?.toString().trim(),
        estado_programa: registro.estado_programa?.toString().trim() || 'En curso',
        materia: registro.materia?.toString().trim(),
        descripcion_materia: registro.descripcion_materia?.toString().trim() || '',
        nota: parseFloat(registro.nota) || 0,
        periodo: registro.periodo?.toString().trim()
      };
      
      // Validar datos requeridos
      if (!registroNormalizado.tipo_documento || !registroNormalizado.numero_documento || 
          !registroNormalizado.nombre_programa || !registroNormalizado.tipo_programa || 
          !registroNormalizado.materia || !registroNormalizado.periodo) {
        resultados.fallidos++;
        resultados.errores.push(`Registro con documento ${registroNormalizado.numero_documento || 'desconocido'}: Faltan campos obligatorios`);
        continue;
      }
      
      // 1. Verificar que el estudiante exista - CORREGIDO: usando id_estudiante
      const [estudiantesExistentes] = await db.promise().query(
        'SELECT id_estudiante FROM estudiantes WHERE tipo_documento = ? AND numero_documento = ?',
        [registroNormalizado.tipo_documento, registroNormalizado.numero_documento]
      );
      
      if (estudiantesExistentes.length === 0) {
        resultados.fallidos++;
        resultados.errores.push(
          `Estudiante con documento ${registroNormalizado.tipo_documento}-${registroNormalizado.numero_documento} no existe en la base de datos`
        );
        continue;
      }
      
      const estudianteId = estudiantesExistentes[0].id_estudiante;
      
      // 2. Verificar/Crear el programa - CORREGIDO: usando id_programa
      let programaId;
      const [programasExistentes] = await db.promise().query(
        'SELECT id_programa FROM programas WHERE nombre = ?',
        [registroNormalizado.nombre_programa]
      );
      
      if (programasExistentes.length === 0) {
        const [resultPrograma] = await db.promise().query(
          'INSERT INTO programas (nombre, tipo, estado, descripcion, fecha_inicio) VALUES (?, ?, "Activo", ?, NOW())',
          [registroNormalizado.nombre_programa, registroNormalizado.tipo_programa, 
           `Programa ${registroNormalizado.nombre_programa}`]
        );
        programaId = resultPrograma.insertId;
        console.log(`✅ Nuevo programa creado: ${registroNormalizado.nombre_programa}`);
      } else {
        programaId = programasExistentes[0].id_programa;
      }
      
      // 3. Verificar/Crear relación estudiante-programa - CORREGIDO: usando id_estudiante_programa
      let relacionId;
      const [relacionesExistentes] = await db.promise().query(
        'SELECT id_estudiante_programa FROM estudiante_programa WHERE id_estudiante = ? AND id_programa = ?',
        [estudianteId, programaId]
      );
      
      if (relacionesExistentes.length === 0) {
        const [resultRelacion] = await db.promise().query(
          'INSERT INTO estudiante_programa (id_estudiante, id_programa, estado, fecha_asignacion) VALUES (?, ?, ?, NOW())',
          [estudianteId, programaId, registroNormalizado.estado_programa]
        );
        relacionId = resultRelacion.insertId;
        console.log(`✅ Nueva relación estudiante-programa creada`);
      } else {
        relacionId = relacionesExistentes[0].id_estudiante_programa;
        // Actualizar estado si es necesario
        await db.promise().query(
          'UPDATE estudiante_programa SET estado = ? WHERE id_estudiante_programa = ?',
          [registroNormalizado.estado_programa, relacionId]
        );
      }
      
      // 4. Verificar/Crear la materia - CORREGIDO: usando id_materia
      let materiaId;
      const [materiasExistentes] = await db.promise().query(
        'SELECT id_materia FROM materias WHERE nombre = ? AND id_programa = ?',
        [registroNormalizado.materia, programaId]
      );
      
      if (materiasExistentes.length === 0) {
        const [resultMateria] = await db.promise().query(
          'INSERT INTO materias (nombre, descripcion, id_programa) VALUES (?, ?, ?)',
          [registroNormalizado.materia, registroNormalizado.descripcion_materia || registroNormalizado.materia, programaId]
        );
        materiaId = resultMateria.insertId;
        console.log(`✅ Nueva materia creada: ${registroNormalizado.materia}`);
      } else {
        materiaId = materiasExistentes[0].id_materia;
      }
      
      // 5. Registrar la nota - CORREGIDO: usando id_estudiante_materia
      const [notasExistentes] = await db.promise().query(
        'SELECT id_estudiante_materia FROM estudiante_materia WHERE id_estudiante_programa = ? AND id_materia = ? AND periodo = ?',
        [relacionId, materiaId, registroNormalizado.periodo]
      );
      
      if (notasExistentes.length === 0) {
        await db.promise().query(
          'INSERT INTO estudiante_materia (id_estudiante_programa, id_materia, nota, periodo) VALUES (?, ?, ?, ?)',
          [relacionId, materiaId, registroNormalizado.nota, registroNormalizado.periodo]
        );
        console.log(`✅ Nueva nota registrada: ${registroNormalizado.materia} - ${registroNormalizado.nota}`);
      } else {
        await db.promise().query(
          'UPDATE estudiante_materia SET nota = ? WHERE id_estudiante_materia = ?',
          [registroNormalizado.nota, notasExistentes[0].id_estudiante_materia]
        );
        console.log(`✅ Nota actualizada: ${registroNormalizado.materia} - ${registroNormalizado.nota}`);
      }
      
      resultados.exitosos++;
      
    } catch (error) {
      resultados.fallidos++;
      resultados.errores.push(
        `Error procesando registro para estudiante ${registro.numero_documento || 'desconocido'}, materia ${registro.materia || 'desconocida'}: ${error.message}`
      );
      console.error('❌ Error:', error);
    }
  }
}


// NOTAS Y PROGRAMAS // 

// 📌 1. Obtener todos los estudiantes
app.get('/api/estudiantes', (req, res) => {
  const sql = `SELECT * FROM estudiantes ORDER BY fecha_registro DESC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener estudiantes:', err.message);
      return res.status(500).json({ error: 'Error al obtener estudiantes' });
    }
    res.json(results);
  });
});


// 📌 2. Obtener todos los programas
app.get('/api/programas', (req, res) => {
  const sql = `SELECT * FROM programas ORDER BY nombre ASC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener programas:', err.message);
      return res.status(500).json({ error: 'Error al obtener programas' });
    }
    res.json(results);
  });
});

// 📌 3. Obtener las notas de un estudiante por su número de documento
app.get('/api/estudiantes/:documento/notas', async (req, res) => {
  const { documento } = req.params;

  try {
    const [result] = await db.promise().query(`
      SELECT e.nombres, e.apellidos, p.nombre AS programa, m.nombre AS materia, em.nota, em.periodo
      FROM estudiantes e
      JOIN estudiante_programa ep ON e.id_estudiante = ep.id_estudiante
      JOIN programas p ON ep.id_programa = p.id_programa
      JOIN estudiante_materia em ON ep.id_estudiante_programa = em.id_estudiante_programa
      JOIN materias m ON em.id_materia = m.id_materia
      WHERE e.numero_documento = ?
      ORDER BY em.periodo DESC
    `, [documento]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron notas para este estudiante' });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ Error al obtener notas:', err.message);
    res.status(500).json({ error: 'Error al obtener notas del estudiante' });
  }
});


// 📌 4. Obtener estudiantes asociados a un programa y sus notas
app.get('/api/programas/:id/estudiantes', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query(`
      SELECT 
        e.id_estudiante, e.nombres, e.apellidos, e.numero_documento,
        m.nombre AS materia, em.periodo, em.nota
      FROM estudiante_programa ep
      JOIN estudiantes e ON ep.id_estudiante = e.id_estudiante
      JOIN estudiante_materia em ON ep.id_estudiante_programa = em.id_estudiante_programa
      JOIN materias m ON em.id_materia = m.id_materia
      WHERE ep.id_programa = ?
      ORDER BY e.apellidos, em.periodo
    `, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron estudiantes asociados a este programa' });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ Error al obtener estudiantes del programa:', err.message);
    res.status(500).json({ error: 'Error al obtener estudiantes del programa' });
  }
});

// 📌 5. Obtener materias asociadas a un programa
app.get('/api/programas/:id/materias', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query(`
      SELECT * FROM materias 
      WHERE id_programa = ?
      ORDER BY nombre ASC
    `, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron materias para este programa' });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ Error al obtener materias para el programa:', err.message);
    res.status(500).json({ error: 'Error al obtener materias del programa' });
  }
});

// 📌 6. Obtener estudiantes asociados a una materia
app.get('/api/materias/:id/estudiantes', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query(`
      SELECT 
        e.id_estudiante,
        e.nombres,
        e.apellidos,
        e.numero_documento,
        em.nota,
        em.periodo
      FROM estudiante_materia em
      JOIN estudiante_programa ep ON em.id_estudiante_programa = ep.id_estudiante_programa
      JOIN estudiantes e ON ep.id_estudiante = e.id_estudiante
      WHERE em.id_materia = ?
      ORDER BY e.apellidos, em.periodo
    `, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron estudiantes para esta materia' });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ Error al obtener estudiantes para la materia:', err.message);
    res.status(500).json({ error: 'Error al obtener estudiantes para la materia' });
  }
});



// FIN NOTAS Y PROGRAMAS //

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
