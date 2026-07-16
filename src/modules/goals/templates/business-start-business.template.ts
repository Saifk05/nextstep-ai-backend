import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export const START_BUSINESS_TEMPLATE = {
  key: GoalTemplateKey.START_BUSINESS,
  slug: 'start-business',
  category: GoalCategory.BUSINESS,
  goalType: GoalType.BUSINESS,

  title: 'Start a Business',
  description:
    'A structured business-building plan covering idea validation, customer research, MVP development, marketing, sales, and launch preparation.',

  version: 1,
  isActive: true,

  setupQuestions: [
    {
      key: 'businessIdea',
      label: 'What business do you want to start?',
      type: 'textarea',
      required: true,
      placeholder: 'Describe your product, service, or business idea.',
    },
    {
      key: 'businessType',
      label: 'What type of business is it?',
      type: 'select',
      required: true,
      options: [
        'SAAS',
        'SERVICE',
        'ECOMMERCE',
        'LOCAL_BUSINESS',
        'CONTENT_BUSINESS',
        'OTHER',
      ],
    },
    {
      key: 'targetCustomer',
      label: 'Who is your target customer?',
      type: 'textarea',
      required: true,
      placeholder: 'Example: Small recruitment agencies in India',
    },
    {
      key: 'currentStage',
      label: 'What stage is your business currently in?',
      type: 'select',
      required: true,
      options: [
        'IDEA_ONLY',
        'RESEARCHING',
        'BUILDING_MVP',
        'MVP_READY',
        'HAS_CUSTOMERS',
      ],
    },
    {
      key: 'dailyBusinessMinutes',
      label: 'How many minutes can you work on it daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 120',
    },
    {
      key: 'initialRevenueTarget',
      label: 'What is your initial monthly revenue target?',
      type: 'number',
      required: false,
      placeholder: 'Example: 50000',
    },
  ],

  defaultMetrics: {
    customerInterviewsCompleted: 0,
    leadsContacted: 0,
    productFeaturesCompleted: 0,
    marketingExperimentsCompleted: 0,
    customersAcquired: 0,
    revenueGenerated: 0,
    weeklyReviewsCompleted: 0,
  },

  actionTemplates: [
    {
      key: 'VALIDATE_BUSINESS_IDEA',
      title: 'Validate the business idea',
      description:
        'Research the problem, existing solutions, customer demand, and willingness to pay.',
      frequency: GoalActionFrequency.ONCE,
      priority: GoalActionPriority.HIGH,
      successCriteria:
        'The problem, target customer, and value proposition are documented.',
      actionType: 'VALIDATION',
    },
    {
      key: 'TALK_TO_TARGET_CUSTOMERS',
      title: 'Talk to target customers',
      description:
        'Contact potential customers and ask about their current problems, workflows, and expectations.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The weekly customer interview target is completed.',
      actionType: 'CUSTOMER_RESEARCH',
      metadata: {
        defaultWeeklyTarget: 5,
      },
    },
    {
      key: 'BUILD_MVP_FEATURE',
      title: 'Build one MVP feature',
      description:
        'Complete one small feature or important step toward the minimum viable product.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'One meaningful MVP development step is completed.',
      actionType: 'PRODUCT',
      metadata: {
        defaultMinutes: 120,
        setupAnswerKey: 'dailyBusinessMinutes',
      },
    },
    {
      key: 'CONTACT_POTENTIAL_CUSTOMERS',
      title: 'Contact potential customers',
      description:
        'Send personalized outreach messages to potential users, buyers, or business partners.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The daily customer outreach target is completed.',
      actionType: 'OUTREACH',
      metadata: {
        defaultDailyTarget: 5,
      },
    },
    {
      key: 'RUN_MARKETING_EXPERIMENT',
      title: 'Run one marketing experiment',
      description:
        'Test one acquisition channel, message, offer, landing page, or content idea.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'One measurable marketing experiment is completed.',
      actionType: 'MARKETING',
    },
    {
      key: 'WEEKLY_BUSINESS_REVIEW',
      title: 'Review weekly business progress',
      description:
        'Review customer feedback, product progress, leads, conversions, revenue, and next priorities.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The weekly business review is completed.',
      actionType: 'REVIEW',
    },
  ],

  milestoneTemplates: [
    {
      key: 'IDEA_VALIDATED',
      title: 'Business idea validated',
      description:
        'The problem and customer demand have been validated through research.',
      weight: 20,
    },
    {
      key: 'FIRST_CUSTOMER_INTERVIEWS',
      title: 'First customer interviews completed',
      description:
        'Initial target customers have been interviewed and feedback recorded.',
      weight: 15,
    },
    {
      key: 'MVP_COMPLETED',
      title: 'MVP completed',
      description:
        'The first usable version of the product or service is ready.',
      weight: 25,
    },
    {
      key: 'FIRST_CUSTOMER_ACQUIRED',
      title: 'First customer acquired',
      description: 'The business receives its first customer or paying user.',
      weight: 20,
    },
    {
      key: 'FIRST_REVENUE_GENERATED',
      title: 'First revenue generated',
      description: 'The business generates its first recorded revenue.',
      weight: 20,
    },
  ],
};
