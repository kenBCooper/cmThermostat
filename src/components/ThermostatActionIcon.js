import React, { Component } from 'react';
import { connect } from 'react-redux';

import { getDiagnosticForCurrentSystem } from '../util/deviceShadowUtil';
import './ThermostatActionIcon.css';

import heatIcon from '../img/heat_large.png';
import coolIcon from '../img/cool_large.png';

const DIAGNOSTIC_HEAT_STATUS = '3';
const DIAGNOSTIC_COOL_STATUS = '2';

class ThermostatActionIcon extends Component {
  render() {
    let imgSource;
    let isActive;

    const zoneData = this.props.zoneData;
    const currentTemp = zoneData.currentTemp;
    const heatPoint = zoneData.occupiedStatus === '1' ? zoneData.occupiedHeat : zoneData.unoccupiedHeat;
    const coolPoint = zoneData.occupiedStatus === '1' ? zoneData.occupiedCool : zoneData.unoccupiedCool;
    const standaloneThermostat = zoneData.standaloneThermostat === '2';

    const diagnostics = getDiagnosticForCurrentSystem(this.props.deviceShadow);
    if (currentTemp < heatPoint) {
      imgSource = heatIcon;
      if (standaloneThermostat) {
        isActive = true;
      } else {
        isActive = diagnostics.systemStatus === DIAGNOSTIC_HEAT_STATUS ? true : false;
      }
    } else if (currentTemp > coolPoint) {
      imgSource = coolIcon;
      if (standaloneThermostat) {
        isActive = true;
      } else {
        isActive = diagnostics.systemStatus === DIAGNOSTIC_COOL_STATUS ? true : false;
      }
    } else {
      return null;
    }
    const sizeClassName = this.props.small ? 'small' : '';
    const greyscaleClassName = isActive ? '' : 'greyscale';
    return (
      <img src={imgSource} 
          className={`${sizeClassName} ${greyscaleClassName}`}
          alt="thermostat action"/>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    deviceShadow: state.shadow,
  }
};

export default connect(mapStateToProps, undefined)(ThermostatActionIcon);
