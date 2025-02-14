class ErrorBase extends Error {
  constructor({
    title = 'Erro no Servidor!',
    msg = 'Erro desconhecido no servidor.',
    status = 500,
  } = {}) {
    super();
    this.title = title;
    this.message = msg;
    this.status = status;
  }

  sendReply(res) {
    res.status(this.status).send({
      title: this.title,
      msg: this.message,
      status: this.status,
    });
  }
}

export default ErrorBase;
