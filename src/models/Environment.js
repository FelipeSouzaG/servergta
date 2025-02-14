import mongoose from 'mongoose';

const environmentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Id de cliente é obrigatório'],
      trim: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: [true, 'Id de endereço obrigatório'],
      trim: true,
    },
    environmentName: {
      type: String,
      required: [true, 'Nome do Ambiente é obrigatório.'],
      trim: true,
    },
    environmentSize: {
      type: Number,
      required: [true, 'Tamanho (Área em m²) é obrigatório.'],
      min: [1, 'O número deve ser positivo.'],
    },
    equipmentType: { type: String, required: true },
    equipmentBrand: { type: String, required: true },
    equipmentModel: { type: String, required: true },
    capacityBTU: {
      type: Number,
      required: true,
      min: [0, 'A capacidade BTU deve ser um valor positivo.'],
    },
    cicle: { type: String, required: true },
    volt: {
      type: String,
      required: true,
      min: [0, 'A voltagem deve ser um valor positivo.'],
    },
    serialModel: { type: String, required: true },
    equipmentNumber: {
      type: String,
      required: [true, 'Número do Equipamento é obrigatório.'],
      trim: true,
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

environmentSchema.pre('save', function (next) {
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

environmentSchema.index(
  {
    clientId: 1,
    addressId: 1,
    environmentName: 1,
  },
  {
    unique: true,
    collation: { locale: 'pt', strength: 2 },
  }
);

const Environment = mongoose.model('Environment', environmentSchema);

export default Environment;
