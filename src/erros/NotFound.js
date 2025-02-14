import ErrorBase from './ErrorBase.js';

class NotFound extends ErrorBase {
  constructor({
    title = 'Não Encontrado!',
    msg = 'Requisição inexistente no Servidor.',
  } = {}) {
    super({ title, msg, status: 404 });
  }
}

export default NotFound;
