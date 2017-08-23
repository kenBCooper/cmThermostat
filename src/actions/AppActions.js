import * as Actions from '../constants/ActionTypes';

export const receiveDeviceShadowUpdate = (message) => {
    return {
        type: Actions.RECEIVE_DEVICE_SHADOW_UPDATE,
        payload: message,
    }
}

export const setConnectedStatus = () => {
    return {
        type: Actions.SET_CONNECTED_STATUS,
    }
}

export const updateDeviceShadow = (value, updateAttribute, zoneId) => {
  return {
    type: Actions.UPDATE_DEVICE_SHADOW,
    payload: {
      value,
      updateAttribute,
      zoneId,
    }
  }
}

export const setUserInfo = (userAttrs) => {
  return {
    type: Actions.SET_USER_INFO,
    payload: {
      ...userAttrs,
    }
  }
}
