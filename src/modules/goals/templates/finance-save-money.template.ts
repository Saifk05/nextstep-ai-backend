import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export const SAVE_MONEY_TEMPLATE = {
  key: GoalTemplateKey.SAVE_MONEY,
  slug: 'save-money',
  category: GoalCategory.FINANCE,
  goalType: GoalType.FINANCE,

  title: 'Save Money',
  description:
    'A structured savings plan covering expense tracking, spending limits, regular saving, budget reviews, and progress milestones.',

  version: 1,
  isActive: true,

  setupQuestions: [
    {
      key: 'targetAmount',
      label: 'How much money do you want to save?',
      type: 'number',
      required: true,
      placeholder: 'Example: 100000',
    },
    {
      key: 'currentSavings',
      label: 'How much have you already saved?',
      type: 'number',
      required: true,
      placeholder: 'Example: 10000',
    },
    {
      key: 'monthlyIncome',
      label: 'What is your approximate monthly income?',
      type: 'number',
      required: false,
      placeholder: 'Example: 40000',
    },
    {
      key: 'monthlySavingTarget',
      label: 'How much do you want to save monthly?',
      type: 'number',
      required: true,
      placeholder: 'Example: 10000',
    },
    {
      key: 'savingPurpose',
      label: 'What are you saving for?',
      type: 'select',
      required: true,
      options: [
        'EMERGENCY_FUND',
        'EDUCATION',
        'TRAVEL',
        'VEHICLE',
        'HOME',
        'BUSINESS',
        'OTHER',
      ],
    },
    {
      key: 'expenseTrackingStatus',
      label: 'Do you currently track your expenses?',
      type: 'select',
      required: true,
      options: ['NOT_STARTED', 'SOMETIMES', 'REGULARLY'],
    },
  ],

  defaultMetrics: {
    amountSaved: 0,
    targetAmount: 0,
    expensesTracked: 0,
    noSpendDays: 0,
    weeklyReviewsCompleted: 0,
    monthlyReviewsCompleted: 0,
  },

  actionTemplates: [
    {
      key: 'TRACK_DAILY_EXPENSES',
      title: 'Track daily expenses',
      description:
        'Record every expense and assign it to the correct spending category.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'All expenses for the day are recorded.',
      actionType: 'EXPENSE_TRACKING',
    },
    {
      key: 'REVIEW_DAILY_SPENDING',
      title: 'Review daily spending',
      description:
        'Check whether today’s expenses were necessary and within the planned limit.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria:
        'Daily spending is reviewed and unnecessary costs are identified.',
      actionType: 'SPENDING_REVIEW',
    },
    {
      key: 'TRANSFER_TO_SAVINGS',
      title: 'Transfer money to savings',
      description:
        'Move the planned savings amount into a separate savings account or fund.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The planned savings amount is transferred.',
      actionType: 'SAVING',
      metadata: {
        setupAnswerKey: 'monthlySavingTarget',
      },
    },
    {
      key: 'COMPLETE_NO_SPEND_DAY',
      title: 'Complete a no-spend day',
      description:
        'Avoid non-essential spending for one full day and use only planned necessities.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'One no-spend day is completed.',
      actionType: 'NO_SPEND',
    },
    {
      key: 'WEEKLY_BUDGET_REVIEW',
      title: 'Review weekly budget',
      description:
        'Review spending categories, savings progress, and areas where expenses can be reduced.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The weekly budget review is completed.',
      actionType: 'REVIEW',
    },
  ],

  milestoneTemplates: [
    {
      key: 'EXPENSE_TRACKING_STARTED',
      title: 'Expense tracking started',
      description: 'Daily income and expense tracking has been established.',
      weight: 15,
    },
    {
      key: 'FIRST_SAVINGS_TRANSFER',
      title: 'First savings transfer completed',
      description: 'The first planned amount has been transferred to savings.',
      weight: 15,
    },
    {
      key: 'TWENTY_FIVE_PERCENT_SAVED',
      title: '25% of savings target reached',
      description: 'One quarter of the selected savings target is completed.',
      weight: 20,
    },
    {
      key: 'HALFWAY_SAVINGS_TARGET',
      title: '50% of savings target reached',
      description: 'Half of the selected savings target is completed.',
      weight: 20,
    },
    {
      key: 'SAVINGS_TARGET_COMPLETED',
      title: 'Savings target completed',
      description: 'The full selected savings amount has been achieved.',
      weight: 30,
    },
  ],
};
