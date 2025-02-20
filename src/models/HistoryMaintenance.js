import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema(
  {
    environmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Environment',
      required: [true, 'Id do ambiente é obrigatório'],
      trim: true,
    },
    maintenance: [
      {
        service: {
          type: String,
          required: [true, 'Nome do serviço é obrigatório'],
          trim: true,
        },
        obs: { type: String, trim: true },
      },
    ],
    date: { type: Date, default: Date.now, immutable: true },
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
  },
  { timestamps: true }
);

const HistoryMaintenance = mongoose.model('HistoryMaintenance', HistorySchema);

export default HistoryMaintenance;
