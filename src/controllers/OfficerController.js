import mongoose from 'mongoose';
import { Officer, User } from '../models/Model.js';
import {
  RequestError,
  ConflictError,
  ValidationError,
} from '../erros/Errors.js';

class OfficerController {
  static registerOfficer = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;
      const { officerId, ...otherData } = req.body;
      let dataOfficer = {
        ...otherData,
      };
      let existingUser = null;
      existingUser = await User.findOne({ _id: officerId }).session(session);
      if (existingUser.level !== 'Usuário') {
        return next(
          new RequestError({
            title: 'Não Cadastrado',
            msg: `Esse usuário é um ${existingUser.level}. Cadastre um Colaborador a partir de um Usuário novo.`,
          })
        );
      }

      dataOfficer.userId = officerId;
      dataOfficer.createdBy = {
        userId: userId,
        createdAt: new Date(),
      };

      const newOfficer = new Officer(dataOfficer);
      await newOfficer.save({ session });

      if (existingUser) {
        existingUser.officerId = newOfficer._id;
        existingUser.level = newOfficer.officerType;
        existingUser._updatedBy = userId;
        await existingUser.save({ session, validateModifiedOnly: true });
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        title: 'Colaborador Cadastrado!',
        msg: `Colaborador ${newOfficer.officerNumber} - ${newOfficer.name} criado com sucesso!`,
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

  static getAllOfficers = async (req, res, next) => {
    try {
      const { level } = req.userData || {};

      const listOfficer = await Officer.find().populate(
        'userId',
        'name email level'
      );

      if (listOfficer.length === 0) {
        return next(
          new RequestError({
            title: 'Não há colaboradores',
            msg: 'Cadastre colaboradores',
          })
        );
      }
      return res.status(200).json({
        listOfficer,
        level: level,
        status: 200,
      });
    } catch (error) {
      if (error instanceof mongoose.Error) {
        next(
          new ErrorBase({
            title: 'Falha na Conexão!',
            msg: 'Erro ao tentar acessar os dados no banco de dados.',
          })
        );
      } else {
        next(error);
      }
    }
  };
}

export default OfficerController;
