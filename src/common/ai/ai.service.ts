// src/common/ai/ai.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { buildGoalPlannerPrompt } from './prompts/goal-planner.prompt';
import { GoalType } from '../../modules/goals/enums/goals.enum';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is missing');
    }

    this.ai = new GoogleGenAI({
      apiKey,
    });
  }

  async generateGoalPlan(data: {
    title: string;
    description?: string;
    targetDate: Date;
  }): Promise<{
    goalType: GoalType;
    strategySummary: string;
    dailyActions: string[];
    weeklyActions: string[];
    milestones: string[];
  }> {
    try {
      const prompt = buildGoalPlannerPrompt(data);

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';

      const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate AI goal plan');
    }
  }
}