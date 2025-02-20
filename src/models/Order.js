import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Id da Requisição obrigatória'],
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      required: [true, 'Id do Técnico obrigatório'],
      trim: true,
    },
    orderStatus: {
      type: String,
      required: [true, 'Status da Ordem de Serviço é obrigatório.'],
      trim: true,
      enum: {
        values: ['Programado', 'Realizado'],
        message: 'Status da O.S inválido.',
      },
    },
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
      },
    ],
    orderNumber: {
      type: String,
      required: [true, 'Número da Requisição é obrigatório.'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Insira a data de realização da O.S.'],
      trim: true,
    },
    time: {
      type: String,
      required: [true, 'Insira a hora programada de realização da O.S.'],
      trim: true,
    },
    feedback: {
      type: String,
    },
    budgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Budget',
      default: null,
    },
    environmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Environment',
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

orderSchema.pre('save', function (next) {
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
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
