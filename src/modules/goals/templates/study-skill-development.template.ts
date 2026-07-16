import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export const SKILL_DEVELOPMENT_TEMPLATE = {
  key: GoalTemplateKey.SKILL_DEVELOPMENT,
  slug: 'skill-development',
  category: GoalCategory.STUDY,
  goalType: GoalType.LEARNING,

  title: 'Learn a New Skill',
  description:
    'A structured learning plan covering fundamentals, daily practice, project development, revision, and independent coding.',

  version: 1,
  isActive: true,

  setupQuestions: [
    {
      key: 'skillName',
      label: 'What skill do you want to learn?',
      type: 'text',
      required: true,
      placeholder: 'Example: Java and Spring Boot',
    },
    {
      key: 'currentLevel',
      label: 'What is your current skill level?',
      type: 'select',
      required: true,
      options: ['COMPLETE_BEGINNER', 'BASIC', 'INTERMEDIATE'],
    },
    {
      key: 'dailyStudyMinutes',
      label: 'How many minutes do you want to study daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 60',
    },
    {
      key: 'dailyPracticeMinutes',
      label: 'How many minutes do you want to practise daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 60',
    },
    {
      key: 'learningPurpose',
      label: 'Why do you want to learn this skill?',
      type: 'select',
      required: true,
      options: [
        'BUILD_WITHOUT_AI',
        'INTERVIEW_PREPARATION',
        'CAREER_GROWTH',
        'BUILD_PROJECT',
      ],
    },
    {
      key: 'targetProject',
      label: 'Which project do you want to build?',
      type: 'text',
      required: false,
      placeholder: 'Example: Todo application',
    },
  ],

  defaultMetrics: {
    studyMinutes: 0,
    practiceMinutes: 0,
    conceptsCompleted: 0,
    codingSessionsCompleted: 0,
    projectFeaturesCompleted: 0,
    daysCompletedWithoutAI: 0,
  },

  actionTemplates: [
    {
      key: 'LEARN_CORE_CONCEPT',
      title: 'Learn one core concept',
      description:
        'Study one topic and write short notes using your own words.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'One core concept is studied and documented.',
      actionType: 'LEARNING',
      metadata: {
        defaultMinutes: 60,
        setupAnswerKey: 'dailyStudyMinutes',
      },
    },
    {
      key: 'PRACTICE_CODING',
      title: 'Practice coding without AI',
      description:
        'Write code independently and use official documentation only when required.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The daily independent coding session is completed.',
      actionType: 'PRACTICE',
      metadata: {
        defaultMinutes: 60,
        setupAnswerKey: 'dailyPracticeMinutes',
      },
    },
    {
      key: 'BUILD_PROJECT_FEATURE',
      title: 'Build one project feature',
      description:
        'Implement one small feature in the selected project without copying generated code.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'One project feature or meaningful coding step is completed.',
      actionType: 'PROJECT',
      metadata: {
        defaultDailyTarget: 1,
        setupAnswerKey: 'targetProject',
      },
    },
    {
      key: 'REVISE_WEEKLY_TOPICS',
      title: 'Revise this week’s topics',
      description:
        'Review concepts, notes, coding mistakes, and completed exercises.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'The weekly revision session is completed.',
      actionType: 'REVISION',
    },
    {
      key: 'REBUILD_WITHOUT_REFERENCE',
      title: 'Rebuild without reference',
      description:
        'Recreate one previously completed feature from an empty file without checking the old implementation.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.HIGH,
      successCriteria:
        'One feature is rebuilt independently without copying previous code.',
      actionType: 'ASSESSMENT',
    },
    {
      key: 'WEEKLY_LEARNING_REVIEW',
      title: 'Review weekly learning progress',
      description:
        'Review completed topics, practice time, project progress, difficulties, and next week’s plan.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'The weekly learning progress review is completed.',
      actionType: 'REVIEW',
    },
  ],

  milestoneTemplates: [
    {
      key: 'FUNDAMENTALS_COMPLETED',
      title: 'Programming fundamentals completed',
      description:
        'The essential language fundamentals and basic programming concepts are completed.',
      weight: 20,
    },
    {
      key: 'FIRST_PROGRAM_BUILT',
      title: 'First program built independently',
      description:
        'The user builds the first working program without generated code.',
      weight: 15,
    },
    {
      key: 'TODO_CRUD_COMPLETED',
      title: 'Todo CRUD completed',
      description:
        'Create, read, update, delete, and complete Todo operations are working.',
      weight: 25,
    },
    {
      key: 'DATABASE_CONNECTED',
      title: 'Database connected',
      description:
        'The project stores and retrieves data using a database.',
      weight: 20,
    },
    {
      key: 'PROJECT_COMPLETED',
      title: 'Project completed independently',
      description:
        'The complete project is built and tested with minimal external assistance.',
      weight: 20,
    },
  ],
};