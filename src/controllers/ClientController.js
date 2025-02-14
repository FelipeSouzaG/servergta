import mongoose from 'mongoose';
import {
  Address,
  Budget,
  Client,
  Environment,
  Order,
  User,
} from '../models/Model.js';
import {
  RequestError,
  ConflictError,
  ValidationError,
  ErrorBase,
  NotFound,
} from '../erros/Errors.js';

class ClientController {
  static registerClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId } = req.userData;
      const { phone, ...otherData } = req.body;
      let dataClient = {
        ...otherData,
      };
      let existingUser = null;
      existingUser = await User.findOne({ _id: userId }).session(session);
      if (existingUser.level === 'Cliente') {
        return next(
          new RequestError({
            title: 'Usuário já cadastrado',
            msg: 'Usuário já associado a outro registro de cliente.',
          })
        );
      }

      dataClient.userId = existingUser._id;
      dataClient.name = existingUser.name;
      dataClient.phone = phone;
      dataClient.clientType = 'Novo';
      dataClient.email = existingUser.email;
      dataClient.createdBy = {
        userId: userId,
        createdAt: new Date(),
      };

      const newClient = new Client(dataClient);
      await newClient.save({ session });

      if (existingUser) {
        existingUser.clientId = newClient._id;
        existingUser.level = 'Cliente';
        existingUser._updatedBy = newClient._id;
        await existingUser.save({ session, validateModifiedOnly: true });
      }

      await session.commitTransaction();
      return res.status(201).json({
        title: 'Cliente Cadastrado!',
        msg: `Cliente ${newClient.clientNumber} - ${newClient.name} criado com sucesso!`,
        level: 'Cliente',
        status: 201,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        let message;
        const duplicateField = Object.keys(error.keyPattern || {}).join(', ');
        if (duplicateField === 'phone') {
          message = 'Telefone cadastrado em outro Cliente.';
        } else if (duplicateField === 'register') {
          message = 'CPF ou CNPJ já cadastrado em outro Cliente.';
        }
        next(
          new ConflictError({
            title: 'Conflito de dados',
            msg: message,
          })
        );
      }
      next(error);
    } finally {
      session.endSession();
    }
  };

  static createClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;
      const { clientUserId, name, ...otherData } = req.body;

      let dataClient = { ...otherData };

      let existingUser = null;

      if (clientUserId) {
        existingUser = await User.findOne({ _id: clientUserId }).session(
          session
        );
        if (!existingUser) {
          return next(
            new RequestError({
              title: 'Usuário não encontrado!',
              msg: 'Id de Usuário não encontrado no banco de dados.',
            })
          );
        }
        if (existingUser.level === 'Cliente') {
          return next(
            new RequestError({
              title: 'Usuário já cadastrado',
              msg: 'Usuário já associado a outro registro de cliente.',
            })
          );
        }
        dataClient.userId = existingUser._id;
        dataClient.name = existingUser.name;
        dataClient.email = existingUser.email;
        existingUser.level = 'Cliente';
      } else {
        if (!name) {
          return next(
            new RequestError({
              title: `Nome Obrigatório!`,
              msg: `Digite o Nome e sobrenome do Cliente.`,
            })
          );
        }
        dataClient.name = name;
      }
      dataClient.createdBy = {
        userId: userId,
        createdAt: new Date(),
      };
      const newClient = new Client(dataClient);
      await newClient.save({ session });

      if (existingUser) {
        existingUser.clientId = newClient._id;
        existingUser._updatedBy = userId;
        await existingUser.save({ session, validateModifiedOnly: true });
      }

      await session.commitTransaction();

      return res.status(201).json({
        title: 'Cliente Cadastrado!',
        msg: `Cliente ${newClient.clientNumber} - ${newClient.name} criado com sucesso!`,
        level: level,
        status: 201,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        let message;
        const duplicateField = Object.keys(error.keyPattern || {}).join(', ');
        if (duplicateField === 'phone') {
          message = 'Telefone cadastrado em outro Cliente.';
        } else if (duplicateField === 'register') {
          message = 'CPF ou CNPJ já cadastrado em outro Cliente.';
        }
        next(
          new ConflictError({
            title: 'Conflito de dados',
            msg: message,
          })
        );
      }
      next(error);
    } finally {
      session.endSession();
    }
  };

  static getAllClient = async (req, res, next) => {
    try {
      const { level } = req.userData;
      const clientList = await Client.find();
      if (clientList.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Clientes!',
            msg: 'Nenhum Cliente cadastrado.',
          })
        );
      }
      return res.status(200).json({
        clientList,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static getClient = async (req, res, next) => {
    try {
      const { level, userId } = req.userData;

      const clientData = await Client.findOne({ userId: userId });

      if (!clientData) {
        return next(
          new RequestError({
            title: 'Não encontrado!',
            msg: 'Dados do Cliente não encontrado. Faça o cadastro de Cliente.',
          })
        );
      }

      res.status(200).json({
        clientData,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };

  static updateClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { clientId } = req.params;
      const { userId, level } = req.userData;

      const client = await Client.findById(clientId).session(session);
      if (!client) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new NotFound({
            title: 'Não Encontrado!',
            msg: 'Cliente não encontrado.',
          })
        );
      }

      const updates = {};
      const updatableFields = [
        'name',
        'phone',
        'alternativePhone',
        'email',
        'register',
        'clientType',
      ];

      updatableFields.forEach((field) => {
        if (req.body.hasOwnProperty(field)) {
          updates[field] =
            req.body[field].trim() === '' ? null : req.body[field];
        } else if (['alternativePhone', 'register', 'email'].includes(field)) {
          updates[field] = null;
        }
      });

      updates._updatedBy = userId;

      const updatedClient = await Client.findByIdAndUpdate(clientId, updates, {
        new: true,
        runValidators: true,
        session,
      });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        title: 'Dados Atualizados!',
        msg: `Dados do Cliente atualizados com sucesso.`,
        status: 200,
        level: level,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        let message;
        const duplicateField = Object.keys(error.keyPattern || {}).join(', ');
        if (duplicateField === 'phone') {
          message = 'Telefone cadastrado em outro Cliente.';
        } else if (duplicateField === 'register') {
          message = 'CPF ou CNPJ já cadastrado em outro Cliente.';
        }
        next(
          new ConflictError({
            title: 'Conflito de dados',
            msg: message,
          })
        );
      }
      next(error);
    } finally {
      session.endSession();
    }
  };

  static deleteClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { clientId } = req.params;
      const { level } = req.userData;

      const client = await Client.findById(clientId).session(session);
      if (!client) {
        return next(
          new RequestError({
            title: 'Cliente não encontrado',
            msg: `Cliente com ID ${clientId} não foi encontrado no banco de dados.`,
          })
        );
      }

      const pendingRequests = await Request.find({
        clientId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      const pendingBudgets = await Budget.find({
        clientId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      const pendingOrders = await Order.find({
        clientId,
        status: { $ne: 'Finalizado' },
      }).session(session);

      if (
        pendingRequests.length > 0 ||
        pendingBudgets.length > 0 ||
        pendingOrders.length > 0
      ) {
        return next(
          new RequestError({
            title: 'Itens pendentes',
            msg: `Não é possivel excluir Cliente com Serviços ou Requisições em andamento.`,
          })
        );
      }

      await Address.deleteMany({ clientId }).session(session);
      await Environment.deleteMany({ clientId }).session(session);
      await Request.deleteMany({ clientId }).session(session);
      await Budget.deleteMany({ clientId }).session(session);
      await Order.deleteMany({ clientId }).session(session);

      await Client.findByIdAndDelete(clientId).session(session);

      await session.commitTransaction();

      return res.status(200).json({
        title: 'Cliente excluído',
        msg: `Cliente e dados associados foram excluídos com sucesso.`,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ClientController;
