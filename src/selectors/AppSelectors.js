import moment from 'moment';

import { requestDeviceShadowForSystem } from '../util/deviceShadowUtil';
import { DAY_NAMES, AM_PM_VALUES } from '../constants/ScheduleConstants';

export const selectCurrentSystemNumber = (state) => {
  return state.currentSystem;
};

export const selectCurrentGenX = (state) => {
  return state.currentGenX;
};

const selectCurrentSystemShadow = (state) => {
  const currentGenX = selectCurrentGenX(state);
  const currentSystem = selectCurrentSystemNumber(state);

  return (
    state.devices[currentGenX] &&
    state.devices[currentGenX].systems &&
    state.devices[currentGenX].systems[currentSystem] &&
    state.devices[currentGenX].systems[currentSystem].shadow
  ) || undefined;
}

export const selectIsCurrentSystemLoaded = (state) => {
  const shadowForCurrentSystem = selectCurrentSystemShadow(state);

  if (!shadowForCurrentSystem) {
    const currentSystemNumber = selectCurrentSystemNumber(state);
    requestDeviceShadowForSystem(currentSystemNumber);
    return false;
  }

  const hasAllShadowDataForSystem = (
    isNonEmptyObject(shadowForCurrentSystem.zones) &&
    isNonEmptyObject(shadowForCurrentSystem.diagnostics) &&
    isNonEmptyObject(shadowForCurrentSystem.vacations) &&
    isNonEmptyObject(shadowForCurrentSystem.discover) &&
    isNonEmptyObject(shadowForCurrentSystem.systemConfig)
  );

  if (!hasAllShadowDataForSystem) {
    const currentSystemNumber = selectCurrentSystemNumber(state);
    requestDeviceShadowForSystem(currentSystemNumber);
    return false;
  }

  return true;
};

const isNonEmptyObject = (obj) => {
  return obj && Object.keys(obj).length > 0;
};

// Given a device shadow object, return the zones that apply to the currently displayed
// system (GenX or RM).
export const selectZonesForCurrentSystem = (state) => {
  const currentSystem = selectCurrentSystemShadow(state);
  return currentSystem.zones
};

// Given a device shadow object, return the diagnostic data that applies to the currently displayed
// system (GenX or RM).
export const selectDiagnosticsForCurrentSystem = (state) => {
  const currentSystem = selectCurrentSystemShadow(state);
  return currentSystem.diagnostics
};

export const selectIsCurrentSystemCelsius = (state) => {
  const currentSystem = selectCurrentSystemShadow(state);
  return currentSystem.systemConfig.tempFormat === '1';
};

export const selectRmCountForGenX = (state) => {
  // Discover data is universal, so we can always rely on the discover data in genx (system 0)
  // to be true for all systems (RMs).
  const currentSystem = selectCurrentSystemShadow(state);
  // We need extra checks here because this selector is used to render the nav bar - which
  // can happen before the shadow data is loaded.
  return (currentSystem && currentSystem.discover) ?
    parseInt(currentSystem.discover.rmCount, 10) :
    0;
};

export const selectVacationsForCurrentSystem = (state) => {
  const currentSystem = selectCurrentSystemShadow(state);
  return currentSystem.vacations
};

export const selectMomentsForCurrentSystemSchedules = (state) => {
  const schedules = selectSchedulesForCurrentSystem(state);
  // schedules: zone -> day -> start/ends
  let moments = {};
  Object.keys(schedules).forEach( (zone) => {
    moments[zone] = {};
    Object.keys(schedules[zone]).forEach( (day) => {
      let dayTimes = schedules[zone][day];
      let startMoment = moment(`${dayTimes.startHour}:${dayTimes.startMinute} ${dayTimes.startAmPm}`, 'h:mm a')
      let endMoment = moment(`${dayTimes.endHour}:${dayTimes.endMinute} ${dayTimes.endAmPm}`, 'h:mm a')
      moments[zone][day] = {
        startMoment: startMoment,
        endMoment: endMoment,
      }
    } )
  } )
  return moments;
}

const selectSchedulesForCurrentSystem = (state) => {
  const currentSystem = selectCurrentSystemShadow(state);
  let systemSchedules = {};
  Object.keys(currentSystem.zones).forEach((zoneNumber) => {
    systemSchedules[zoneNumber] = getSchedulesForZone(currentSystem.zones[zoneNumber]);
  });

  return systemSchedules;
};

const getSchedulesForZone = (zone) => {
  let zoneSchedule = {};
  Object.keys(DAY_NAMES).forEach((dayName) => {
    zoneSchedule[dayName] = {
      startHour: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}OccupiedHour`]
      ),
      startMinute: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}OccupiedMinute`]
      ),
      startAmPm: getAmPmString(
        zone[`${DAY_NAMES[dayName]}OccupiedAmPm`]
      ),
      endHour: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}UnoccupiedHour`]
      ),
      endMinute: formatHourOrMinuteString(
        zone[`${DAY_NAMES[dayName]}UnoccupiedMinute`]
      ),
      endAmPm: getAmPmString(
        zone[`${DAY_NAMES[dayName]}UnoccupiedAmPm`]
      ),
    }
  });

  return zoneSchedule;
};

const getAmPmString = (value) => {
  return AM_PM_VALUES[value] || 'AM' //Fall back to AM if the value is invalid
};

const formatHourOrMinuteString = (numberString) => {
  if (numberString.length > 1) {
    return numberString;
  } else if (numberString.length === 1) {
    return `0${numberString}`;
  } else {
    return '00';
  }
};

export const selectUserInfo = (state) => {
  return state.user;
};

export const selectIsConnectToShadowBackend = (state) => {
  return state.connection.baseConnection;
};

export const selectIsSubscribedToDevice = (state, macAddress) => {
  return !!state.connection.subscriptions[macAddress];
};
