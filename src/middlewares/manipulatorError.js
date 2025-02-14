import mongoose from 'mongoose';
import { ErrorBase, ValidationError } from '../erros/Errors.js';

function manipulatorError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const validationError = new ValidationError(error);
    return validationError.sendReply(res);
  }

  if (error instanceof ErrorBase) {
    return error.sendReply(res);
  }

  const genericError = new ErrorBase({
    title: 'Erro Interno!',
    msg: error.message || 'Erro desconhecido no servidor.',
    status: 500,
  });
  return genericError.sendReply(res);
}

export default manipulatorError;
