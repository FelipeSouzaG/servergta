import express from 'express';
import Auth from '../middlewares/auth.js';
import NumberGenerator from '../middlewares/numberValidation.js';
import EnvironmentController from '../controllers/EnvironmentController.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorizeTecnico,
  NumberGenerator.generateEquipmentNumber,
  EnvironmentController.registerEnvironment
);

router.get(
  '/client/:addressId',
  Auth.authenticate,
  Auth.authorizeSecretario,
  EnvironmentController.environmentAddressClient
);

export default router;
