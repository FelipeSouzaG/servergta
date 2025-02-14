import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/dbConnect.js';
import manipulator404 from './middlewares/manipulator404.js';
import manipulatorError from './middlewares/manipulatorError.js';
import routes from './routes/index.js';

const app = express();
let isDBConnected = false;

const initializeApp = async () => {
  if (!isDBConnected) {
    try {
      await connectDB();
      isDBConnected = true;
    } catch (error) {
      process.exit(1);
    }
  }
};

initializeApp();

app.use(async (req, res, next) => {
  if (!isDBConnected) {
    await initializeApp();
  }
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: [
        "'self'",
        process.env.OFFICE_URL,
        process.env.CLIENT_URL,
        'https://viacep.com.br',
        'https://maps.googleapis.com',
      ],
      imgSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
    },
  })
);
app.use(
  cors({
    origin: [process.env.OFFICE_URL, process.env.CLIENT_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

routes(app);
app.use(manipulator404);
app.use(manipulatorError);

export default app;
