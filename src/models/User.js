import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../erros/Errors.js';
import Client from './Client.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório.'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória.'],
    },
    level: {
      type: String,
      required: [true, 'Nível de usuário é obrigatório.'],
      enum: ['Usuário', 'Cliente', 'Técnico', 'Secretário', 'Gestor'],
      default: 'Usuário',
    },
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

userSchema.methods.isCurrentPasswordValid = async function (currentPassword) {
  return await bcrypt.compare(currentPassword, this.password);
};

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  const isPasswordValid =
    user && (await bcrypt.compare(password, user.password));
  if (!user || !isPasswordValid) {
    throw new UnauthorizedError({
      title: 'Falha nas Credenciais!',
      msg: 'Usuário ou Senha Inválidos!',
    });
  }
  const token = jwt.sign(
    { userId: user._id, level: user.level },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '5m' }
  );

  return {
    token,
    name: user.name,
    level: user.level,
  };
};

userSchema.pre('save', async function (next) {
  if (
    this.isModified('level') &&
    this.level === 'Cliente' &&
    !this.isModified('password')
  ) {
    return next();
  }

  if (
    (this.isModified('officerId') || this.isModified('clientId')) &&
    !this.isModified('password')
  ) {
    return next();
  }

  if (this.isModified() && this._updatedBy) {
    const changes = {};

    this.modifiedPaths().forEach((path) => {
      if (path !== 'password') {
        changes[path] = {
          before: this.get(path, null, { getters: false }),
          after: this[path],
        };
      }
    });

    this.modificationHistory.push({
      updatedAt: new Date(),
      updatedBy: this._updatedBy,
      changes,
    });
  }

  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

userSchema.post('findOneAndDelete', async function (doc, next) {
  try {
    if (doc) {
      await Client.updateOne({ userId: doc._id }, { $unset: { userId: '' } });
    }
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);
export default User;
