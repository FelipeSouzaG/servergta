import express from 'express';
import { GenericValidator } from '../middlewares/validator.js';
import { normalizeData } from '../middlewares/normalize.js';
import ClientController from '../controllers/ClientController.js';
import Auth from '../middlewares/auth.js';
import NumberGenerator from '../middlewares/numberValidation.js';

const router = express.Router();

router.post(
  '/register',
  GenericValidator.validate(['phone', 'alternativePhone', 'register']),
  normalizeData,
  Auth.authenticate,
  NumberGenerator.generateClientNumber,
  ClientController.registerClient
);

router.post(
  '/create',
  GenericValidator.validate([
    'phone',
    'alternativePhone',
    'register',
    'name',
    'email',
  ]),
  normalizeData,
  Auth.authenticate,
  Auth.authorizeSecretario,
  NumberGenerator.generateClientNumber,
  ClientController.createClient
);

router.get(
  '/all',
  Auth.authenticate,
  Auth.authorizeSecretario,
  ClientController.getAllClient
);

router.get(
  '/user',
  Auth.authenticate,
  Auth.authorizeClient,
  ClientController.getClient
);

router.put(
  '/update/:clientId',
  GenericValidator.validate([
    'phone',
    'alternativePhone',
    'register',
    'name',
    'email',
  ]),
  normalizeData,
  Auth.authenticate,
  Auth.authorize(['Cliente', 'Secretário', 'Gestor']),
  ClientController.updateClient
);

router.delete(
  '/delete/client/:clientId',
  Auth.authenticate,
  Auth.authorizeSecretario,
  ClientController.deleteClient
);

export default router;
