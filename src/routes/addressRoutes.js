import express from 'express';
import Auth from '../middlewares/auth.js';
import AddressValidation from '../middlewares/addressValidation.js';
import AddressController from '../controllers/AddressController.js';

const router = express.Router();

router.post(
  '/register',
  Auth.authenticate,
  Auth.authorize(['Cliente', 'Técnico', 'Secretário', 'Gestor']),
  AddressValidation.validateAddress,
  AddressController.registerAddress
);

router.post(
  '/create',
  Auth.authenticate,
  Auth.authorize(['Secretário', 'Gestor']),
  AddressValidation.validateAddress,
  AddressController.createAddress
);

router.get(
  '/client',
  Auth.authenticate,
  Auth.authorizeClient,
  AddressController.getClientAddresses
);
router.get(
  '/officer',
  Auth.authenticate,
  Auth.authorizeTecnico,
  AddressController.getOfficerAddress
);
router.get(
  '/all/:clientId',
  Auth.authenticate,
  Auth.authorizeSecretario,
  AddressController.allAddress
);
router.put(
  '/update/:addressId',
  Auth.authenticate,
  Auth.authorize(['Cliente', 'Técnico', 'Secretário', 'Gestor']),
  AddressValidation.validateAddress,
  AddressController.updateAddress
);
router.delete(
  '/delete/:addressId',
  Auth.authenticate,
  Auth.authorize(['Cliente', 'Secretário', 'Gestor']),
  AddressController.deleteAddressClient
);
router.get(
  '/officer/:id',
  Auth.authenticate,
  Auth.authorizeSecretario,
  AddressController.getAddressOfficerId
);

export default router;
