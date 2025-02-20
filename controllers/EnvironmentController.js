import mongoose from 'mongoose';
import { Environment, Client, Request } from '../models/Model.js';
import { RequestError, ConflictError, ErrorBase } from '../erros/Errors.js';

class EnvironmentController {
  static registerEnvironment = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, level } = req.userData;
      const {
        clientId,
        addressId,
        environmentName,
        equipmentNumber,
        requestId,
        ...otherData
      } = req.body;

      const client = await Client.findById(clientId).session(session);
      if (!client) {
        await session.abortTransaction();
        return next(
          new RequestError({
            title: 'Cliente não encontrado',
            msg: 'O Cliente informado não existe no banco de dados.',
          })
        );
      }

      const formattedEnvName = environmentName
        .replace(/\s+/g, '-')
        .toLowerCase();
      const envId = `${addressId}-${formattedEnvName}`;

      const requestEnv = await Request.findOne({
        addressId: addressId,
        envId: envId,
        requestStatus: { $ne: 'Finalizado' },
      }).session(session);

      if (requestEnv && level !== 'Técnico') {
        await session.abortTransaction();
        return next(
          new RequestError({
            title: 'Requisição em Andamento',
            msg: `Existe uma Requisição aberta para esse Endereço e com Ambiente de nome ${environmentName}.`,
          })
        );
      }

      const existingEnvironment = await Environment.findOne({
        clientId,
        addressId,
        environmentName: { $regex: new RegExp(`^${formattedEnvName}$`, 'i') },
      }).session(session);

      if (existingEnvironment) {
        await session.abortTransaction();
        return next(
          new RequestError({
            title: 'Não Cadastrado!',
            msg: `O ambiente com nome '${environmentName}' já foi cadastrado para este endereço.`,
          })
        );
      }

      let dataEnvironment = {
        clientId,
        addressId,
        environmentName,
        equipmentNumber,
        ...otherData,
        createdBy: {
          userId,
          createdAt: new Date(),
        },
      };

      const newEnvironment = new Environment(dataEnvironment);
      await newEnvironment.save({ session });

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

        request.environmentId = newEnvironment._id;
        request.envId = null;

        await request.save({ session });
      }

      if (client.clientType === 'Novo') {
        client.clientType = 'Comum';
        await client.save({ session });
      }
      await session.commitTransaction();
      res.status(201).json({
        title: 'Ambiente Cadastrado!',
        msg: `Equipamento ${newEnvironment.equipmentNumber} cadastrado ao ambiente!`,
        status: 201,
        level: level,
        data: newEnvironment,
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
            title: 'Erro ao Cadastrar Ambiente',
            msg: 'Houve um erro inesperado ao processar a requisição. Tente novamente mais tarde.',
          })
        );
      }
    } finally {
      session.endSession();
    }
  };

  static environmentAddressClient = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { level } = req.userData;
      const { addressId } = req.params;

      if (!addressId) {
        return next(
          new RequestError({
            title: 'ID do Endereço',
            msg: 'O parâmetro addressId é obrigatório.',
          })
        );
      }

      const environmentsAddress = await Environment.find({
        addressId,
      }).session(session);

      if (environmentsAddress.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Ambiente!',
            msg: 'Não há um ambiente e equipamento cadastrado para esse endereço.',
          })
        );
      }

      await session.commitTransaction();

      res.status(200).json({
        environmentsAddress,
        status: 200,
        level,
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  };
}

export default EnvironmentController;
