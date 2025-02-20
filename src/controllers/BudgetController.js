import { Budget, Request } from '../models/Model.js';
import {
  NotFound,
  RequestError,
  ConflictError,
  ErrorBase,
  ForbiddenError,
} from '../erros/Errors.js';
import mongoose from 'mongoose';
import { normalizeData, normalizeDate } from '../middlewares/normalize.js';

class BudgetController {
  static createBudget = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { userId, level } = req.userData;

      const { requestId, ...otherBudgetData } = req.body;
      if (!requestId) {
        return next(
          new NotFound({
            title: 'Requisição Obrigatório!',
            msg: 'Selecione uma requisição de serviço para criar um orçamento.',
          })
        );
      }

      const budgetData = {
        requestId,
        ...otherBudgetData,
        createdBy: {
          userId,
          createdAt: new Date(),
        },
      };

      const newBudget = new Budget(budgetData);
      await newBudget.save({ session });

      await Request.findByIdAndUpdate(
        requestId,
        {
          requestStatus: 'Orçamento',
          feedback: `Orçamento (${
            newBudget.budgetNumber
          }) enviado para aprovação em ${normalizeDate(new Date())}`,
          budgetId: newBudget._id,
        },
        { new: true, session, runValidators: true }
      );

      await session.commitTransaction();
      session.endSession();
      res.status(201).json({
        title: 'Orçamento Criado',
        msg: 'Orçamento com status de Pendente enviado aguandando aprovação',
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
            title: 'Erro ao criar orçamento',
            msg: 'Houve um erro inesperado ao processar a requisição. Tente novamente mais tarde.',
          })
        );
      }
    } finally {
      session.endSession();
    }
  };

  static getClientBudget = async (req, res, next) => {
    try {
      const { budgetId } = req.params;
      const { level } = req.userData;
      const budget = await Budget.findById(budgetId).populate('serviceIds');
      if (!budget) {
        return next(
          new NotFound({
            title: 'Orçamento não Encontrado!',
            msg: 'Verifique o status do Requisição (Orçamento) ou entre em contato com a GTA.',
          })
        );
      }
      res.status(200).json({
        budget,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static updateBudget = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { budgetId } = req.params;
      const { userId, level } = req.userData;

      const budget = await Budget.findById(budgetId).session(session);
      if (!budget) {
        await session.abortTransaction();
        session.endSession();
        return next(
          new NotFound({
            title: 'Não Encontrado!',
            msg: 'Orçamento não encontrado.',
          })
        );
      }

      const updates = { ...req.body, _updatedBy: userId };

      const updatedBudget = await Budget.findByIdAndUpdate(
        budget._id,
        updates,
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      let person;
      if (level === 'Cliente') {
        person = 'pelo Cliente';
      } else if (level === 'Gestor' || level === 'Secretário') {
        person = 'pela GTA';
      } else {
        await session.abortTransaction();
        session.endSession();
        return next(
          new ForbiddenError({
            title: 'Não Autorizado!',
            msg: 'Orçamentos não podem ser alterados por esse perfil de usuário',
          })
        );
      }
      const requestUpdate = {
        requestStatus: `Orçamento ${updatedBudget.budgetStatus}`,
        feedback: `Orçamento ${updatedBudget.budgetNumber} ${
          updatedBudget.budgetStatus
        } ${person} em ${normalizeDate(new Date())}`,
        budgetId: updatedBudget._id,
        _updatedBy: userId,
      };

      const updatedRequest = await Request.findByIdAndUpdate(
        updatedBudget.requestId,
        requestUpdate,
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      await session.commitTransaction();
      res.status(200).json({
        title: 'Orçamento Validado!',
        msg: `Orçamento ${updatedBudget.budgetStatus} ${person}.`,
        status: 200,
        level,
      });
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

  static getAllBudgets = async (req, res, next) => {
    try {
      const { level } = req.userData;

      const budgetList = await Budget.find()
        .populate('userId', 'name email level')
        .populate({
          path: 'clientId',
          select:
            'userId name phone clientType alternativePhone email clientNumber',
          populate: {
            path: 'userId',
            select: 'name email level',
          },
        })
        .populate(
          'addressId',
          'addressType street number complement district city state postalCode coordinates'
        )
        .populate('environmentId', 'environmentName environmentSize')
        .populate({
          path: 'requestId',
          select:
            'environmentName environmentSize environmentId requestType requestStatus maintenanceProblem installationEquipment phone requestNumber dateVisit timeVisit feedback budgetId',
          populate: {
            path: 'environmentId',
            select:
              'environmentName environmentSize equipmentType equipmentBrand equipmentModel capacityBTU cicle volt serialModel equipmentNumber',
          },
        })
        .populate(
          'environmentId',
          'environmentName environmentSize equipmentType equipmentBrand equipmentModel capacityBTU cicle volt serialModel equipmentNumber'
        )
        .populate('serviceIds', 'serviceType serviceName servicePrice');
      if (budgetList.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Orçamentos!',
            msg: 'Nenhum Orçamento Enviado',
          })
        );
      }
      res.status(200).json({
        budgetList,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static updateBudgetClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const { budgetId } = req.params;
      const budgetData = req.body;
      const { userId, level } = req.userData;

      const allowedFields = [
        'budgetStatus',
        'nameClient',
        'cnpjCpfClient',
        'phoneClient',
        'phoneAlternativeClient',
        'feedback',
      ];

      session.startTransaction();

      const budget = await Budget.findById(budgetId).session(session);
      if (!budget) {
        return next(
          new NotFound({
            title: 'Orçamento não encontrado.',
            msg: 'Orçamento não encontrado no banco de dados.',
          })
        );
      }

      allowedFields.forEach((field) => {
        if (field in budgetData) {
          budget[field] = budgetData[field];
        }
      });

      if (level === 'Usuário' && budget.budgetStatus === 'Aprovado') {
        if (
          !budget.nameClient ||
          !budget.cnpjCpfClient ||
          !budget.phoneClient
        ) {
          return res.status(400).json({
            message: 'Preencha os dados para gerar Ordem de Serviço',
          });
        }
      } else if (
        level === 'Cliente' &&
        budget.budgetStatus === 'Pendente Aprovação'
      ) {
        return res.status(400).json({
          message: 'Valide o Orçamento Aprovando ou Reprovando',
        });
      }

      if (budget.budgetStatus === 'Reprovado') {
        if (budget.feedback === 'excluir') {
          const request = await Request.findById(budget.requestId).session(
            session
          );
          if (request) {
            await request.deleteOne({ session });
          }
          await budget.deleteOne({ session });
          await session.commitTransaction();

          return res.status(200).json({
            message: 'Reprovado. Orçamento e Requisição excluídos',
          });
        } else if (budget.feedback === 'Refazer Orçamento') {
          await budget.save({ session });
          await session.commitTransaction();

          return res.status(200).json({
            message: 'Reprovado. Orçamento será refeito e atualizado',
            budget,
          });
        }
      }

      budget._updatedBy = userId;

      await budget.save({ session });

      await session.commitTransaction();

      res.status(200).json({
        message:
          'Orçamento Aprovado. Aguarde a Ordem de Serviço para execução.',
        budget,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    } finally {
      session.endSession();
    }
  };
}

export default BudgetController;
