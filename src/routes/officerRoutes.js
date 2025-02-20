import express from 'express';
import OfficerController from '../controllers/OfficerController.js';
import Auth from '../middlewares/auth.js';
import NumberGenerator from '../middlewares/numberValidation.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorizeSecretario,
  NumberGenerator.generateOfficerNumber,
  OfficerController.registerOfficer
);

router.get(
  '/all',
  Auth.authenticate,
  Auth.authorizeSecretario,
  OfficerController.getAllOfficers
);

export default router;
