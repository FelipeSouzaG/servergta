import mongoose from 'mongoose';
import {
  Environment,
  HistoryMaintenance,
  Order,
  Request,
} from '../models/Model.js';
import { RequestError, ConflictError, ErrorBase } from '../erros/Errors.js';
import { normalizeDate } from '../middlewares/normalize.js';

class HistoryMaintenanceController {
  static registerHistory = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, level } = req.userData;
      const { environmentId, requestId, orderId, ...otherData } = req.body;

      const environment = await Environment.findById(environmentId).session(
        session
      );
      if (!environment) {
        await session.abortTransaction();
        return next(
          new RequestError({
            title: 'Ambiente não encontrado',
            msg: 'Ambiente não encontrado para finalizar os serviços realizados.',
          })
        );
      }

      const historyData = {
        environmentId,
        date: new Date(),
        ...otherData,
        createdBy: {
          userId,
          createdAt: new Date(),
        },
      };

      const newHistory = new HistoryMaintenance(historyData);
      await newHistory.save({ session });

      if (requestId) {
        const request = await Request.findById(requestId).session(session);

        if (!request) {
          await session.abortTransaction();
          return next(
            new RequestError({
              title: 'Erro na Requisição',
              msg: 'A requisição informada não foi encontrada.',
            })
          );
        }

        request.requestStatus = 'Finalizado';
        request.feedback = `Serviços finalizados em ${normalizeDate(
          newHistory.date
        )}`;
        request._update = userId;
        await request.save({ session });
      }

      if (orderId) {
        const order = await Order.findById(orderId).session(session);

        if (!order) {
          await session.abortTransaction();
          return next(
            new RequestError({
              title: 'Erro na Ordem de Serviço',
              msg: 'A Ordem de Serviço informada não foi encontrada.',
            })
          );
        }
        order._update = userId;
        order.orderStatus = 'Realizado';
        order.feedback = `Serviços finalizados em ${normalizeDate(
          newHistory.date
        )}`;

        await order.save({ session });
      }

      await session.commitTransaction();

      res.status(201).json({
        title: 'Serviço Finalizado!',
        msg: `Serviços finalizados em ${normalizeDate(
          newHistory.date
        )} e Histórico do Ambiente Atualizado`,
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
            title: 'Erro ao Cadastrar serviços',
            msg: 'Houve um erro inesperado ao processar a requisição. Tente novamente mais tarde.',
          })
        );
      }
    } finally {
      session.endSession();
    }
  };

  static environmentHistory = async (req, res, next) => {
    try {
      const { environmentId } = req.params;

      if (!environmentId) {
        return next(
          new RequestError({
            title: 'ID do Ambiente',
            msg: 'O parâmetro Id do Ambiente é obrigatório.',
          })
        );
      }

      const historys = await HistoryMaintenance.find({ environmentId });

      if (historys.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Serviços!',
            msg: 'Não foi realizado nenhum serviço neste Ambiente.',
          })
        );
      }

      res.status(200).json({
        historys,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default HistoryMaintenanceController;
