import mongoose from 'mongoose';
import { RequestError } from '../erros/Errors.js';

const requestSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Id de Cliente obrigatório'],
      trim: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: [true, 'Id de endereço obrigatório'],
      trim: true,
    },
    environmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Environment',
      default: null,
    },
    envId: {
      type: String,
      trim: true,
      default: null,
    },
    requestType: {
      type: String,
      required: [true, 'O tipo de serviço é obrigatório.'],
      trim: true,
      enum: {
        values: ['Instalação', 'Manutenção'],
        message: 'Tipo de serviço inválido.',
      },
    },
    requestStatus: {
      type: String,
      required: [true, 'Status da requisição é obrigatório.'],
      trim: true,
      enum: {
        values: [
          'Pendente',
          'Retorno',
          'Visita Técnica Programada',
          'Visita Técnica Realizada',
          'Orçamento',
          'Orçamento Aprovado',
          'Orçamento Reprovado',
          'Ordem de Serviço Programada',
          'Ordem de Serviço Realizada',
          'Finalizado',
        ],
        message: 'Status de serviço inválido.',
      },
    },
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        default: null,
      },
    ],
    maintenanceProblem: {
      type: String,
      trim: true,
      default: null,
    },
    installationEquipment: {
      type: String,
      trim: true,
      default: null,
    },
    requestNumber: {
      type: String,
      required: [true, 'Número da Requisição é obrigatório.'],
      trim: true,
    },
    requestDate: {
      type: String,
    },
    dateVisit: {
      type: String,
    },
    timeVisit: {
      type: String,
    },
    feedback: {
      type: String,
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    budgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Budget',
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'O identificador do criador é obrigatório.'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    modificationHistory: [
      {
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changes: {
          type: Map,
          of: {
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed,
          },
        },
      },
    ],
  },
  { timestamps: true }
);

requestSchema.pre('save', async function (next) {
  if (this.isModified() && this._updatedBy) {
    const changes = {};
    this.modifiedPaths().forEach((path) => {
      changes[path] = {
        before: this.get(path),
        after: this.getModified(path),
      };
    });

    this.modificationHistory.push({
      updatedAt: new Date(),
      updatedBy: this._updatedBy,
      changes,
    });
  }

  const hasMaintenanceProblem = !!this.maintenanceProblem;
  const hasInstallationEquipment = !!this.installationEquipment;
  const hasServiceIds = !!(this.serviceIds && this.serviceIds.length > 0);

  if (!hasMaintenanceProblem && !hasInstallationEquipment && !hasServiceIds) {
    return next(
      new RequestError({
        title: 'Tipo de Serviços da REQ',
        msg: 'Selecione Serviços de Manutenção ou Instação para a Solicitação',
      })
    );
  }

  if (hasMaintenanceProblem && hasInstallationEquipment) {
    return next(
      new RequestError({
        title: 'Falha no Tipo da REQ',
        msg: 'A REQ deve conter apenas Instalação ou Manutenção, não ambos.',
      })
    );
  }

  if (hasMaintenanceProblem && hasServiceIds) {
    return next(
      new RequestError({
        title: 'Tipo de Manutenção',
        msg: 'A REQ deve conter apenas Serviços ou Problema de Manutenção, não ambos.',
      })
    );
  }

  if (this.environmentId) {
    const existingRequest = await mongoose.models.Request.findOne({
      environmentId: this.environmentId,
      requestStatus: { $ne: 'Finalizado' },
      _id: { $ne: this._id },
    });

    if (existingRequest) {
      return next(
        new RequestError({
          title: 'Erro na Solicitação!',
          msg: 'Já existe uma requisição aberta para este ambiente.',
        })
      );
    }
  } else if (this.envId) {
    const existingRequest = await mongoose.models.Request.findOne({
      addressId: this.addressId,
      envId: this.envId,
      requestStatus: { $ne: 'Finalizado' },
      _id: { $ne: this._id },
    });

    if (existingRequest) {
      return next(
        new RequestError({
          title: 'Erro na Solicitação!',
          msg: 'Já existe uma requisição aberta para este ambiente.',
        })
      );
    }
  }

  next();
});

requestSchema.index(
  {
    addressId: 1,
    environmentId: 1,
    envId: 1,
    requestStatus: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      requestStatus: { $ne: 'Finalizado' },
    },
  }
);

const Request = mongoose.model('Request', requestSchema);

export default Request;
