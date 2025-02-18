import mongoose from 'mongoose';
import { Request, Client } from '../models/Model.js';
import {
  RequestError,
  ConflictError,
  ErrorBase,
  NotFound,
} from '../erros/Errors.js';
import { normalizeDate } from '../middlewares/normalize.js';

class RequestController {
  static registerRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;

      const { clientId, addressId, envName, environmentId, ...otherData } =
        req.body;

      if (!clientId || !addressId) {
        return next(
          new RequestError({
            title: 'Dados inválidos',
            msg: 'O cliente e o endereço são obrigatórios para registrar a requisição.',
            status: 400,
          })
        );
      }

      let envId = null;
      const dataRequest = {
        clientId,
        addressId,
        ...otherData,
        createdBy: {
          userId: userId,
          createdAt: new Date(),
        },
      };

      if (!environmentId && envName) {
        envId = `${addressId}-${envName.replace(/\s+/g, '-').toLowerCase()}`;
        dataRequest.envId = envId;
        dataRequest.environmentId = null;
      }

      if (environmentId) {
        dataRequest.environmentId = environmentId;
        dataRequest.envId = null;
      }

      const newRequest = new Request(dataRequest);
      await newRequest.save({ session });

      await session.commitTransaction();

      res.status(201).json({
        title: 'Serviço Registrado!',
        msg: `Solicitação de Serviço ${newRequest.requestNumber} registrado com sucesso!`,
        status: 201,
        level: level,
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  };

  static getClientRequests = async (req, res, next) => {
    try {
      const { level, userId } = req.userData;
      const clientId = await Client.findOne({ userId: userId });

      if (!clientId) {
        return next(
          new RequestError({
            title: 'Não Encontrado!',
            msg: 'Dados do Cliente não encontrado.',
          })
        );
      }

      const requests = await Request.find({ clientId })
        .populate(
          'addressId',
          'addressType street number complement district city state postalCode'
        )
        .populate('environmentId', 'environmentName environmentSize')
        .populate('budgetId', 'budgetStatus')
        .populate('orderId', 'orderStatus date time');

      if (requests.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Requisições!',
            msg: 'Cliente não possui solicitações de Serviços.',
          })
        );
      }

      res.status(200).json({
        requests,
        level: level,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };

  static getAllRequests = async (req, res, next) => {
    try {
      const { level } = req.userData;

      const requestList = await Request.find()
        .populate(
          'clientId',
          'name phone clientType alternativePhone email register clientNumber userId'
        )
        .populate(
          'addressId',
          'addressType street number complement district city state postalCode'
        )
        .populate(
          'environmentId',
          'environmentName environmentSize equipmentType equipmentBrand equipmentModel capacityBTU cicle volt serialModel equipmentNumber'
        )
        .populate('serviceIds', 'serviceType serviceName servicePrice')
        .populate({
          path: 'budgetId',
          select:
            'serviceIds serviceType servicePrice equipment equipmentPrice budgetNumber budgetRebate budgetPrice budgetStatus feedback',
          populate: {
            path: 'serviceIds',
            select: 'serviceType serviceName servicePrice',
          },
        })
        .populate('orderId', 'orderStatus date time');

      if (requestList.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Requisições!',
            msg: 'Nenhuma Requisição de serviço registrada.',
          })
        );
      }

      return res.status(200).json({
        requestList,
        status: 200,
        level: level,
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

  static updateRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { requestId } = req.params;
      const { userId, level } = req.userData;

      const request = await Request.findById(requestId).session(session);
      if (!request) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new NotFound({
            title: 'Não Encontrado!',
            msg: 'Requisição de serviços não encontrada.',
          })
        );
      }

      const updates = {};
      for (const key in req.body) {
        if (req.body.hasOwnProperty(key)) {
          updates[key] = req.body[key];
        }
      }
      updates._updatedBy = userId;

      const updatedRequest = await Request.findByIdAndUpdate(
        requestId,
        updates,
        {
          new: true,
          runValidators: true,
          session,
        }
      );
      await session.commitTransaction();
      session.endSession();

      let returnRes = {};
      if (updatedRequest.requestStatus === 'Visita Técnica') {
        returnRes.title = 'Requisição Atualizada!';
        returnRes.msg = `Visita marcada para ${normalizeDate(
          updatedRequest.dateVisit
        )} ás ${updatedRequest.timeVisit}.`;
        returnRes.status = 200;
        returnRes.level = level;
      } else if (updatedRequest.requestStatus === 'Finalizado') {
        returnRes.title = 'Requisição Finalizada!';
        returnRes.msg = `Requisição finalizada pela GTA.`;
        returnRes.status = 200;
        returnRes.level = level;
      } else {
        returnRes.title = 'Requisição Atualizada!';
        returnRes.msg = `Requisição atualizada pelo ${level}.`;
        returnRes.status = 200;
        returnRes.level = level;
      }

      res.status(200).json(returnRes);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
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

export default RequestController;
