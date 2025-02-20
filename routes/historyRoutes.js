import express from 'express';
import Auth from '../middlewares/auth.js';
import HistoryMaintenanceController from '../controllers/HistoryMaintenanceController.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorizeTecnico,
  HistoryMaintenanceController.registerHistory
);

router.get(
  '/all/:environmentId',
  HistoryMaintenanceController.environmentHistory
);

export default router;
