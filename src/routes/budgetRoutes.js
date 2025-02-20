import express from 'express';
import Auth from '../middlewares/auth.js';
import NumberGenerator from '../middlewares/numberValidation.js';
import BudgetController from '../controllers/BudgetController.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorizeSecretario,
  NumberGenerator.generateBudgetNumber,
  BudgetController.createBudget
);

router.put(
  '/update/:budgetId',
  Auth.authenticate,
  Auth.authorize(['Cliente', 'Secretário', 'Gestor']),
  BudgetController.updateBudget
);

router.get(
  '/client/:budgetId',
  Auth.authenticate,
  Auth.authorizeClient,
  BudgetController.getClientBudget
);

router.get(
  '/all',
  Auth.authenticate,
  Auth.authorizeSecretario,
  BudgetController.getAllBudgets
);

export default router;
