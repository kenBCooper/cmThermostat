import { parseDeviceShadow } from '../util/deviceShadowUtil';
import * as Actions from '../constants/ActionTypes';

const DEFAULT_STATE = {
    zones: [
        {
            name: 'Fake Zone 1',
            temp: 0,
            occupiedHeatSetpoint: 0,
            occupiedCoolSetpoint: 0,
            unoccupiedHeatSetpoint: 0,
            unoccupiedCoolSetpoint: 0,
        },
        {
            name: 'Fake Zone 2',
            temp: 0,
            occupiedHeatSetpoint: 0,
            occupiedCoolSetpoint: 0,
            unoccupiedHeatSetpoint: 0,
            unoccupiedCoolSetpoint: 0,
        },
        {
            name: 'Fake Zone 3',
            temp: 0,
            occupiedHeatSetpoint: 0,
            occupiedCoolSetpoint: 0,
            unoccupiedHeatSetpoint: 0,
            unoccupiedCoolSetpoint: 0,
        },
    ]
};

const appReducer = (state = DEFAULT_STATE, action) => {
    switch(action.type) {
        case Actions.RECEIVE_DEVICE_UPDATE:
            return parseDeviceShadow(action.payload);
        default:
            return state;
    }
}

export default appReducer