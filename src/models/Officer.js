import mongoose from 'mongoose';

const officerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Id de Usuário não fornecido para o Colaborador.'],
    },
    register: {
      type: String,
      trim: true,
      required: [true, 'CPF do Colaborador Obrigatório'],
    },
    phone: {
      type: String,
      required: [true, 'Telefone é obrigatório'],
      trim: true,
    },
    officerNumber: {
      type: String,
      required: true,
    },
    officerType: {
      type: String,
      required: true,
      enum: {
        values: ['Técnico', 'Secretário', 'Gestor'],
        message: 'Tipo de colaborador inválido',
      },
    },
    officerLevel: {
      type: String,
      required: true,
      enum: {
        values: ['Junior', 'Pleno', 'Sênior'],
        message: 'Nível do colaborador inválido.',
      },
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
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

officerSchema.pre('save', function (next) {
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

officerSchema.index(
  { phone: 1, register: 1, officerNumber: 1 },
  {
    unique: true,
  }
);

const Officer = mongoose.model('Officer', officerSchema);

export default Officer;
