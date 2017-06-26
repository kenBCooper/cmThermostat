import * as Actions from '../constants/ActionTypes';

export const updateDeviceShadow = (message) => {
    return {
        type: Actions.UPDATE_DEVICE_SHADOW,
        payload: message,
    }
}

export const setConnectedStatus = () => {
    return {
        type: Actions.SET_CONNECTED_STATUS,
    }
}