import NotFound from '../erros/NotFound.js';

function manipulator404(req, res, next) {
  const error404 = new NotFound(
    `Rota ${req.method} ${req.originalUrl} não encontrada.`
  );
  next(error404);
}

export default manipulator404;
