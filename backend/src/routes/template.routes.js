import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import requireAdmin from '../middlewares/requireAdmin.js';
import {
  getPlaceholders,
  getAllTemplates,
  getTemplateById,
  getTemplateByType,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/template.controller.js';

const templateRouter = express.Router();

templateRouter.use(verifyAuth, requireAdmin);

templateRouter.get('/placeholders', getPlaceholders);

templateRouter.get('/', getAllTemplates);
templateRouter.post('/', createTemplate);
templateRouter.get('/type/:certificateType', getTemplateByType);
templateRouter.get('/:id', getTemplateById);
templateRouter.patch('/:id', updateTemplate);
templateRouter.delete('/:id', deleteTemplate);

export default templateRouter;
