import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { GoalCategory, GoalTemplateKey } from '../enums/goals.enum';
import {
  GOAL_TEMPLATE_MAP,
  GOAL_TEMPLATES,
} from '../templates';

@Injectable()
export class GoalTemplateService {
  getTemplates() {
    return GOAL_TEMPLATES.map((template) => ({
      key: template.key,
      slug: template.slug,
      category: template.category,
      goalType: template.goalType,
      title: template.title,
      description: template.description,
      version: template.version,
      setupQuestions: template.setupQuestions,
    }));
  }

  getTemplatesByCategory(category: GoalCategory) {
    return GOAL_TEMPLATES.filter(
      (template) => template.category === category,
    ).map((template) => ({
      key: template.key,
      slug: template.slug,
      category: template.category,
      goalType: template.goalType,
      title: template.title,
      description: template.description,
      version: template.version,
      setupQuestions: template.setupQuestions,
    }));
  }

  getTemplate(templateKey: GoalTemplateKey) {
    const template = GOAL_TEMPLATE_MAP[templateKey];

    if (!template) {
      throw new NotFoundException(
        `Goal template "${templateKey}" not found`,
      );
    }

    return template;
  }

  getTemplateBySlug(slug: string) {
    const template = GOAL_TEMPLATES.find(
      (template) => template.slug === slug,
    );

    if (!template) {
      throw new NotFoundException(
        `Goal template "${slug}" not found`,
      );
    }

    return template;
  }

  validateSetupAnswers(
    templateKey: GoalTemplateKey,
    answers: Record<string, any> = {},
  ) {
    const template = this.getTemplate(templateKey);

    const missingFields: string[] = [];

    for (const question of template.setupQuestions) {
      if (
        question.required &&
        (answers[question.key] === undefined ||
          answers[question.key] === null ||
          answers[question.key] === '')
      ) {
        missingFields.push(question.key);
      }
    }

    if (missingFields.length) {
      throw new BadRequestException(
        `Missing required setup fields: ${missingFields.join(', ')}`,
      );
    }

    return true;
  }

  buildDefaultPlan(
    templateKey: GoalTemplateKey,
    setupAnswers: Record<string, any> = {},
  ) {
    const template = this.getTemplate(templateKey);

    const actions = template.actionTemplates
      .filter((action) => this.shouldIncludeAction(action.key, setupAnswers))
      .map((action) => {
        const metadata = this.resolveActionMetadata(
          action.metadata || {},
          setupAnswers,
        );

        return {
          key: action.key,
          title: action.title,
          description: action.description,
          frequency: action.frequency,
          priority: action.priority,
          successCriteria: action.successCriteria,
          actionType: action.actionType,
          metadata,
          completed: false,
        };
      });

    return {
      strategySummary: template.description,

      actions,

      milestones: template.milestoneTemplates.map((milestone) => ({
        key: milestone.key,
        title: milestone.title,
        description: milestone.description,
        weight: milestone.weight,
        completed: false,
      })),

      metrics: template.defaultMetrics,
    };
  }

  private resolveActionMetadata(
    metadata: Record<string, any>,
    setupAnswers: Record<string, any>,
  ): Record<string, any> {
    const resolvedMetadata = { ...metadata };

    const setupAnswerKey = metadata.setupAnswerKey;

    if (!setupAnswerKey) {
      return resolvedMetadata;
    }

    const setupValue = setupAnswers[setupAnswerKey];

    if (setupValue === undefined || setupValue === null || setupValue === '') {
      delete resolvedMetadata.setupAnswerKey;
      return resolvedMetadata;
    }

    if (metadata.defaultDailyTarget !== undefined) {
      resolvedMetadata.defaultDailyTarget = this.toPositiveNumber(
        setupValue,
        metadata.defaultDailyTarget,
      );
    }

    if (metadata.defaultMinutes !== undefined) {
      resolvedMetadata.defaultMinutes = this.toPositiveNumber(
        setupValue,
        metadata.defaultMinutes,
      );
    }

    delete resolvedMetadata.setupAnswerKey;

    return resolvedMetadata;
  }

  private shouldIncludeAction(
    actionKey: string,
    setupAnswers: Record<string, any>,
  ): boolean {
    if (
      actionKey === 'OPTIMIZE_RESUME' &&
      setupAnswers.currentResumeStatus === 'READY'
    ) {
      return false;
    }

    if (
      actionKey === 'OPTIMIZE_LINKEDIN' &&
      setupAnswers.linkedinProfileStatus === 'OPTIMIZED'
    ) {
      return false;
    }

    return true;
  }

  private toPositiveNumber(value: any, fallback: number): number {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return fallback;
    }

    return Math.round(numberValue);
  }
}