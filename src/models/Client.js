import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      trim: true,
      required: [true, 'Nome é obrigatório'],
    },
    phone: {
      type: String,
      trim: true,
      required: [true, 'Telefone é obrigatório'],
    },
    clientType: {
      type: String,
      trim: true,
      required: [true, 'Tipo de Cliente obrigatório.'],
      enum: {
        values: ['Novo', 'Comum', 'Contrato'],
        message: 'Tipo de Cliente inválido.',
      },
      default: 'Novo',
    },
    alternativePhone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    register: {
      type: String,
      trim: true,
      default: null,
    },
    clientNumber: {
      type: String,
      required: [true, 'Número do cliente é obrigatório'],
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

clientSchema.pre('save', function (next) {
  try {
    if (!this.register || this.register.trim() === '') {
      this.register = null;
    }

    if (
      this.isModified('register') &&
      (!this.register || this.register.trim() === '')
    ) {
      this.register = null;
    }

    if (
      this.isModified('alternativePhone') &&
      (!this.alternativePhone || this.alternativePhone.trim() === '')
    ) {
      this.alternativePhone = null;
    }

    if (this.isModified() && this._updatedBy) {
      const changes = {};
      this.modifiedPaths().forEach((path) => {
        changes[path] = {
          before: this.get(path, null),
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
  } catch (error) {
    next(error);
  }
});

clientSchema.index(
  { phone: 1, register: 1 },
  {
    unique: true,
    partialFilterExpression: {
      register: { $exists: true, $ne: null },
    },
  }
);

const Client = mongoose.model('Client', clientSchema);

export default Client;
