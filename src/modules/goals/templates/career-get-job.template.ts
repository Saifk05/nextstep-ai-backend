import {
  GoalActionFrequency,
  GoalActionPriority,
  GoalCategory,
  GoalTemplateKey,
  GoalType,
} from '../enums/goals.enum';

export const JOB_SEARCH_TEMPLATE = {
  key: GoalTemplateKey.JOB_SEARCH,
  slug: 'job-search',
  category: GoalCategory.CAREER,
  goalType: GoalType.JOB_SEARCH,

  title: 'Job Search',
  description:
    'Structured job search plan covering resume preparation, applications, recruiter outreach, interview preparation, and offer tracking.',

  version: 1,
  isActive: true,

  setupQuestions: [
    {
      key: 'targetRole',
      label: 'What role are you targeting?',
      type: 'text',
      required: true,
    },
    {
      key: 'experienceLevel',
      label: 'What is your experience level?',
      type: 'select',
      required: true,
      options: ['FRESHER', 'JUNIOR', 'MID_LEVEL', 'SENIOR'],
    },
    {
      key: 'targetCompanies',
      label: 'Which companies or industries are you targeting?',
      type: 'textarea',
      required: false,
    },
    {
      key: 'dailyApplicationTarget',
      label: 'How many jobs do you want to apply to daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 5',
    },
    {
      key: 'dailyRecruiterOutreachTarget',
      label: 'How many recruiters do you want to contact daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 3',
    },
    {
      key: 'dailyInterviewPrepMinutes',
      label: 'How many minutes do you want to prepare daily?',
      type: 'number',
      required: true,
      placeholder: 'Example: 60',
    },
    {
      key: 'currentResumeStatus',
      label: 'Is your resume ready?',
      type: 'select',
      required: true,
      options: ['NOT_READY', 'NEEDS_UPDATE', 'READY'],
    },
    {
      key: 'linkedinProfileStatus',
      label: 'Is your LinkedIn profile optimized?',
      type: 'select',
      required: true,
      options: ['NOT_STARTED', 'PARTIALLY_UPDATED', 'OPTIMIZED'],
    },
  ],

  defaultMetrics: {
    emailsSent: 0,
    replies: 0,
    interviews: 0,
    offers: 0,
    rejections: 0,
    followUpsDue: 0,
    applicationsSubmitted: 0,
  },

  actionTemplates: [
    {
      key: 'OPTIMIZE_RESUME',
      title: 'Optimize resume for target role',
      description:
        'Update resume summary, skills, projects, and experience for the selected target role.',
      frequency: GoalActionFrequency.ONCE,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'Resume is updated and ready for applications.',
      actionType: 'RESUME',
    },
    {
      key: 'OPTIMIZE_LINKEDIN',
      title: 'Optimize LinkedIn profile',
      description:
        'Update headline, about section, skills, projects, and open-to-work settings.',
      frequency: GoalActionFrequency.ONCE,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'LinkedIn profile clearly matches target role.',
      actionType: 'PROFILE',
    },
    {
      key: 'APPLY_TO_RELEVANT_JOBS',
      title: 'Apply to relevant jobs',
      description:
        'Apply to jobs that match the selected role, skills, location, and experience level.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'Daily application target is completed.',
      actionType: 'APPLICATION',
      metadata: {
        defaultDailyTarget: 5,
        setupAnswerKey: 'dailyApplicationTarget',
      },
    },
    {
      key: 'SEND_COLD_EMAILS',
      title: 'Send cold emails to recruiters',
      description:
        'Send personalized outreach messages to recruiters or hiring managers.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'Recruiter outreach target is completed.',
      actionType: 'OUTREACH',
      metadata: {
        defaultDailyTarget: 3,
        setupAnswerKey: 'dailyRecruiterOutreachTarget',
      },
    },
    {
      key: 'FOLLOW_UP_RECRUITERS',
      title: 'Follow up with recruiters',
      description:
        'Follow up on previous applications or recruiter messages after a reasonable waiting period.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'Pending follow-ups are reviewed and sent.',
      actionType: 'FOLLOW_UP',
    },
    {
      key: 'INTERVIEW_PREPARATION',
      title: 'Prepare for interviews',
      description:
        'Practice technical questions, projects, system design basics, and HR answers.',
      frequency: GoalActionFrequency.DAILY,
      priority: GoalActionPriority.HIGH,
      successCriteria: 'Interview preparation session is completed.',
      actionType: 'PREPARATION',
      metadata: {
        defaultMinutes: 60,
        setupAnswerKey: 'dailyInterviewPrepMinutes',
      },
    },
    {
      key: 'WEEKLY_JOB_SEARCH_REVIEW',
      title: 'Review weekly job-search progress',
      description:
        'Review applications, replies, interviews, rejections, follow-ups, and improve next week plan.',
      frequency: GoalActionFrequency.WEEKLY,
      priority: GoalActionPriority.MEDIUM,
      successCriteria: 'Weekly job-search progress review is completed.',
      actionType: 'REVIEW',
    },
  ],

  milestoneTemplates: [
    {
      key: 'RESUME_READY',
      title: 'Resume ready',
      description: 'Resume is finalized for the target role.',
      weight: 15,
    },
    {
      key: 'FIRST_APPLICATIONS_SENT',
      title: 'First applications sent',
      description: 'User has started applying to relevant jobs.',
      weight: 15,
    },
    {
      key: 'FIRST_RECRUITER_REPLY',
      title: 'First recruiter reply',
      description: 'User receives the first recruiter or hiring response.',
      weight: 20,
    },
    {
      key: 'FIRST_INTERVIEW_SCHEDULED',
      title: 'First interview scheduled',
      description: 'User gets the first interview opportunity.',
      weight: 25,
    },
    {
      key: 'JOB_OFFER_RECEIVED',
      title: 'Job offer received',
      description: 'User receives a job offer.',
      weight: 25,
    },
  ],
};