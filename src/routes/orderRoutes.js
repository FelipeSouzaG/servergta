import express from 'express';
import Auth from '../middlewares/auth.js';
import NumberGenerator from '../middlewares/numberValidation.js';
import OrderController from '../controllers/OrderController.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorizeSecretario,
  NumberGenerator.generateOrderNumber,
  OrderController.createOrder
);

router.put(
  '/update/:orderId',
  Auth.authenticate,
  Auth.authorizeSecretario,
  OrderController.updateOrder
);

router.get(
  '/client/:clientId',
  Auth.authenticate,
  Auth.authorizeSecretario,
  OrderController.getClientOrders
);

router.get(
  '/all',
  Auth.authenticate,
  Auth.authorizeSecretario,
  OrderController.getAllOrders
);

router.get(
  '/officer/all',
  Auth.authenticate,
  Auth.authorizeTecnico,
  OrderController.getAllOrdersOfficer
);

export default router;
