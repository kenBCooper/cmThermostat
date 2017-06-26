import * as Actions from '../constants/ActionTypes';
import { parseDeviceShadow } from '../util/deviceShadowUtil';

const DEFAULT_STATE = {
    connected: false,
    shadow: {
        zones: undefined,
    }
};

const updateDeviceShadow = (state, action) => {
    const rawUpdatedShadowState = action.payload;
    const updatedShadowState = parseDeviceShadow(action.payload);

    return {
        ...state,
        rawShadow: Object.assign({}, state.rawShadow, rawUpdatedShadowState),
        shadow: {
            ...state.shadow,
            zones: Object.assign({}, state.shadow.zones, updatedShadowState.zones)
        }
    }
}

const setConnectedStatus = (state, action) => {
    return {
        ...state,
        connected: true,
    }
}

const appReducer = (state = DEFAULT_STATE, action) => {
    switch(action.type) {
        case Actions.UPDATE_DEVICE_SHADOW:
            return updateDeviceShadow(state, action);
        case Actions.SET_CONNECTED_STATUS:
            return setConnectedStatus(state, action);
        default:
            return state;
    }
}

export default appReducer