import { check, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { RequestError, ValidationError } from '../erros/Errors.js';
import { normalizeRegister } from './normalize.js';

export const limiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 5,
  handler: (req, res, next) => {
    next(
      new RequestError({
        title: 'Muitas Requisições',
        msg: 'Você atingiu o limite de tentativas. Tente novamente em 2 minutos.',
      })
    );
  },
});

const isValidCPF = (cpf) => {
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const numbers = cpf.split('').map(Number);
  const sum1 = numbers
    .slice(0, 9)
    .reduce((acc, num, i) => acc + num * (10 - i), 0);
  const sum2 = numbers
    .slice(0, 10)
    .reduce((acc, num, i) => acc + num * (11 - i), 0);

  const firstCheck = ((sum1 * 10) % 11) % 10;
  const secondCheck = ((sum2 * 10) % 11) % 10;

  return firstCheck === numbers[9] && secondCheck === numbers[10];
};

const isValidCNPJ = (cnpj) => {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const numbers = cnpj.split('').map(Number);
  const sum1 = numbers
    .slice(0, 12)
    .reduce(
      (acc, num, i) => acc + num * [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2][i],
      0
    );
  const sum2 = numbers
    .slice(0, 13)
    .reduce(
      (acc, num, i) => acc + num * [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2][i],
      0
    );

  const firstCheck = ((sum1 * 10) % 11) % 10;
  const secondCheck = ((sum2 * 10) % 11) % 10;

  return firstCheck === numbers[12] && secondCheck === numbers[13];
};

export class GenericValidator {
  static validate(fields) {
    const rules = [];

    fields.forEach((field) => {
      switch (field) {
        case 'email':
          rules.push(
            check('email').optional().isEmail().withMessage('E-mail inválido.')
          );
          break;

        case 'password':
          rules.push(
            check('password')
              .optional()
              .isStrongPassword({
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1,
              })
              .withMessage(
                'A senha deve conter pelo menos 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo.'
              )
          );
          break;

        case 'name':
          rules.push(
            check('name')
              .optional()
              .notEmpty()
              .withMessage('O nome é obrigatório.')
              .isLength({ min: 3 })
              .withMessage('O nome deve ter pelo menos 3 caracteres.')
          );
          break;

        case 'phone':
          rules.push(
            check('phone')
              .optional()
              .matches(/^\d{10,11}$/)
              .withMessage(
                'Número de telefone inválido. Deve conter 10 ou 11 dígitos numéricos (DDD + número).'
              )
          );
          break;

        case 'alternativePhone':
          rules.push(
            check('alternativePhone')
              .optional()
              .matches(/^\d{10,11}$/)
              .withMessage(
                'Número de telefone alternativo inválido. Deve conter 10 ou 11 dígitos numéricos (DDD + número).'
              )
          );
          break;

        case 'postalCode':
          rules.push(
            check('postalCode')
              .optional()
              .matches(/^\d{8}$/)
              .withMessage(
                'CEP inválido. Deve conter exatamente 8 dígitos numéricos.'
              )
          );
          break;

        case 'register':
          rules.push(
            check('register')
              .optional()
              .matches(/^\d{11}$|^\d{14}$/)
              .withMessage(
                'Registro inválido. Deve conter 11 dígitos numéricos para CPF ou 14 para CNPJ.'
              )
              .custom((value) => {
                const normalized = normalizeRegister(value);
                if (normalized.length === 11 && !isValidCPF(normalized)) {
                  throw new Error('CPF inválido.');
                }
                if (normalized.length === 14 && !isValidCNPJ(normalized)) {
                  throw new Error('CNPJ inválido.');
                }
                return true;
              })
          );
          break;

        case 'currentPassword':
          rules.push(
            check('currentPassword')
              .optional()
              .notEmpty()
              .withMessage('A senha atual é obrigatória.')
          );
          break;

        default:
          throw new Error(
            `Validação para o campo '${field}' não foi definida.`
          );
      }
    });

    return [
      ...rules,
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const errorMessage = errors
            .array()
            .map((err) => err.msg)
            .join('; ');

          return next(
            new ValidationError({
              title: 'Erro de Validação!',
              msg: `Erros encontrados: ${errorMessage}`,
            })
          );
        }
        next();
      },
    ];
  }
}

export default GenericValidator;
