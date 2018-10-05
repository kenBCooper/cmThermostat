import * as Actions from '../constants/ActionTypes';
import { 
  parseDeviceShadow,
  updateRawDeviceShadow,
  publishDeviceShadowZoneUpdate,
  publishDeviceShadowNameUpdate,
  publishDeviceShadowVacationUpdate,
  publishDeviceShadowConfigUpdate,
} from '../util/deviceShadowUtil';
import { selectNamesForSystem } from '../selectors/AppSelectors';

const DEFAULT_STATE = {
  connection: {
    subscriptions: {},
  },
  user: {
    accessToken: undefined,
    idToken: undefined,
    refreshToken: undefined,
    macList: [],
  },
  devices: {},
  currentSystem: 0,
  currentGenX: undefined,
};

const EMPTY_DEVICE_STATE = { systems: {} };
const EMPTY_SYSTEM_STATE = { shadow: {}, rawShadow: {} };

const appReducer = (state = DEFAULT_STATE, action) => {
  switch(action.type) {
    case Actions.RECEIVE_USER_INFO:
      return receiveUserInfo(state, action);
    case Actions.RECEIVE_DEVICE_SHADOW_UPDATE:
      return receiveDeviceShadowUpdate(state, action);
    case Actions.UPDATE_ZONE:
      return updateZone(state, action);
    case Actions.UPDATE_ZONE_NAME:
      return updateZoneName(state, action);
    case Actions.UPDATE_VACATION_SCHEDULE:
      return updateVacation(state, action);
    case Actions.UPDATE_TEMP_FORMAT:
      return updateTempFormat(state, action);
    case Actions.RESET_SHADOW:
      return resetDeviceShadow(state, action);
    case Actions.SET_CURRENT_SYSTEM:
      return setCurrentSystem(state, action);
    case Actions.SET_CURRENT_GENX:
      return setCurrentGenX(state, action);
    case Actions.SET_SUBSCRIPTION_STATUS:
      return setSubscriptionStatus(state, action);
    default:
      return state;
  }
}

const receiveUserInfo = (state, action) => {
  const macList = action.payload.macList;
  const shadowsState = {};

  macList.forEach((macAddress) => {
    shadowsState[macAddress] = EMPTY_DEVICE_STATE;
  });

  return {
    ...state,
    user: {
      ...state.user,
      ...action.payload,
    },
    devices: shadowsState,
    currentGenX: action.payload.macList && action.payload.macList[0],
  };
}

const receiveDeviceShadowUpdate = (state, action) => {
  const macAddress = action.payload.macAddress;
  const rawUpdatedShadowState = action.payload.update;
  const updatedShadowState = parseDeviceShadow(rawUpdatedShadowState);
  const systemNumber = parseInt(updatedShadowState.systemNumber, 10);

  // If no system number was included, the update is junk and we can ignore it.
  if (systemNumber !== 0 && !systemNumber) return state;

  const existingDeviceState = state.devices[macAddress] || EMPTY_DEVICE_STATE;
  const existingSystemState = existingDeviceState.systems[systemNumber] || EMPTY_SYSTEM_STATE;
  const existingShadowForSystem = existingSystemState.shadow || {};
  const existingRawShadowForSystem = existingSystemState.rawShadow || {};

  // Merge any new shadow updates with the currently known data.
  const newSystemShadow = {
    ...existingShadowForSystem,
    zones: {
      ...existingShadowForSystem.zones,
      ...updatedShadowState.zones
    },
    diagnostics: {
      ...existingShadowForSystem.diagnostics,
      ...updatedShadowState.diagnostics,
    },
    discover: {
      ...existingShadowForSystem.discover,
      ...updatedShadowState.discover,
    },
		vacations: {
			...existingShadowForSystem.vacations,
			...updatedShadowState.vacations,
		},
    systemConfig: {
      ...existingShadowForSystem.systemConfig,
      ...updatedShadowState.systemConfig,
    },
    names: {
      ...existingShadowForSystem.names,
      ...updatedShadowState.names,
    }
  };

  const newSystemRawShadow = {
    ...existingRawShadowForSystem,
    ...rawUpdatedShadowState,
  };

  return {
    ...state,
    devices: {
      ...state.devices,
      [macAddress]: {
        ...existingDeviceState,
        systems: {
          ...existingDeviceState.systems,
          [systemNumber]: {
            ...existingSystemState,
            shadow: newSystemShadow,
            rawShadow: newSystemRawShadow,
          },
        },
      },
    },
  };
}

const setSubscriptionStatus = (state, action) => {
  return {
    ...state,
    connection: {
      ...state.connection,
      subscriptions: {
        ...state.connection.subscriptions,
        [action.payload.macAddress]: true,
      },
    },
  };
}

const updateZone = (state, action) => {
  const updateValue = action.payload.value;
  const updateAttribute = action.payload.updateAttribute;
  const updateZoneId = action.payload.zoneId;
  const currentSystemNumber = state.currentSystem;
  const currentGenX = state.currentGenX;

  const existingDeviceState = state.devices[currentGenX] || EMPTY_DEVICE_STATE;
  const existingSystemState = existingDeviceState.systems[currentSystemNumber] || EMPTY_SYSTEM_STATE;
  const existingShadowForSystem = existingSystemState.shadow || {};
  const existingRawShadowForSystem = existingSystemState.rawShadow || {};
  const existingZoneDataForShadow = existingShadowForSystem.zones || {};

  const updatedSystemShadow = {
    ...existingShadowForSystem,
    zones: {
      ...existingZoneDataForShadow,
      [updateZoneId]: {
        ...existingZoneDataForShadow[updateZoneId],
        [updateAttribute]: updateValue,
      },
    },
  };

  // Update the raw device shadow.
  const updatedSystemRawShadow = updateRawDeviceShadow(
    existingRawShadowForSystem, updatedSystemShadow);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowZoneUpdate(updatedSystemRawShadow, currentGenX, currentSystemNumber, updateZoneId);

  // Optimistically update local state with changes while update to device shadow
  // is pending.

  return {
    ...state,
    devices: {
      ...state.devices,
      [currentGenX]: {
        ...existingDeviceState,
        systems: {
          ...existingDeviceState.systems,
          [currentSystemNumber]: {
            ...existingSystemState,
            shadow: updatedSystemShadow,
            rawShadow: updatedSystemRawShadow,
          },
        },
      },
    },
  };
}

const updateZoneName = (state, action) => {
  const updatedName = action.payload.name;
  const zoneToUpdate = action.payload.zoneNumber;

  const currentSystemNumber = state.currentSystem;
  const currentGenX = state.currentGenX;

  const existingDeviceState = state.devices[currentGenX] || EMPTY_DEVICE_STATE;
  const existingSystemState = existingDeviceState.systems[currentSystemNumber] || EMPTY_SYSTEM_STATE;
  const existingShadowForSystem = existingSystemState.shadow || {};
  const existingRawShadowForSystem = existingSystemState.rawShadow || {};

  const existingNamesDataWithDefaults = selectNamesForSystem(state, currentGenX, currentSystemNumber);

  const updatedSystemShadow = {
    ...existingShadowForSystem,
    names: {
      ...existingNamesDataWithDefaults,
      [zoneToUpdate]: updatedName,
    },
  };

  // Update the raw device shadow.
  const updatedSystemRawShadow = updateRawDeviceShadow(
    existingRawShadowForSystem, updatedSystemShadow);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowNameUpdate(updatedSystemRawShadow, currentGenX, currentSystemNumber);

  // // Optimistically update local state with changes while update to device shadow
  // // is pending.
  return {
    ...state,
    devices: {
      ...state.devices,
      [currentGenX]: {
        ...existingDeviceState,
        systems: {
          ...existingDeviceState.systems,
          [currentSystemNumber]: {
            ...existingSystemState,
            shadow: updatedSystemShadow,
            rawShadow: updatedSystemRawShadow,
          },
        },
      },
    },
  };
}

const updateVacation = (state, action) => {
	const updateVacKey = action.payload.vacationKey;
	const updateStartDate = action.payload.dates[0];
	const updateEndDate = action.payload.dates[1];
  const currentSystemNumber = state.currentSystem;
  const currentGenX = state.currentGenX;

  const existingDeviceState = state.devices[currentGenX] || EMPTY_DEVICE_STATE;
  const existingSystemState = existingDeviceState.systems[currentSystemNumber] || EMPTY_SYSTEM_STATE;
  const existingShadowForSystem = existingSystemState.shadow || {};
  const existingRawShadowForSystem = existingSystemState.rawShadow || {};
  const existingVacationDataForShadow = existingShadowForSystem.vacations || {};

  const updatedSystemShadow = {
    ...existingShadowForSystem,
    vacations: {
      ...existingVacationDataForShadow,
      [updateVacKey]: {
        startDate: updateStartDate,
        endDate: updateEndDate,
      },
    },
  };


	if (updateStartDate.diff(updateEndDate,"days") === 0 && updateStartDate.format("M-D") === "1-1") {
		delete updatedSystemShadow.vacations[updateVacKey];
	}

  // Update the raw device shadow.
  const updatedSystemRawShadow = updateRawDeviceShadow(
    existingRawShadowForSystem, updatedSystemShadow);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowVacationUpdate(updatedSystemRawShadow, currentGenX, currentSystemNumber);

  // Optimistically update local state with changes while update to device shadow
  // is pending.
  return {
    ...state,
    devices: {
      ...state.devices,
      [currentGenX]: {
        ...existingDeviceState,
        systems: {
          ...existingDeviceState.systems,
          [currentSystemNumber]: {
            ...existingSystemState,
            shadow: updatedSystemShadow,
            rawShadow: updatedSystemRawShadow,
          },
        },
      },
    },
  };
}

const updateTempFormat = (state, action) => {
  const tempFormat = action.payload.tempFormat;
  const currentSystemNumber = state.currentSystem;
  const currentGenX = state.currentGenX;

  const existingDeviceState = state.devices[currentGenX] || EMPTY_DEVICE_STATE;
  const existingSystemState = existingDeviceState.systems[currentSystemNumber] || EMPTY_SYSTEM_STATE;
  const existingShadowForSystem = existingSystemState.shadow || {};
  const existingRawShadowForSystem = existingSystemState.rawShadow || {};
  const existingConfigDataForShadow = existingShadowForSystem.systemConfig || {};

  const updatedSystemShadow = {
    ...existingShadowForSystem,
    systemConfig: {
      ...existingConfigDataForShadow,
      tempFormat,
    },
  };

  // Update the raw device shadow.
  const updatedSystemRawShadow = updateRawDeviceShadow(
    existingRawShadowForSystem, updatedSystemShadow);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowConfigUpdate(updatedSystemRawShadow, currentGenX, currentSystemNumber);

  // Optimistically update local state with changes while update to device shadow
  // is pending.
  return {
    ...state,
    devices: {
      ...state.devices,
      [currentGenX]: {
        ...existingDeviceState,
        systems: {
          ...existingDeviceState.systems,
          [currentSystemNumber]: {
            ...existingSystemState,
            shadow: updatedSystemShadow,
            // rawShadow: updatedSystemRawShadow,
          },
        },
      },
    },
  };
}

const resetDeviceShadow = (state, action) => {
  let resetShadow = { ...DEFAULT_STATE };

  resetShadow.user = { ...state.user };
  resetShadow.currentGenX = state.currentGenX;
  resetShadow.currentSystem = 0;

  return resetShadow;
}

const setCurrentSystem = (state, action) => {
  return {
    ...state,
    currentSystem: action.payload.currentSystem,
  };
}

const setCurrentGenX = (state, action) => {
  return {
    ...state,
    currentGenX: action.payload.currentGenX,
  };
}

export default appReducer
