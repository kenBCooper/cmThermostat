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

export const updateZone = (value, updateAttribute, zoneId) => {
  return {
    type: Actions.UPDATE_ZONE,
    payload: {
      value,
      updateAttribute,
      zoneId,
    }
  }
}

export const updateVacationSchedule = (vacationKey, dates) => {
  return {
    type: Actions.UPDATE_VACATION_SCHEDULE,
		payload: {
			vacationKey,
			dates
		}
  }
}

export const receiveUserInfo = (userAttrs) => {
  return {
    type: Actions.RECEIVE_USER_INFO,
    payload: {
      ...userAttrs,
    }
  }
}

export const resetShadow = () => {
  return {
    type: Actions.RESET_SHADOW,
  }
}
