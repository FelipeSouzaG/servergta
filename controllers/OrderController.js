import { Order, Budget, Request, Officer } from '../models/Model.js';
import {
  NotFound,
  RequestError,
  ConflictError,
  ErrorBase,
} from '../erros/Errors.js';
import mongoose from 'mongoose';
import { normalizeDate } from '../middlewares/normalize.js';

class OrderController {
  static createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;

      const { requestId, ...otherOrderData } = req.body;
      if (!requestId) {
        return next(
          new NotFound({
            title: 'Requisição Obrigatório!',
            msg: 'Selecione uma requisição de serviço para criar uma Ordem de Serviço.',
          })
        );
      }

      const orderData = {
        requestId,
        ...otherOrderData,
        createdBy: {
          userId,
          createdAt: new Date(),
        },
      };

      const newOrder = new Order(orderData);
      await newOrder.save({ session });

      await Request.findByIdAndUpdate(
        requestId,
        {
          requestStatus: 'Ordem de Serviço Programada',
          feedback: `Ordem de Serviço ${
            newOrder.orderNumber
          } programada para ${normalizeDate(newOrder.date)} as ${
            newOrder.time
          }`,
          orderId: newOrder._id,
        },
        { new: true, session, runValidators: true }
      );

      await session.commitTransaction();
      session.endSession();
      res.status(201).json({
        title: 'Ordem de Serviço Criada!',
        msg: `Ordem de Serviço Programada para ${normalizeDate(
          newOrder.date
        )} as ${newOrder.time}.`,
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
            title: 'Erro ao criar Ordem de Serviço',
            msg: 'Houve um erro inesperado ao processar a requisição. Tente novamente mais tarde.',
          })
        );
      }
    } finally {
      session.endSession();
    }
  };

  static updateOrder = async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const orderData = req.body;
      const { userId, level } = req.userData;

      const order = await Order.findById(orderId);
      if (!order) {
        return next(
          new NotFound({
            title: 'Ordem de Serviço não Encontrada!',
            msg: 'Selecione uma Ordem de Serviço para alteração de dados.',
          })
        );
      }

      const allowedFields = ['orderStatus', 'feedback'];
      Object.keys(orderData).forEach((key) => {
        if (allowedFields.includes(key)) {
          order[key] = orderData[key];
        }
      });

      order._updatedBy = userId;

      await order.save();
      res.status(200).json({
        title: 'Ordem de Serviço Alterada!',
        msg: 'Ordem de Serviço salva com as alterações.',
        status: 200,
        level: level,
      });
    } catch (error) {
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
            title: 'Erro ao alterar ordem de Serviço',
            msg: 'Houve um erro inesperado ao processar a requisição. Tente novamente mais tarde.',
          })
        );
      }
    }
  };

  static getClientOrders = async (req, res, next) => {
    try {
      const { clientId } = req.params;
      const { level } = req.userData;
      const orderList = await Order.find({ clientId });
      res.status(200).json({
        orderList,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static getAllOrders = async (req, res, next) => {
    try {
      const { level } = req.userData;

      const ordersList = await Order.find();
      if (ordersList.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Ordens de Serviço!',
            msg: 'Nenhuma Ordem de Serviço Enviado',
          })
        );
      }
      res.status(200).json({
        ordersList,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static getAllOrdersOfficer = async (req, res, next) => {
    try {
      const { userId, level } = req.userData;

      const existingOfficer = await Officer.findOne({ userId });

      if (!existingOfficer) {
        return next(
          new NotFound({
            title: 'Técnico não encontrado!',
            msg: 'Colaborador Nível Técnico não encontrado ou inexistente.',
          })
        );
      }

      const ordersList = await Order.find({
        officerId: existingOfficer._id,
        orderStatus: 'Programado',
      })
        .populate({
          path: 'requestId',
          select:
            'clientId addressId environmentId envId requestType requestStatus',
          populate: [
            {
              path: 'clientId',
              select: 'name phone alternativePhone clientNumber',
            },
            {
              path: 'addressId',
              select:
                'addressType street number complement district city state postalCode clientId',
            },
            {
              path: 'environmentId',
              select:
                'environmentName environmentSize equipmentType equipmentBrand equipmentModel capacityBTU cicle volt serialModel equipmentNumber',
            },
          ],
        })
        .populate({
          path: 'officerId',
          select:
            'userId register phone officerNumber officerType officerLevel',
          populate: {
            path: 'userId',
            select: 'name',
          },
        })
        .populate('serviceIds', 'serviceType serviceName serviceDescription');

      const requestsList = await Request.find({
        officerId: existingOfficer._id,
        requestStatus: 'Visita Técnica Programada',
      })
        .populate('clientId', 'userId name phone alternativePhone clientNumber')
        .populate(
          'addressId',
          'addressType street number complement district city state postalCode'
        )
        .populate(
          'environmentId',
          'environmentName environmentSize equipmentType equipmentBrand equipmentModel capacityBTU cicle volt serialModel equipmentNumber'
        )
        .populate({
          path: 'officerId',
          select:
            'userId register phone officerNumber officerType officerLevel',
          populate: {
            path: 'userId',
            select: 'name',
          },
        })
        .populate('serviceIds', 'serviceType serviceName serviceDescription');

      const programService = {
        requests: requestsList,
        orders: ordersList,
      };

      if (
        programService.requests.length === 0 &&
        programService.orders.length === 0
      ) {
        return next(
          new RequestError({
            title: 'Não há Serviços!',
            msg: 'Nenhuma Ordem de Serviço ou Visita Técnica Programada para o Técnico hoje.',
          })
        );
      }

      res.status(200).json({
        programService,
        status: 200,
        level,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default OrderController;
