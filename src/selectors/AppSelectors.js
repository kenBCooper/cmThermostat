import moment from 'moment';

import { requestDeviceShadowForSystem, requestNamesForSystem } from '../util/deviceShadowUtil';
import { DAY_NAMES, AM_PM_VALUES } from '../constants/ScheduleConstants';

export const selectCurrentSystemNumber = (state) => {
  return state.currentSystem;
};

export const selectCurrentGenX = (state) => {
  return state.currentGenX;
};

export const selectMacList = (state) => {
  return state.user.macList;
}

const selectCurrentSystemShadow = (state) => {
  const currentGenX = selectCurrentGenX(state);
  const currentSystem = selectCurrentSystemNumber(state);

  return selectShadowForSystem(state, currentGenX, currentSystem);
}

const selectShadowForSystem = (state, macAddress, systemNumber) => {
  return (
    state.devices[macAddress] &&
    state.devices[macAddress].systems &&
    state.devices[macAddress].systems[systemNumber] &&
    state.devices[macAddress].systems[systemNumber].shadow
  ) || undefined;
}

// Returns the system name and the zone names for a specific GENX or RM.
export const selectNamesForCurrentSystem = (state) => {
  const currentGenX = selectCurrentGenX(state);
  const currentSystemNumber = selectCurrentSystemNumber(state);
  return selectNamesForSystem(state, currentGenX, currentSystemNumber);
}

// Returns the system name only. Used in places where the zones may not yet
// be loaded and we only care about the system name.
export const selectCurrentSystemName = (state) => {
  const currentGenX = selectCurrentGenX(state);
  const currentSystemNumber = selectCurrentSystemNumber(state);
  return selectSystemName(state, currentGenX, currentSystemNumber);
}

export const selectAllSystemNames = (state) => {
  const genXNames = {};
  const macList = selectMacList(state);
  const rmCounts = selectRmCountsForGenXs(state);

  macList.forEach((macAddress) => {
    const genXRmCount = rmCounts[macAddress];
    genXNames[macAddress] = {};
    genXNames[macAddress][0] = selectSystemName(state, macAddress, 0);
    for(let i = 1; i <= genXRmCount; i++) {
      const rmName = selectSystemName(state, macAddress, i);
      genXNames[macAddress][i] = rmName;
    }
  });

  return genXNames;
}

const selectSystemName = (state, macAddress, systemNumber) => {
  const systemShadow = selectShadowForSystem(state, macAddress, systemNumber);
  if (!systemShadow || !isNonEmptyObject(systemShadow.names)) {
    return getDefaultSystemName(macAddress, systemNumber);
  } else {
    return systemShadow.names[0] || getDefaultSystemName(macAddress, systemNumber);
  }
}

export const selectNamesForSystem = (state, macAddress, systemNumber) => {
  const systemShadow = selectShadowForSystem(state, macAddress, systemNumber)

  if (!systemShadow || !isNonEmptyObject(systemShadow.names)) {
    requestNamesForSystem(systemNumber);
    return selectDefaultNamesForSystem(state, macAddress, systemNumber);
  } else {
    // If not all zone names are accounted for, fill them in with defaults.
    return Object.assign(
      {},
      selectDefaultNamesForSystem(state, macAddress, systemNumber),
      systemShadow.names,
    );
  }
} 

// Names that will be generated when we do not have any custom names yet from
// the server. If no custom names are present there will be no response to a
// name request.
const selectDefaultNamesForSystem = (state, macAddress, systemNumber) => {
  const systemName = getDefaultSystemName(macAddress, systemNumber);
  const zoneNames = selectDefaultZoneNames(state, macAddress, systemNumber);
  return Object.assign({}, zoneNames, { 0: systemName });
};

const getDefaultSystemName = (macAddress, systemNumber) => {
  return (systemNumber === 0) ? `GEN X ${macAddress.slice(-4)}` : `RM ${systemNumber}`;
}

const selectDefaultZoneNames = (state, macAddress, systemNumber) => {
  const zoneNames = {};
  const zones = selectZonesForSystem(state, macAddress, systemNumber);
  Object.keys(zones).forEach((zoneNumber) => {
    zoneNames[zoneNumber] = `${zoneNumber}: Zone ${zoneNumber}`;
  });

  return zoneNames;
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
    isNonEmptyObject(shadowForCurrentSystem.discover) &&
    isNonEmptyObject(shadowForCurrentSystem.systemConfig) &&
    // Vacations can be empty, but we want to ensure we got a
    // response from the board, even if its empty.
    shadowForCurrentSystem.vacations
  );

  const hasNameDataForSystem = isNonEmptyObject(shadowForCurrentSystem.names);

  if (!hasAllShadowDataForSystem) {
    const currentSystemNumber = selectCurrentSystemNumber(state);
    requestDeviceShadowForSystem(currentSystemNumber);
    // Lacking names does not mean a system is not loaded, so its not included
    // in the check above. However, if we have not loaded a system we want to
    // request the name data along with the rest of the system data. That happens
    // by calling the selectNamesForCurrentSystem selector.
    selectNamesForCurrentSystem(state);
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

const selectZonesForSystem = (state, macAddress, systemNumber) => {
  const systemShadow = selectShadowForSystem(state, macAddress, systemNumber)
  return systemShadow.zones;
}

export const selectZoneCountForCurrentSystem = (state) => {
  return Object.keys(selectZonesForCurrentSystem(state) || {}).length;
}

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

export const selectRmCountsForGenXs = (state) => {
  const rmCounts = {};
  const genXs = state.user.macList;

  genXs.forEach((macAddress) => {
    const rmCount = selectRmCountForGenX(state, macAddress);
    rmCounts[macAddress] = rmCount;
  });

  return rmCounts;
};

const selectRmCountForGenX = (state, macAddress) => {
  const genXShadow = selectShadowForSystem(state, macAddress, 0)
  return (genXShadow && genXShadow.discover) ?
    parseInt(genXShadow.discover.rmCount, 10) :
    0;
}

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
