import user from './userRoutes.js';
import client from './clientRoutes.js';
import officer from './officerRoutes.js';
import address from './addressRoutes.js';
import request from './requestRoutes.js';
import environment from './environmentRoutes.js';
import services from './serviceRoutes.js';
import budget from './budgetRoutes.js';
import order from './orderRoutes.js';
import history from './historyRoutes.js';
import manipulator404 from '../middlewares/manipulator404.js';

const routes = (app) => {
  app.route('/api').get((req, res) => {
    res.status(200).send({ message: 'API Service On!' });
  });
  app.use('/api/users', user);
  app.use('/api/clients', client);
  app.use('/api/officers', officer);
  app.use('/api/addresses', address);
  app.use('/api/requests', request);
  app.use('/api/environments', environment);
  app.use('/api/services', services);
  app.use('/api/budgets', budget);
  app.use('/api/orders', order);
  app.use('/api/historys', history);
  app.use(manipulator404);
};

export default routes;
