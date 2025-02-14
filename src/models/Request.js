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
          'Visita Técnica',
          'Orçamento',
          'Ordem de Serviço',
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
    dateVisit: {
      type: String,
    },
    timeVisit: {
      type: String,
    },
    feedback: {
      type: String,
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
  if (
    !(
      this.maintenanceProblem ||
      this.installationEquipment ||
      this.serviceIds
    ) ||
    (this.maintenanceProblem && this.installationEquipment) ||
    (this.maintenanceProblem && this.serviceIds)
  ) {
    return next(
      new RequestError({
        title: 'Falha no Tipo da REQ',
        msg: 'A REQ deve passar ou Instalação ou Manutenção na solicitação',
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
