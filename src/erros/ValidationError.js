import RequestError from './RequestError.js';

class ValidationError extends RequestError {
  constructor(error) {
    let msgError = 'Erro de validação desconhecido.';
    if (error.errors && typeof error.errors === 'object') {
      msgError = Object.values(error.errors)
        .map((err) => err.message)
        .join('; ');
    }
    super({
      title: 'Erro de Validação!',
      msg: msgError,
      status: 400,
    });
  }
}

export default ValidationError;
