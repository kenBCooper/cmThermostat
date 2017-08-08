import * as Actions from '../constants/ActionTypes';
import { 
  parseDeviceShadow,
  updateRawDeviceShadow,
  publishDeviceShadowUpdate,
  getRawZones,
} from '../util/deviceShadowUtil';

const DEFAULT_STATE = {
  connected: false,
  rawShadow: undefined,
  user: {
    accessToken: undefined,
    idToken: undefined,
    refreshToken: undefined,
    mac: undefined,
  },
  shadow: {
    zones: undefined,
    diagnostics: undefined,
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

  return {
    ...state,
    rawShadow: Object.assign({}, state.rawShadow, rawUpdatedShadowState),
    shadow: {
      ...state.shadow,
      zones: Object.assign({}, state.shadow.zones, updatedShadowState.zones),
      diagnostics: Object.assign({}, state.shadow.diagnostics, updatedShadowState.diagnostics),
    }
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

  const updatedDeviceShadowState = {
    ...state.shadow,
    zones: {
      ...state.shadow.zones,
      [updateZoneId]: {
        ...state.shadow.zones[updateZoneId],
        [updateAttribute]: updateValue,
      }
    }
  };

  // Update the raw device shadow.
  const updatedRawShadow = updateRawDeviceShadow(state.rawShadow, updatedDeviceShadowState);

  // Publish an update to the external device shadow using our updated raw state.
  publishDeviceShadowUpdate(updatedRawShadow, updateZoneId);

  // Optimistically update local state with changes while update to device shadow
  // is pending.
  return {
    ...state,
    rawShadow: updatedRawShadow,
    shadow: updatedDeviceShadowState,
  }
}

export default appReducer