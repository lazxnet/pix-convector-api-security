import express from "express";
import cors from "cors";
import { networkInterfaces } from "os";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const app = express();
const port = process.env.PORT || 3001;

// Configuración para proxy de Render
app.set('trust proxy', true);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://pix-convector.vercel.app', // Frenteend en Vercel
        'https://pix-convector-api-security.onrender.com' // Backend en Render (si necesitas acceso directo)
      ]
    : ['http://localhost:5173'], // Desarrollo con Vite
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  //credentials: true,
  //optionsSuccessStatus: 204
}));

app.use(express.json());

// Configuración de multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Tipos MIME permitidos
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/heic",
  "image/heif",
];

// Función para obtener IP local
const getLocalIpAddress = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
};

// Endpoint para loguear acciones
app.post("/api/log-action", (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { action } = req.body;
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(/, /)[0] : req.connection?.remoteAddress || "unknown";

  console.log(`Client IP: ${ip}, Action: ${action}`);

  res.status(200).json({
    message: "Action logged",
    ip: ip,
    success: true
  });
});

// Endpoint para validar archivos
app.post("/api/validate-file", upload.single("file"), async (req, res) => {
    console.log("Archivo recibido:", req.file?.originalname, "Tamaño:", req.file?.size)
  
    if (!req.file) {
      console.log("No se proporcionó ningún archivo")
      return res.status(400).json({ error: "No se ha proporcionado ningún archivo", valid: false })
    }
  
    try {
      const fileType = await fileTypeFromBuffer(req.file.buffer)
      console.log("Tipo de archivo detectado:", fileType)
  
      if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
        console.log("Tipo de archivo no permitido:", fileType ? fileType.mime : "desconocido")
        return res.status(400).json({ error: "Tipo de archivo no permitido", valid: false })
      }
  
      console.log("Archivo válido:", fileType.mime)
      res.json({ message: "Archivo válido", mimeType: fileType.mime, valid: true })
    } catch (error) {
      console.error("Error al validar el archivo:", error)
      res.status(500).json({ error: "Error al procesar el archivo", valid: false })
    }
  })

// Iniciar servidor
app.listen(port, () => {
  console.log(`El server esta corriendo en el puerto: ${port}`);
});