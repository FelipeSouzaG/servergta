import mongoose from 'mongoose';
import { Service } from '../models/Model.js';
import {
  RequestError,
  ConflictError,
  ErrorBase,
  NotFound,
} from '../erros/Errors.js';

class ServiceController {
  static registerService = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;

      const { serviceType, serviceName, ...otherData } = req.body;

      const existingService = await Service.findOne({
        serviceType,
        serviceName,
      })
        .collation({ locale: 'pt', strength: 2 })
        .session(session);

      if (existingService) {
        return next(
          new RequestError({
            title: 'Serviço já Cadastrado!',
            msg: 'O nome do serviço já foi cadastrado para esse tipo.',
          })
        );
      }

      const serviceData = {
        serviceType,
        serviceName,
        ...otherData,
        createdBy: {
          userId,
          createdAt: new Date(),
        },
      };

      const newService = new Service(serviceData);
      await newService.save({ session });
      await session.commitTransaction();

      res.status(201).json({
        title: 'Serviço Cadastrado!',
        msg: `Serviço ${newService.serviceName} de ${newService.serviceType} cadastrado com sucesso!`,
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
        next(
          new ErrorBase({
            title: 'Erro ao Cadastrar serviço',
            msg: 'Houve um erro inesperado ao processar a requisição. Tente novamente mais tarde.',
          })
        );
      }
    } finally {
      session.endSession();
    }
  };

  static allServices = async (req, res, next) => {
    try {
      const { level } = req.userData;

      const listService = await Service.find();

      if (listService.length === 0) {
        return next(
          new NotFound({
            title: 'Não há Serviços!',
            msg: 'Cadastre Serviços.',
          })
        );
      }

      res.status(200).json({
        listService,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ServiceController;
