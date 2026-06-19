import { isOtherSchoolLevel } from './school-level';

export function shouldSkipNeisScheduleFetch(schoolLevel: string): boolean {
  return isOtherSchoolLevel(schoolLevel);
}

export function createEmptyNeisScheduleBundle() {
  return {
    entries: [],
    scheduleEvents: [],
  };
}

export function buildOtherStudentTimetableResponse(profile: { schoolLevel: string }) {
  return {
    profile: {
      schoolLevel: profile.schoolLevel,
    },
    ...createEmptyNeisScheduleBundle(),
  };
}
