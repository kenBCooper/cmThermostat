export const parseDeviceShadow = (shadowJSON) => {
    return {
        zones: [
            {
                name: 'Fake Zone 1',
                temp: 50,
                occupiedHeatSetpoint: 75,
                occupiedCoolSetpoint: 25,
                unoccupiedHeatSetpoint: 75,
                unoccupiedCoolSetpoint: 25,
            },
            {
                name: 'Fake Zone 2',
                temp: 50,
                occupiedHeatSetpoint: 75,
                occupiedCoolSetpoint: 25,
                unoccupiedHeatSetpoint: 75,
                unoccupiedCoolSetpoint: 25,
            },
            {
                name: 'Fake Zone 3',
                temp: 50,
                occupiedHeatSetpoint: 75,
                occupiedCoolSetpoint: 25,
                unoccupiedHeatSetpoint: 75,
                unoccupiedCoolSetpoint: 25,
            },
        ]
    }
}