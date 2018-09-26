import React, { Component } from 'react';
import { Modal } from 'react-bootstrap'; 
import { connect } from 'react-redux';
import InputRange from 'react-input-range';

import { formatTemp } from '../util/tempUtil';
import { updateZone } from '../actions/AppActions';
import ThermostatActionIcon from './ThermostatActionIcon';

import 'react-input-range/lib/css/index.css';
import './ZoneDetail.css';

const MIN_TEMP = 55;
const MAX_TEMP = 85;

class ZoneDetail extends Component {
  render() {
    const zoneData = this.props.zoneData
    if (zoneData && this.props.zoneId) {
      return (
        <Modal className="zone-detail-modal"
               bsSize='lg'
               show={this.props.show}
               onHide={this.props.onHide}>
          <Modal.Header className="zone-detail-header" closeButton>
            <Modal.Title>{`Zone ${this.props.zoneId}`}</Modal.Title>
            <div className='occupied-status-display'>
              <i>Current Status:
                <div className='occupied-highlight'>
									{zoneData.occupiedStatus === '1' ? ' Occupied' : ' Unoccupied'}
                </div>
              </i>
            </div>
          </Modal.Header>  
          {this.renderZoneDetail()}
        </Modal>
      );
    } else {
      return <div></div>
    }
  }

  renderZoneDetail() {
    const zoneData = this.props.zoneData

    return (
      <div className='zone-detail-body'>
        <div className='temp-display'>
          <p>
            {formatTemp(zoneData.currentTemp, this.props.isCelsius)}°
            <ThermostatActionIcon zoneData={zoneData} />
          </p>
        </div>
        {this.renderTempSetpoints(zoneData)}
      </div>
    );
  }

  renderTempSetpoints = (zoneData) => {
    return (
      <div className='temp-control-container'>
        <div className='temp-control'>
          <h3>Occupied Temp Control</h3>
          <InputRange
            maxValue={parseFloat(MAX_TEMP)}
            minValue={parseFloat(MIN_TEMP)}
            formatLabel={value => `${formatTemp(value, this.props.isCelsius)}`}
            value={{
              min: parseFloat(zoneData.occupiedHeat),
              max: parseFloat(zoneData.occupiedCool),
            }}
            onChange={(value) => this.onZoneUpdate(value, true)} />
        </div>
        <div className='temp-control'>
          <h3>Unoccupied Temp Control</h3>
          <InputRange
            maxValue={parseFloat(MAX_TEMP)}
            minValue={parseFloat(MIN_TEMP)}
            formatLabel={value => `${formatTemp(value, this.props.isCelsius)}`}
            value={{
              min: parseFloat(zoneData.unoccupiedHeat),
              max: parseFloat(zoneData.unoccupiedCool),
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
      tempSetPoints.max.toString(), maxTempZoneAttribute, this.props.zoneId);
    this.props.onZoneUpdate(
      tempSetPoints.min.toString(), minTempZoneAttribute, this.props.zoneId);
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    onZoneUpdate: (value, zoneAttribute, zoneId) => 
      dispatch(updateZone(value, zoneAttribute, zoneId)),
  }
}

export default connect(undefined, mapDispatchToProps)(ZoneDetail);
