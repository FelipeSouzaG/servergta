import ErrorBase from './ErrorBase.js';

class ConflictError extends ErrorBase {
  constructor({
    title = 'Conflito de Dados!',
    msg = 'Registro já existente.',
  } = {}) {
    super({ title, msg, status: 409 });
  }
}

export default ConflictError;
