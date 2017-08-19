import React, { Component } from 'react';
import { connect } from 'react-redux';
import InputRange from 'react-input-range';
import { Panel, Table } from 'react-bootstrap';

import { updateDeviceShadow } from '../actions/AppActions';
import LoadingIndicator from './LoadingIndicator';

import 'react-input-range/lib/css/index.css';
import './ZoneDetail.css';
import './Panel.css';

const MIN_TEMP = 50;
const MAX_TEMP = 100;

class ZoneDetail extends Component {
  state={}
  render() {
    const zoneId = this.props.match.params.zoneId;
    if (!(parseInt(zoneId, 10) >= 0 || parseInt(zoneId, 10) <= 20)) {
      return null;
    }

    if (this.props.zones && this.props.zones[zoneId]) {
      const zoneData = this.props.zones[zoneId];
      return (
        <Panel className='custom-panel' header={`Zone ${zoneId}`}>
          <div className='temp-display'>
            <p>Current Temp:</p>
            <p>{zoneData.currentTemp}°</p>
          </div>
          {this.renderTempSetpoints(zoneData)}
        </Panel>
      );
    } else {
      return <LoadingIndicator />;
    }
  }

  renderTempSetpoints = (zoneData) => {
    return (
      <div className='temp-control-container'>
        <div className='temp-control'>
          <h3>Occupied Temp Control</h3>
          <InputRange
            maxValue={MAX_TEMP}
            minValue={MIN_TEMP}
            formatLabel={value => `${value}`}
            value={{
              min: parseInt(zoneData.occupiedHeat, 10),
              max: parseInt(zoneData.occupiedCool, 10),
            }}
            onChange={(value) => this.onZoneUpdate(value, true)} />
        </div>
        <div className='temp-control'>
          <h3>Unoccupied Temp Control</h3>
          <InputRange
            maxValue={MAX_TEMP}
            minValue={MIN_TEMP}
            formatLabel={value => `${value}`}
            value={{
              min: parseInt(zoneData.unoccupiedHeat, 10),
              max: parseInt(zoneData.unoccupiedCool, 10),
            }}
            onChange={(value) => this.onZoneUpdate(value, false)} />
        </div>
      </div>
    );
  }

  renderInput = (zoneData, zoneAttribute) => {
    return <input type="text" 
                  value={zoneData[zoneAttribute]}
                  onChange={(event) => this.onZoneInputUpdate(event, zoneAttribute)}/>
  }

  onZoneUpdate = (tempSetPoints, occupied) => {
    if ((tempSetPoints.max - tempSetPoints.min) < 2) return;
    const maxTempZoneAttribute = occupied ? 'occupiedCool' : 'unoccupiedCool';
    const minTempZoneAttribute = occupied ? 'occupiedHeat' : 'unoccupiedHeat';

    this.props.onZoneUpdate(
      tempSetPoints.max.toString(), maxTempZoneAttribute, this.props.match.params.zoneId);
    this.props.onZoneUpdate(
      tempSetPoints.min.toString(), minTempZoneAttribute, this.props.match.params.zoneId);
  }
};

const mapStateToProps = (state) => {
  return {
    zones: state.shadow.zones,
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    onZoneUpdate: (value, zoneAttribute, zoneId) => 
      dispatch(updateDeviceShadow(value, zoneAttribute, zoneId)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ZoneDetail);