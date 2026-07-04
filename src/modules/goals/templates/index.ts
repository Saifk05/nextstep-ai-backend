import { GoalTemplateKey } from '../enums/goals.enum';
import { JOB_SEARCH_TEMPLATE } from './career-get-job.template';

export const GOAL_TEMPLATES = [JOB_SEARCH_TEMPLATE];

export const GOAL_TEMPLATE_MAP = {
  [GoalTemplateKey.JOB_SEARCH]: JOB_SEARCH_TEMPLATE,
};