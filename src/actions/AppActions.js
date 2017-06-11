import * as Actions from '../constants/ActionTypes';

export const receiveDeviceUpdate = (deviceShadowJson) => {
    return {
        type: Actions.RECEIVE_DEVICE_UPDATE,
        payload: deviceShadowJson,
    }
}