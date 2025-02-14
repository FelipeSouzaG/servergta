import mongoose from 'mongoose';
import 'dotenv/config';
import { User, Client } from '../models/Model.js';
import {
  RequestError,
  NotFound,
  ConflictError,
  ErrorBase,
} from '../erros/Errors.js';

class UserController {
  static registerUser = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { phone, name, email, password } = req.body;

      let dataUser = { email, password };
      let newUser;

      if (phone) {
        const existingClient = await Client.findOne({ phone }).session(session);
        if (existingClient) {
          dataUser.name = existingClient.name;
          dataUser.level = 'Cliente';
          dataUser.clientId = existingClient._id;

          newUser = new User(dataUser);
          await newUser.save({ session });

          const updates = {
            userId: newUser._id,
            email: newUser.email,
            _updatedBy: newUser._id,
          };

          await Client.findByIdAndUpdate(existingClient._id, updates, {
            new: true,
            runValidators: true,
            session,
          });

          await session.commitTransaction();
          session.endSession();
        } else {
          return next(
            new RequestError({
              title: 'Telefone não encontrado!',
              msg: 'O telefone informado não corresponde a nenhum cliente registrado. Verifique com a empresa.',
            })
          );
        }
      } else {
        dataUser.name = name;
        dataUser.level = 'Usuário';
        newUser = new User(dataUser);
        await newUser.save({ session });
      }

      await session.commitTransaction();

      res.status(201).json({
        title: 'Usuário registrado!',
        msg: 'Faça login com suas credenciais de acesso.',
        status: 201,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000) {
        return next(
          new ConflictError({
            title: 'E-mail já cadastrado!',
            msg: 'Este e-mail já está sendo utilizado por outro usuário.',
          })
        );
      }
      next(error);
    } finally {
      session.endSession();
    }
  };

  static loginUser = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { token, name, level } = await User.login(email, password);

      const office = process.env.OFFICE_URL;
      const client = {
        title: 'Sessão Iniciada!',
        msg: `Olá ${name}`,
        level: level,
        status: 201,
      };

      const levelMap = {
        Gestor: { redirect: office },
        Secretário: { redirect: office },
        Técnico: { redirect: office },
        Cliente: { json: client },
        Usuário: { json: client },
      };

      const actionLevel = levelMap[level];
      if (!actionLevel) {
        return next(
          new RequestError({
            title: 'Nível Desconhecido!',
            msg: `Nível de usuário desconhecido: ${level}`,
          })
        );
      }

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 5 * 60 * 1000,
      });

      if (actionLevel.redirect) {
        return res.status(200).json({ redirectUrl: actionLevel.redirect });
      }

      if (actionLevel.json) {
        return res.status(201).json(actionLevel.json);
      }
    } catch (error) {
      next(error);
    }
  };

  static logoffUser = (req, res, next) => {
    try {
      res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      });

      res.status(201).json({
        redirectUrl: process.env.CLIENT_URL,
        status: 201,
      });
    } catch (error) {
      next(error);
    }
  };

  static getUserData = async (req, res, next) => {
    try {
      const { userId } = req.userData;

      const user = await User.findById(userId);
      if (!user) {
        return next(
          new NotFound({
            title: 'Não Encontrado!',
            msg: 'Dados de Usuário não encontrados.',
          })
        );
      }

      const officeData = {
        userId: user._id,
        name: user.name,
        email: user.email,
        level: user.level,
        title: 'Sessão Iniciada!',
        msg: `Olá ${user.name}`,
        status: 200,
      };

      const clientData = {
        userId: user._id,
        name: user.name,
        email: user.email,
        level: user.level,
        status: 200,
      };

      const levelMap = {
        Gestor: officeData,
        Secretário: officeData,
        Técnico: officeData,
        Cliente: clientData,
        Usuário: clientData,
      };

      const responseData = levelMap[user.level];
      if (!responseData) {
        return next(
          new RequestError({
            title: 'Nível Desconhecido.',
            msg: `Nível de usuário desconhecido: ${user.level}`,
          })
        );
      }

      return res.status(200).json(responseData);
    } catch (error) {
      next(error);
    }
  };

  static updateUser = async (req, res, next) => {
    try {
      const { userId } = req.userData;
      const { password, currentPassword, name, email } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return next(
          new NotFound({
            title: 'Usuário não encontrado!',
            msg: 'Os dados do usuário não foram encontrados no sistema.',
          })
        );
      }

      const isPasswordValid = await user.isCurrentPasswordValid(
        currentPassword
      );
      if (!isPasswordValid) {
        return next(
          new RequestError({
            title: 'Senha Inválida!',
            msg: 'A senha atual fornecida está incorreta.',
          })
        );
      }

      if (name) user.name = name;
      if (email) user.email = email;
      if (password) user.password = password;

      user._updatedBy = userId;

      await user.save();
      return res.status(200).json({
        title: 'Dados Atualizados!',
        msg: 'Dados do usuário atualizados com sucesso.',
        status: 200,
        level: user.level,
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(
          new ConflictError({
            title: 'Conflito de Dados!',
            msg: 'O e-mail fornecido já está em uso por outro usuário.',
          })
        );
      }
      next(error);
    }
  };

  static getAllUsers = async (req, res, next) => {
    try {
      const { level } = req.userData;
      const userList = await User.find();
      if (userList.length === 0) {
        return next(
          new RequestError({
            title: 'Não há Usuários!',
            msg: 'Nenhum Usuário cadastrado.',
          })
        );
      }
      return res.status(200).json({
        userList,
        status: 200,
        level: level,
      });
    } catch (error) {
      next(error);
    }
  };

  static deleteUser = async (req, res, next) => {
    try {
      const { userId } = req.userData;
      await User.findByIdAndDelete(userId);
      res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      });
      return res.status(200).json({
        title: 'Usuário excluído',
        msg: `Dados da conta removidos com sucesso. Volte quando quizer!`,
        status: 200,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default UserController;
