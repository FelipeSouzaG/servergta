import ErrorBase from './ErrorBase.js';

class ForbiddenError extends ErrorBase {
  constructor({
    title = 'Acesso Negado!',
    msg = 'Usuário sem permissões de acesso.',
  } = {}) {
    super({ title, msg, status: 403 });
  }
}

export default ForbiddenError;
