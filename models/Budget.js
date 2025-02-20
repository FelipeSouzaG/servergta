import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
    },
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
      },
    ],
    serviceType: {
      type: String,
      required: true,
    },
    servicePrice: {
      type: Number,
      required: true,
    },
    equipment: {
      type: String,
      default: null,
    },
    equipmentPrice: {
      type: Number,
      default: null,
    },
    budgetNumber: {
      type: String,
      required: true,
      unique: true,
    },
    budgetRebate: {
      type: Number,
      default: 0,
    },
    budgetPrice: {
      type: Number,
      required: true,
    },
    budgetStatus: {
      type: String,
      required: [true, 'Selecione o Status do Orçamento.'],
      trim: true,
      enum: {
        values: ['Pendente', 'Reprovado', 'Aprovado'],
        message: 'Status do Orçamento inválido.',
      },
    },
    feedback: {
      type: String,
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
            before: String,
            after: String,
          },
        },
      },
    ],
  },
  { timestamps: true }
);

budgetSchema.pre('save', function (next) {
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

const Budget = mongoose.model('Budget', budgetSchema);

export default Budget;
