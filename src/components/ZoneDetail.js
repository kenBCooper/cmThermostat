import React, { Component } from 'react';
import { connect } from 'react-redux';
import InputRange from 'react-input-range';

import { updateDeviceShadow } from '../actions/AppActions';
import LoadingIndicator from './LoadingIndicator';

import 'react-input-range/lib/css/index.css';

const MIN_TEMP = 50;
const MAX_TEMP = 100;

class ZoneDetail extends Component {
    state={}
    render() {
        const zoneId = this.props.match.params.zoneId;
        if (!(parseInt(zoneId) >= 0 || parseInt(zoneId) <= 20)) {
            return null;
        }

        if (this.props.zones && this.props.zones[zoneId]) {
            const zoneData = this.props.zones[zoneId];
            return (
              <div>
                <h3>Name: {zoneId}</h3>
                <h3>Temp: {zoneData.currentTemp}</h3>
                {this.renderTempSetpoints(zoneData)}
              </div>
            );
        } else {
            return <LoadingIndicator />;
        }
    }

    renderTempSetpoints = (zoneData) => {
        return (
            <div style={{width: '50%'}}>
                <h3>Occupied Temp Control</h3>
                <InputRange
                  maxValue={MAX_TEMP}
                  minValue={MIN_TEMP}
                  formatLabel={value => `${value}`}
                  value={{
                    min: parseInt(zoneData.occupiedHeat),
                    max: parseInt(zoneData.occupiedCool),
                  }}
                  onChange={(value) => this.onZoneUpdate(value, true)} />

                <h3>Unoccupied Temp Control</h3>
                <InputRange
                  maxValue={MAX_TEMP}
                  minValue={MIN_TEMP}
                  formatLabel={value => `${value}`}
                  value={{
                    min: parseInt(zoneData.unoccupiedHeat),
                    max: parseInt(zoneData.unoccupiedCool),
                  }}
                  onChange={(value) => this.onZoneUpdate(value, false)} />
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