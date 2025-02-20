import mongoose from 'mongoose';
import { ValidationError } from '../erros/Errors.js';

const addressSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    addressType: {
      type: String,
      required: [true, 'Marque o endereço como Empresarial ou Residencial.'],
      trim: true,
      enum: {
        values: ['Empresarial', 'Residencial'],
        message: 'Tipo de endereço inválido.',
      },
    },
    street: {
      type: String,
      required: [true, 'A rua é obrigatória.'],
      trim: true,
    },
    number: {
      type: Number,
      required: [true, 'O número é obrigatório.'],
      min: [1, 'O número deve ser positivo.'],
    },
    complement: {
      type: String,
      trim: true,
      maxlength: [50, 'O complemento deve ter no máximo 50 caracteres.'],
    },
    district: {
      type: String,
      required: [true, 'O bairro é obrigatório.'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'A cidade é obrigatória.'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'O estado é obrigatório.'],
      trim: true,
      uppercase: true,
      minlength: [2, 'O estado deve ter 2 caracteres.'],
    },
    postalCode: {
      type: String,
      required: [true, 'O CEP é obrigatório.'],
      trim: true,
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (arr) {
          return arr.length === 2;
        },
        message:
          'As coordenadas devem conter dois valores: latitude e longitude.',
      },
      required: [true, 'As coordenadas são obrigatórias.'],
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

addressSchema.pre('save', function (next) {
  if (!this.complement || this.complement.trim() === '') {
    this.complement = null;
  }

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

addressSchema.index(
  {
    clientId: 1,
    officerId: 1,
    addressType: 1,
    street: 1,
    number: 1,
    district: 1,
    city: 1,
    state: 1,
    postalCode: 1,
    complement: 1,
  },
  {
    unique: true,
    collation: { locale: 'pt', strength: 2 },
    partialFilterExpression: {
      $or: [
        { clientId: { $exists: true, $ne: null } },
        { officerId: { $exists: true, $ne: null } },
      ],
    },
  }
);

addressSchema.pre('validate', function (next) {
  try {
    if (!this.officerId && !this.clientId) {
      return next(
        new ValidationError({
          title: 'Validação de Endereço',
          msg: 'O endereço deve estar associado a um "Cliente" ou "Colaborador".',
        })
      );
    }
    if (this.officerId && this.clientId) {
      return next(
        new ValidationError({
          title: 'Validação de Endereço',
          msg: 'O endereço não pode estar associado a Cliente e Colaborador.',
        })
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
