import ErrorBase from './ErrorBase.js';

class RequestError extends ErrorBase {
  constructor({
    title = 'Requisição Inválida!',
    msg = 'Um ou mais dados estão incorretos.',
  } = {}) {
    super({ title, msg, status: 400 });
  }
}

export default RequestError;
