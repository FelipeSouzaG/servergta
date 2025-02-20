import express from 'express';
import { GenericValidator, limiter } from '../middlewares/validator.js';
import { normalizeData } from '../middlewares/normalize.js';
import UserController from '../controllers/UserController.js';
import Auth from '../middlewares/auth.js';

const router = express.Router();

router.post(
  '/register',
  limiter,
  GenericValidator.validate(['email', 'password', 'name', 'phone']),
  normalizeData,
  UserController.registerUser
);
router.post(
  '/login',
  limiter,
  GenericValidator.validate(['email', 'password']),
  normalizeData,
  UserController.loginUser
);
router.post('/logoff', UserController.logoffUser);
router.get('/userdata', Auth.authenticate, UserController.getUserData);
router.put(
  '/update',
  limiter,
  GenericValidator.validate(['email', 'password', 'name', 'currentPassword']),
  normalizeData,
  Auth.authenticate,
  UserController.updateUser
);

router.get(
  '/all',
  Auth.authenticate,
  Auth.authorizeSecretario,
  UserController.getAllUsers
);

router.delete('/delete', Auth.authenticate, UserController.deleteUser);

export default router;
