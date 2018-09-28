import React, { Component } from 'react';
import { connect } from 'react-redux';

import { selectDiagnosticsForCurrentSystem } from '../selectors/AppSelectors';
import './ThermostatActionIcon.css';

import heatIcon from '../img/heat_large.png';
import coolIcon from '../img/cool_large.png';

const DIAGNOSTIC_HEAT_STATUS = '3';
const DIAGNOSTIC_COOL_STATUS = '2';

class ThermostatActionIcon extends Component {
  render() {
    let imgSource;
    let isActive;

    if (!(this.props.showHeat || this.props.showCool)) {
      const zoneData = this.props.zoneData;
      const currentTemp = zoneData.currentTemp;
      const heatPoint = zoneData.occupiedStatus === '1' ? zoneData.occupiedHeat : zoneData.unoccupiedHeat;
      const coolPoint = zoneData.occupiedStatus === '1' ? zoneData.occupiedCool : zoneData.unoccupiedCool;
      const standaloneThermostat = zoneData.standaloneThermostat === '1';

      const diagnostics = this.props.diagnostics;

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
    } else {
      if (this.props.showHeat) imgSource = heatIcon;
      if (this.props.showCool) imgSource = coolIcon;
      isActive = true;
    }
    const sizeClassName = this.props.small ? 'small' : (this.props.medium ? 'medium' : '');
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
    diagnostics: selectDiagnosticsForCurrentSystem(state),
  }
};

export default connect(mapStateToProps, undefined)(ThermostatActionIcon);
