import * as Actions from '../constants/ActionTypes';

export const receiveDeviceShadowUpdate = (macAddress, update) => {
  return {
    type: Actions.RECEIVE_DEVICE_SHADOW_UPDATE,
    payload: {
      macAddress,
      update,
    },
  };
}

export const setSubscriptionStatus = (macAddress) => {
  return {
    type: Actions.SET_SUBSCRIPTION_STATUS,
    payload: {
      macAddress,
    },
  };
}

export const updateZone = (value, updateAttribute, zoneId) => {
  return {
    type: Actions.UPDATE_ZONE,
    payload: {
      value,
      updateAttribute,
      zoneId,
    }
  };
}

export const updateVacationSchedule = (vacationKey, dates) => {
  return {
    type: Actions.UPDATE_VACATION_SCHEDULE,
		payload: {
			vacationKey,
			dates
		}
  };
}

export const receiveUserInfo = (userAttrs) => {
  return {
    type: Actions.RECEIVE_USER_INFO,
    payload: {
      ...userAttrs,
    }
  };
}

export const resetShadow = () => {
  return {
    type: Actions.RESET_SHADOW,
  };
}

export const setCurrentSystem = (currentSystem) => {
  return {
    type: Actions.SET_CURRENT_SYSTEM,
    payload: {
      currentSystem,
    },
  };
}
