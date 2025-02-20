import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      required: true,
      enum: ['Instalação', 'Manutenção'],
    },
    serviceName: {
      type: String,
      required: [true, 'Digite o nome do Serviço.'],
      trim: true,
    },
    serviceDescription: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.every((desc) => desc.trim() !== '') && v.length > 0;
        },
        message:
          'Descreva o serviço a ser realizado com pelo menos uma descrição válida.',
      },
    },
    servicePrice: {
      type: Number,
      required: [true, 'Preço do serviço é obrigatório.'],
      min: [0, 'Preço não pode ser negativo.'],
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

ServiceSchema.pre('save', function (next) {
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

ServiceSchema.index(
  {
    serviceType: 1,
    serviceName: 1,
  },
  {
    unique: true,
    collation: { locale: 'pt', strength: 2 },
  }
);

const Service = mongoose.model('Service', ServiceSchema);

export default Service;
