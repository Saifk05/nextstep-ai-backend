import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export const WEIGHT_LOSS_TEMPLATE = {
  key: GoalTemplateKey.WEIGHT_LOSS,
  slug: 'weight-loss',
  category: GoalCategory.FITNESS,
  goalType: GoalType.FITNESS,

  title: 'Lose Weight',
  description:
    'A structured fitness plan covering daily activity, workouts, nutrition tracking, hydration, sleep, and weekly progress reviews.',

  version: 1,
  isActive: true,

  setupQuestions: [
    {
      key: 'currentWeight',
      label: 'What is your current weight in kg?',
      type: 'number',
      required: true,
      placeholder: 'Example: 80',
    },
    {
      key: 'targetWeight',
      label: 'What is your target weight in kg?',
      type: 'number',
      required: true,
      placeholder: 'Example: 70',
    },
    {
      key: 'activityLevel',
      label: 'What is your current activity level?',
      type: 'select',
      required: true,
      options: [
        'SEDENTARY',
        'LIGHTLY_ACTIVE',
        'MODERATELY_ACTIVE',
        'VERY_ACTIVE',
      ],
    },
    {
      key: 'dailyWorkoutMinutes',
      label: 'How many minutes can you exercise daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 30',
    },
    {
      key: 'dailyStepTarget',
      label: 'What is your daily step target?',
      type: 'number',
      required: true,
      placeholder: 'Example: 8000',
    },
    {
      key: 'workoutPreference',
      label: 'What type of workout do you prefer?',
      type: 'select',
      required: true,
      options: ['WALKING', 'HOME_WORKOUT', 'GYM', 'YOGA', 'RUNNING', 'MIXED'],
    },
    {
      key: 'dietPreference',
      label: 'What is your food preference?',
      type: 'select',
      required: false,
      options: ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'NO_PREFERENCE'],
    },
  ],

  defaultMetrics: {
    currentWeight: 0,
    weightLost: 0,
    workoutsCompleted: 0,
    stepsCompleted: 0,
    nutritionDaysTracked: 0,
    waterGoalsCompleted: 0,
    weeklyReviewsCompleted: 0,
  },

  actionTemplates: [
    {
      key: 'COMPLETE_DAILY_WORKOUT',
      title: 'Complete daily workout',
      description:
        'Complete the planned workout according to your fitness level and preferred activity.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The daily workout session is completed.',
      actionType: 'WORKOUT',
      metadata: {
        defaultMinutes: 30,
        setupAnswerKey: 'dailyWorkoutMinutes',
      },
    },
    {
      key: 'COMPLETE_DAILY_STEPS',
      title: 'Complete daily step target',
      description:
        'Walk throughout the day until the selected daily step target is reached.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'The daily step target is completed.',
      actionType: 'STEPS',
      metadata: {
        defaultDailyTarget: 8000,
        setupAnswerKey: 'dailyStepTarget',
      },
    },
    {
      key: 'TRACK_DAILY_NUTRITION',
      title: 'Track daily nutrition',
      description:
        'Record meals and review portion sizes, protein, vegetables, and high-calorie foods.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'All major meals are recorded for the day.',
      actionType: 'NUTRITION',
    },
    {
      key: 'COMPLETE_WATER_TARGET',
      title: 'Complete daily water target',
      description:
        'Drink sufficient water throughout the day and record completion.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'The daily hydration target is completed.',
      actionType: 'HYDRATION',
      metadata: {
        defaultDailyTarget: 8,
        unit: 'GLASSES',
      },
    },
    {
      key: 'TRACK_BODY_WEIGHT',
      title: 'Track body weight',
      description:
        'Record weight under similar conditions to monitor the overall trend.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'The weekly body weight is recorded.',
      actionType: 'WEIGHT_TRACKING',
    },
    {
      key: 'WEEKLY_FITNESS_REVIEW',
      title: 'Review weekly fitness progress',
      description:
        'Review weight changes, workouts, steps, nutrition consistency, sleep, and difficulties.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'The weekly fitness review is completed.',
      actionType: 'REVIEW',
    },
  ],

  milestoneTemplates: [
    {
      key: 'FIRST_WEEK_COMPLETED',
      title: 'First week completed',
      description:
        'The first complete week of workouts and habit tracking is finished.',
      weight: 15,
    },
    {
      key: 'FIRST_WEIGHT_LOSS_RECORDED',
      title: 'First weight loss recorded',
      description:
        'A measurable reduction from the starting weight is recorded.',
      weight: 20,
    },
    {
      key: 'WORKOUT_CONSISTENCY_ESTABLISHED',
      title: 'Workout consistency established',
      description:
        'Workouts are completed consistently over multiple consecutive weeks.',
      weight: 20,
    },
    {
      key: 'HALFWAY_TARGET_REACHED',
      title: 'Halfway target reached',
      description:
        'Half of the planned weight-loss difference has been completed.',
      weight: 20,
    },
    {
      key: 'TARGET_WEIGHT_REACHED',
      title: 'Target weight reached',
      description: 'The selected target weight has been achieved.',
      weight: 25,
    },
  ],
};
