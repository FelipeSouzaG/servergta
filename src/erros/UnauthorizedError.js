import ErrorBase from './ErrorBase.js';

class UnauthorizedError extends ErrorBase {
  constructor({
    title = 'Acesso Negado!!',
    msg = 'Usuário não autenticado.',
  } = {}) {
    super({ title, msg, status: 401 });
  }
}

export default UnauthorizedError;
