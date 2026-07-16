import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export const PERSONAL_DEVELOPMENT_TEMPLATE = {
  key: GoalTemplateKey.PERSONAL_DEVELOPMENT,
  slug: 'personal-development',
  category: GoalCategory.CUSTOM,
  goalType: GoalType.PERSONAL,

  title: 'Personal Development',
  description:
    'A structured personal-growth plan covering habits, focus, learning, reflection, consistency, and weekly self-improvement reviews.',

  version: 1,
  isActive: true,

  setupQuestions: [
    {
      key: 'developmentArea',
      label: 'Which area do you want to improve?',
      type: 'select',
      required: true,
      options: [
        'DISCIPLINE',
        'CONFIDENCE',
        'COMMUNICATION',
        'PRODUCTIVITY',
        'TIME_MANAGEMENT',
        'READING',
        'OTHER',
      ],
    },
    {
      key: 'goalDescription',
      label: 'What exactly do you want to achieve?',
      type: 'textarea',
      required: true,
      placeholder: 'Describe the personal improvement you want to make.',
    },
    {
      key: 'dailyMinutes',
      label: 'How many minutes can you dedicate daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 30',
    },
    {
      key: 'currentConsistency',
      label: 'How consistent are you currently?',
      type: 'select',
      required: true,
      options: ['NOT_CONSISTENT', 'SOMETIMES', 'MOST_DAYS', 'VERY_CONSISTENT'],
    },
    {
      key: 'habitToBuild',
      label: 'What primary habit do you want to build?',
      type: 'text',
      required: true,
      placeholder: 'Example: Read for 30 minutes every day',
    },
  ],

  defaultMetrics: {
    habitDaysCompleted: 0,
    focusSessionsCompleted: 0,
    reflectionEntriesCompleted: 0,
    learningSessionsCompleted: 0,
    weeklyReviewsCompleted: 0,
    currentStreak: 0,
  },

  actionTemplates: [
    {
      key: 'COMPLETE_DAILY_HABIT',
      title: 'Complete daily habit',
      description:
        'Complete the selected personal-development habit for the planned duration.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The selected daily habit is completed.',
      actionType: 'HABIT',
      metadata: {
        defaultMinutes: 30,
        setupAnswerKey: 'dailyMinutes',
      },
    },
    {
      key: 'COMPLETE_FOCUS_SESSION',
      title: 'Complete one focused session',
      description:
        'Work without unnecessary distractions on the most important personal priority.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'One uninterrupted focus session is completed.',
      actionType: 'FOCUS',
    },
    {
      key: 'DAILY_SELF_REFLECTION',
      title: 'Complete daily self-reflection',
      description:
        'Write what went well, what was difficult, and what should improve tomorrow.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'A short daily reflection is recorded.',
      actionType: 'REFLECTION',
    },
    {
      key: 'LEARN_PERSONAL_GROWTH_CONCEPT',
      title: 'Learn one personal-growth concept',
      description:
        'Read, watch, or practise one concept connected to the selected development area.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'One personal-growth learning session is completed.',
      actionType: 'LEARNING',
    },
    {
      key: 'WEEKLY_PERSONAL_REVIEW',
      title: 'Review weekly personal progress',
      description:
        'Review consistency, habits, difficulties, achievements, and priorities for the next week.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The weekly personal-development review is completed.',
      actionType: 'REVIEW',
    },
  ],

  milestoneTemplates: [
    {
      key: 'FIRST_WEEK_CONSISTENT',
      title: 'First consistent week completed',
      description: 'The selected habit is completed consistently for one week.',
      weight: 15,
    },
    {
      key: 'SEVEN_DAY_STREAK',
      title: 'Seven-day streak achieved',
      description:
        'The personal-development routine is maintained for seven consecutive days.',
      weight: 15,
    },
    {
      key: 'THIRTY_SESSIONS_COMPLETED',
      title: 'Thirty sessions completed',
      description:
        'Thirty personal-development or focused practice sessions are completed.',
      weight: 20,
    },
    {
      key: 'THIRTY_DAY_STREAK',
      title: 'Thirty-day streak achieved',
      description:
        'The selected routine is maintained for thirty consecutive days.',
      weight: 25,
    },
    {
      key: 'PERSONAL_GOAL_COMPLETED',
      title: 'Personal-development goal completed',
      description:
        'The selected personal-development outcome has been achieved.',
      weight: 25,
    },
  ],
};
