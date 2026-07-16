import { GoalTemplateKey } from '../enums/goals.enum';

import { JOB_SEARCH_TEMPLATE } from './career-get-job.template';
import { SKILL_DEVELOPMENT_TEMPLATE } from './study-skill-development.template';
import { WEIGHT_LOSS_TEMPLATE } from './fitness-weight-loss.template';
import { SAVE_MONEY_TEMPLATE } from './finance-save-money.template';
import { START_BUSINESS_TEMPLATE } from './business-start-business.template';
import { PERSONAL_DEVELOPMENT_TEMPLATE } from './personal-development.template';

export const GOAL_TEMPLATES = [
  JOB_SEARCH_TEMPLATE,
  SKILL_DEVELOPMENT_TEMPLATE,
  WEIGHT_LOSS_TEMPLATE,
  SAVE_MONEY_TEMPLATE,
  START_BUSINESS_TEMPLATE,
  PERSONAL_DEVELOPMENT_TEMPLATE,
];

export const GOAL_TEMPLATE_MAP = {
  [GoalTemplateKey.JOB_SEARCH]: JOB_SEARCH_TEMPLATE,
  [GoalTemplateKey.SKILL_DEVELOPMENT]: SKILL_DEVELOPMENT_TEMPLATE,
  [GoalTemplateKey.WEIGHT_LOSS]: WEIGHT_LOSS_TEMPLATE,
  [GoalTemplateKey.SAVE_MONEY]: SAVE_MONEY_TEMPLATE,
  [GoalTemplateKey.START_BUSINESS]: START_BUSINESS_TEMPLATE,
  [GoalTemplateKey.PERSONAL_DEVELOPMENT]: PERSONAL_DEVELOPMENT_TEMPLATE,
};