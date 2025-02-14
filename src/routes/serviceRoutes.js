import express from 'express';
import Auth from '../middlewares/auth.js';
import ServiceController from '../controllers/ServiceController.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorizeSecretario,
  ServiceController.registerService
);

router.get(
  '/all',
  Auth.authenticate,
  Auth.authorizeTecnico,
  ServiceController.allServices
);

export default router;
