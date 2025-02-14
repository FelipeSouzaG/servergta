import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../erros/Errors.js';

class Auth {
  static authenticate = async (req, res, next) => {
    try {
      const token = req.cookies.token;
      if (!token) {
        throw new UnauthorizedError({
          title: 'Falha de Autenticação!',
          msg: 'Por favor, faça Login novamente.',
        });
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const newToken = jwt.sign(
        { userId: decoded.userId, level: decoded.level },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '5m' }
      );

      res.cookie('token', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 5 * 60 * 1000,
      });

      req.userData = decoded;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        next(
          new UnauthorizedError({
            title: 'Autenticação Inválida!',
            msg: error.message,
          })
        );
      } else if (error.name === 'TokenExpiredError') {
        next(
          new UnauthorizedError({
            title: 'Token Expirado!',
            msg: error.message,
          })
        );
      } else {
        next(error);
      }
    }
  };

  static authorize = (allowedLevels) => {
    return (req, res, next) => {
      const { level } = req.userData;

      if (!allowedLevels.includes(level)) {
        next(
          new ForbiddenError({
            title: 'Acesso Negado!',
            msg: `Somente para níveis permitidos: ${allowedLevels.join(', ')}`,
          })
        );
      }
      next();
    };
  };

  static authorizeClient = Auth.authorize(['Cliente']);
  static authorizeGestor = Auth.authorize(['Gestor']);
  static authorizeSecretario = Auth.authorize(['Gestor', 'Secretário']);
  static authorizeTecnico = Auth.authorize(['Gestor', 'Secretário', 'Técnico']);
}

export default Auth;
