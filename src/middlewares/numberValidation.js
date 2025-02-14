import {
  Order,
  Budget,
  Request,
  Officer,
  Client,
  Environment,
} from '../models/Model.js';
import { ErrorBase, RequestError } from '../erros/Errors.js';

class NumberGenerator {
  static async generateSequence(model, prefix, field) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fullPrefix = `${prefix}${year}${month}`;

    const lastEntry = await model
      .findOne({ [field]: { $regex: new RegExp(`^${prefix}`) } })
      .sort({ [field]: -1 });

    let sequence = 1;

    if (lastEntry) {
      const lastSequence = parseInt(lastEntry[field].slice(-5), 10);
      sequence = lastSequence + 1;
    }

    const formattedSequence = String(sequence).padStart(5, '0');
    return `${fullPrefix}${formattedSequence}`;
  }

  static async generateRequestNumber(req, res, next) {
    try {
      const requestNumber = await NumberGenerator.generateSequence(
        Request,
        'REQ-',
        'requestNumber'
      );
      req.body.requestNumber = requestNumber;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async generateEquipmentNumber(req, res, next) {
    try {
      const equipmentNumber = await NumberGenerator.generateSequence(
        Environment,
        'GTA-',
        'equipmentNumber'
      );
      req.body.equipmentNumber = equipmentNumber;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async generateBudgetNumber(req, res, next) {
    try {
      const budgetNumber = await NumberGenerator.generateSequence(
        Budget,
        'OR-',
        'budgetNumber'
      );
      req.body.budgetNumber = budgetNumber;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async generateOrderNumber(req, res, next) {
    try {
      const orderNumber = await NumberGenerator.generateSequence(
        Order,
        'OS-',
        'orderNumber'
      );
      req.body.orderNumber = orderNumber;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async generateClientNumber(req, res, next) {
    try {
      const clientNumber = await NumberGenerator.generateSequence(
        Client,
        'CL-',
        'clientNumber'
      );
      req.body.clientNumber = clientNumber;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async generateOfficerNumber(req, res, next) {
    try {
      const { officerType } = req.body;
      let typeLevel;

      if (officerType === 'Técnico') {
        typeLevel = 'TEC-';
      } else if (officerType === 'Secretário') {
        typeLevel = 'SEC-';
      } else if (officerType === 'Gestor') {
        typeLevel = 'GO-';
      } else {
        throw new RequestError({
          title: 'Nível Inválido!',
          msg: 'Insira um Nível válido (Técnico, Secretário ou Gestor).',
        });
      }
      const officerNumber = await NumberGenerator.generateSequence(
        Officer,
        `${typeLevel}`,
        'officerNumber'
      );
      req.body.officerNumber = officerNumber;
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default NumberGenerator;
