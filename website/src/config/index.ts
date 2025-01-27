import { AcadYear, Semester } from 'types/modules';

import holidays from 'data/holidays.json';
import corsData from 'data/cors-schedule-ay1819-sem2.json';
import appConfig from './app-config.json';

export type CorsPeriodType = 'open' | 'closed';

export type CorsPeriod = {
  type: CorsPeriodType;
  start: string;
  startDate: Date;
  end: string;
  endDate: Date;
};

export type CorsRound = {
  round: string;
  periods: CorsPeriod[];
};

export type Config = {
  brandName: string;
  academicYear: AcadYear;
  semester: Semester;
  getSemesterKey: () => string;

  apiBaseUrl: string;
  corsUrl: string;
  ivleUrl: string;

  disqusShortname: string;
  venueFeedbackApi: string;

  semesterNames: { [semester: string]: string };
  shortSemesterNames: { [semester: string]: string };
  archiveYears: string[];
  examAvailability: Semester[];
  examAvailabilitySet: Set<Semester>;

  defaultPreferences: {
    theme: string;
    mode: string;
    faculty: string;
    student: string;
    account: string;
  };

  contact: {
    blog: string;
    email: string;
    privateEmail: string;
    facebook: string;
    githubOrg: string;
    githubRepo: string;
    messenger: string;
    twitter: string;
  };

  holidays: Date[];

  corsSchedule: CorsRound[];
};

function convertCorsDate(roundData: typeof corsData[0]): CorsRound {
  return {
    ...roundData,
    periods: roundData.periods.map((period) => ({
      ...period,
      // To make TypeScript happy
      type: period.type as CorsPeriodType,
      // Convert timestamps to date objects
      startDate: new Date(period.startTs),
      endDate: new Date(period.endTs),
    })),
  };
}

const augmentedConfig: Config = {
  ...appConfig,

  corsUrl: appConfig.corsUrl
    .replace('<AcademicYear>', appConfig.academicYear)
    .replace('<Semester>', String(appConfig.semester)),

  holidays: holidays.map((date) => new Date(date)),

  corsSchedule: corsData.map(convertCorsDate),

  examAvailabilitySet: new Set(appConfig.examAvailability),

  /**
   * Returns a unique key for every acad year + semester
   */
  getSemesterKey: (): string =>
    `${augmentedConfig.academicYear} ${augmentedConfig.semesterNames[augmentedConfig.semester]}`,
};

export default augmentedConfig;
