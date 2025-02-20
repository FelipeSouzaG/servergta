import mongoose from 'mongoose';
import {
  Address,
  Request,
  Budget,
  Order,
  Environment,
  Client,
  Officer,
} from '../models/Model.js';
import { RequestError, ConflictError, NotFound } from '../erros/Errors.js';

class AddressController {
  static registerAddress = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;

      const addressData = {
        ...req.body,
        createdBy: {
          userId,
          createdAt: new Date(),
        },
      };

      const existingAddress = await Address.findOne({
        clientId: addressData.clientId || null,
        officerId: addressData.officerId || null,
        addressType: addressData.addressType,
        street: addressData.street,
        number: addressData.number,
        district: addressData.district,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        complement: addressData.complement || null,
      }).collation({ locale: 'pt', strength: 2 });

      if (existingAddress) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ConflictError({
            title: 'Não Cadastrado!',
            msg: 'Esse Endereço já foi cadastrado.',
          })
        );
      }

      const newAddress = new Address(addressData);
      await newAddress.save({ session });
      await session.commitTransaction();

      res.status(201).json({
        title: 'Endereço Cadastrado!',
        msg: `Endereço ${newAddress.addressType} cadastrado com sucesso!`,
        status: 201,
        level: level,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {}).join(', ');
        next(
          new ConflictError({
            title: 'Conflito de Dados',
            msg: `O valor do campo ${duplicateField} já está em uso.`,
          })
        );
      } else {
        next(error);
      }
    } finally {
      session.endSession();
    }
  };

  static createAddress = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;
      const { clientId, officerId, ...otherData } = req.body;

      let addressData = {
        ...otherData,
      };

      if (clientId) {
        addressData.clientId = clientId;
        addressData.officerId = null;
      }

      if (officerId) {
        addressData.officerId = officerId;
        addressData.clientId = null;
      }

      addressData.createdBy = {
        userId: userId,
        createdAt: new Date(),
      };

      const existingAddress = await Address.findOne({
        clientId: addressData.clientId || null,
        officerId: addressData.officerId || null,
        addressType: addressData.addressType,
        street: addressData.street,
        number: addressData.number,
        district: addressData.district,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        complement: addressData.complement || null,
      }).collation({ locale: 'pt', strength: 2 });

      if (existingAddress) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ConflictError({
            title: 'Não Cadastrado!',
            msg: 'Esse Endereço já foi cadastrado.',
          })
        );
      }

      const newAddress = new Address(addressData);
      await newAddress.save({ session });
      await session.commitTransaction();

      res.status(201).json({
        title: 'Endereço Cadastrado!',
        msg: `Endereço ${newAddress.addressType} cadastrado com sucesso!`,
        status: 201,
        level: level,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {}).join(', ');
        next(
          new ConflictError({
            title: 'Conflito de Dados',
            msg: `O valor do campo ${duplicateField} já está em uso.`,
          })
        );
      } else {
        next(error);
      }
    } finally {
      session.endSession();
    }
  };

  static getClientAddresses = async (req, res, next) => {
    try {
      const { userId, level } = req.userData;
      const existingClient = await Client.findOne({ userId: userId });
      if (!existingClient) {
        return next(
          new NotFound({
            title: 'Cliente Não encontrado',
            msg: 'Faça o cadastro do Cliente para buscar Endereços.',
          })
        );
      }
      const listAddress = await Address.find({ clientId: existingClient._id });
      if (listAddress.length === 0) {
        return next(
          new RequestError({
            title: 'Não há endereço!',
            msg: 'Cadastre o endereço de serviço',
          })
        );
      }
      res.status(200).json({
        listAddress,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };

  static getOfficerAddress = async (req, res, next) => {
    try {
      const { userId, level } = req.userData;
      const existingOfficer = await Officer.findOne({ userId: userId });
      if (!existingOfficer) {
        return next(
          new NotFound({
            title: 'Colaborador Não encontrado',
            msg: 'Faça o cadastro do Colaborador para buscar Endereços.',
          })
        );
      }
      const listAddress = await Address.find({
        officerId: existingOfficer._id,
      });
      if (listAddress.length === 0) {
        return next(
          new RequestError({
            title: 'Não há endereço!',
            msg: 'Cadastre o endereço do Colaborador',
          })
        );
      }
      res.status(200).json({
        listAddress,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };

  static allAddress = async (req, res, next) => {
    try {
      const { level } = req.userData;
      const { clientId } = req.params;

      const listAddress = await Address.find({ clientId: clientId });
      if (listAddress.length === 0) {
        return next(
          new RequestError({
            title: 'Não há endereço!',
            msg: 'Cadastre o endereço do Colaborador',
          })
        );
      }
      res.status(200).json({
        listAddress,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };

  static updateAddress = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { addressId } = req.params;
      const { userId, level } = req.userData;

      const address = await Address.findById(addressId).session(session);
      if (!address) {
        return next(
          new NotFound({
            title: 'Não Encontrado!',
            msg: 'Endereço não encontrado.',
          })
        );
      }

      const pendingRequests = await Request.find({
        addressId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      const pendingBudgets = await Budget.find({
        addressId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      const pendingOrders = await Order.find({
        addressId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      if (
        pendingRequests.length > 0 ||
        pendingBudgets.length > 0 ||
        pendingOrders.length > 0
      ) {
        return next(
          new RequestError({
            title: 'Não Alterado!',
            msg: `Não é possível alterar endereços com serviços ou requisições em andamento.`,
          })
        );
      }

      const { clientId, officerId, ...otherData } = req.body;
      const addressData = {
        ...otherData,
        _updatedBy: userId,
      };

      if (clientId) {
        addressData.clientId = clientId;
        addressData.officerId = null;
      }

      if (officerId) {
        addressData.officerId = officerId;
        addressData.clientId = null;
      }

      const existingAddress = await Address.findOne({
        clientId: addressData.clientId || null,
        officerId: addressData.officerId || null,
        addressType: addressData.addressType,
        street: addressData.street,
        number: addressData.number,
        district: addressData.district,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        complement: addressData.complement || null,
        _id: { $ne: addressId },
      }).collation({ locale: 'pt', strength: 2 });

      if (existingAddress) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ConflictError({
            title: 'Não Alterado!',
            msg: 'Esse Endereço já foi cadastrado.',
          })
        );
      }

      await Address.findByIdAndUpdate(addressId, addressData, {
        new: true,
        runValidators: true,
        session,
      });

      await session.commitTransaction();
      res.status(200).json({
        title: 'Endereço Atualizado!',
        msg: 'Endereço atualizado com sucesso.',
        status: 200,
        level: level,
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  };

  static deleteAddressClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { addressId } = req.params;
      const { level } = req.userData;

      const address = await Address.findById(addressId).session(session);
      if (!address) {
        return next(
          new RequestError({
            title: 'Endereço não encontrado',
            msg: `Endereço com ID ${addressId} não foi encontrado no banco de dados.`,
          })
        );
      }

      const pendingRequests = await Request.find({
        addressId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      const pendingBudgets = await Budget.find({
        addressId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      const pendingOrders = await Order.find({
        addressId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      if (
        pendingRequests.length > 0 ||
        pendingBudgets.length > 0 ||
        pendingOrders.length > 0
      ) {
        return next(
          new RequestError({
            title: 'Não Excluído!',
            msg: `Não é possível Excluir endereços com serviços ou requisições em andamento.`,
          })
        );
      }
      await Environment.deleteMany({ addressId }).session(session);
      await Request.deleteMany({ addressId }).session(session);
      await Budget.deleteMany({ addressId }).session(session);
      await Order.deleteMany({ addressId }).session(session);

      await Address.findByIdAndDelete(addressId).session(session);

      await session.commitTransaction();

      return res.status(200).json({
        title: 'Endereço excluído',
        msg: `Endereço e dados associados foram excluídos com sucesso.`,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static getAddressOfficerId = async (req, res, next) => {
    try {
      const { level } = req.userData;
      const { id } = req.params;
      const existingAddress = await Address.find({ officerId: id });
      if (!existingAddress.length) {
        return next(
          new RequestError({
            title: 'Endereço não encontrado!',
            msg: 'Endereço não encontrado no banco de dados.',
          })
        );
      }

      res.status(200).json({
        addresses: existingAddress,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AddressController;
