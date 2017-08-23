import * as Actions from '../constants/ActionTypes';
import { 
  parseDeviceShadow,
  updateRawDeviceShadow,
  publishDeviceShadowUpdate,
} from '../util/deviceShadowUtil';
import { getCurrentSystem } from '../util/urlUtil';

const DEFAULT_STATE = {
  connected: false,
  rawShadow: {
     0: undefined,
  },
  user: {
    accessToken: undefined,
    idToken: undefined,
    refreshToken: undefined,
    mac: undefined,
  },
  shadow: {
    0: {
      zones: undefined,
      diagnostics: undefined,
      discover: undefined,
    },
  }
};

const appReducer = (state = DEFAULT_STATE, action) => {
  switch(action.type) {
    case Actions.SET_USER_INFO:
      return setUserInfo(state, action);
    case Actions.RECEIVE_DEVICE_SHADOW_UPDATE:
      return receiveDeviceShadowUpdate(state, action);
    case Actions.SET_CONNECTED_STATUS:
      return setConnectedStatus(state, action);
    case Actions.UPDATE_DEVICE_SHADOW:
      return updateDeviceShadow(state, action);
    default:
      return state;
  }
}

const setUserInfo = (state, action) => {
  return {
    ...state,
    user: {
      ...state.user,
      ...action.payload,
    }
  }
}

const receiveDeviceShadowUpdate = (state, action) => {
  const rawUpdatedShadowState = action.payload;
  const updatedShadowState = parseDeviceShadow(action.payload);
  const systemNumber = parseInt(updatedShadowState.systemNumber, 10);

  let newShadow;
  // Merge any new shadow updates with the currently known data.
  if (state.shadow[systemNumber]) {
    newShadow = {
      ...state.shadow,
      [systemNumber]: {
        ...state.shadow[systemNumber],
        zones: {
          ...state.shadow[systemNumber].zones,
          ...updatedShadowState.zones
        },
        diagnostics: {
          ...state.shadow[systemNumber].diagnostics,
          ...updatedShadowState.diagnostics,
        },
        discover: {
          ...state.shadow[systemNumber].discover,
          ...updatedShadowState.discover,
        }
      } 
    }
  // If shadow data for a new system is being added for the first time,
  // we have no old data to merge with it.
  } else {
    newShadow = {
      ...state.shadow,
      [systemNumber]: {
        zones: {
          ...updatedShadowState.zones
        },
        diagnostics: {
          ...updatedShadowState.diagnostics,
        },
        discover: {
          ...updatedShadowState.discover,
        }
      } 
    }
  }

  return {
    ...state,
    rawShadow: {
      ...state.rawShadow,
      [systemNumber]: {
        ...state.rawShadow[systemNumber],
        ...rawUpdatedShadowState,
      }
    },
    shadow: newShadow,
  }
}

const setConnectedStatus = (state, action) => {
  return {
    ...state,
    connected: true,
  }
}

const updateDeviceShadow = (state, action) => {
  const updateValue = action.payload.value;
  const updateAttribute = action.payload.updateAttribute;
  const updateZoneId = action.payload.zoneId;
  const currentSystem = getCurrentSystem();

  const updatedDeviceShadowState = {
    ...state.shadow,
    [currentSystem]: {
      ...state.shadow[currentSystem],
      zones: {
        ...state.shadow[currentSystem].zones,
        [updateZoneId]: {
          ...state.shadow[currentSystem].zones[updateZoneId],
          [updateAttribute]: updateValue,
        }
      }
    }
  };

  // Update the raw device shadow.
  const updatedRawShadow = updateRawDeviceShadow(
    state.rawShadow[currentSystem], updatedDeviceShadowState[currentSystem]);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowUpdate(updatedRawShadow, updateZoneId);

  // Optimistically update local state with changes while update to device shadow
  // is pending.
  return {
    ...state,
    rawShadow: {
      ...state.rawShadow,
      [currentSystem]: updatedRawShadow,
    },
    shadow: updatedDeviceShadowState,
  }
}

export default appReducer