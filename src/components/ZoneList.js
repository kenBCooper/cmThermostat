import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Panel, Table } from 'react-bootstrap';

import './Table.css';
import './Panel.css';
import LoadingIndicator from './LoadingIndicator';
import { getZonesForCurrentSystem } from '../util/deviceShadowUtil';
import ThermostatActionIcon from './ThermostatActionIcon';

const ZONE_LIST_HEADERS = {
    ZONE: 'Zone',
    TEMP: 'Temp',
    CURR_ACTION: 'Action',
    OCC_HEAT_COOL_SETPOINTS: 'Occupied Heat / Cool',
    UNOCC_HEAT_COOL_SETPOINTS: 'Unoccupied Heat / Cool',
    SA_STAT: 'SA Stat',
}

class ZoneList extends Component {
  mapZonesDataToDisplayGrid(zonesData) {
    let mappedZoneData = [];

    Object.keys(zonesData).forEach((zoneNumber) => {
      mappedZoneData.push({
        [ZONE_LIST_HEADERS.ZONE]: zoneNumber,
        [ZONE_LIST_HEADERS.TEMP]: zonesData[zoneNumber].currentTemp,
        [ZONE_LIST_HEADERS.CURR_ACTION]:
          this.formatActionDisplay(zonesData[zoneNumber]),
        [ZONE_LIST_HEADERS.OCC_HEAT_COOL_SETPOINTS]:
          this.formatOccupiedSetpoints(
            zonesData[zoneNumber].occupiedHeat,
            zonesData[zoneNumber].occupiedCool,
            zonesData[zoneNumber].occupiedStatus
          ),
        [ZONE_LIST_HEADERS.UNOCC_HEAT_COOL_SETPOINTS]:
          this.formatUnoccupiedSetpoints(
            zonesData[zoneNumber].unoccupiedHeat,
            zonesData[zoneNumber].unoccupiedCool,
            zonesData[zoneNumber].occupiedStatus
          ),
        [ZONE_LIST_HEADERS.SA_STAT]:
          zonesData[zoneNumber].standaloneThermostat === '2' ? 'Y' : 'N',
      });
    });

    return mappedZoneData;
  }

  formatActionDisplay(zoneData) {
    return <ThermostatActionIcon small zoneData={zoneData}/>;
  }

  formatOccupiedSetpoints(heatPoint, coolPoint, isOccupied) {
    return (
      <div className={isOccupied === '1' ? 'bold' : ''}>
        {heatPoint} / {coolPoint}
      </div>
    );
  }

  formatUnoccupiedSetpoints(heatPoint, coolPoint, isOccupied) {
    return (
      <div className={isOccupied === '0' ? 'bold' : ''}>
        {heatPoint} / {coolPoint}
      </div>
    );
  }

  openZoneDetail(index) {
    const currentRm = this.props.match.params.rmId;
    this.props.history.push(`${currentRm}/${index + 1}`)
  }

  render() {
    const zones = getZonesForCurrentSystem(this.props.deviceShadow);

    if (!this.props.connected || !zones) {
      return <LoadingIndicator />
    } else {
      if (zones) {
        const zonesData = this.mapZonesDataToDisplayGrid(zones);
        return (
          <Panel className="custom-panel">
            <Table fill className="custom-table">
              {this.renderTableHeader(Object.values(ZONE_LIST_HEADERS))}
              {this.renderTableBody(zonesData)}
            </Table>
          </Panel>
        );
      } else {
        return <div></div>
      }
    }
  }

  renderTableHeader(headerItems) {
    return (
      <thead className="custom-table-heading">
        <tr>
        {headerItems.map((headerItem, index) => {
          return (
            <th key={'zoneHeader' + index}
              className="custom-table-heading-cell">
              <span>{headerItem}</span>
            </th>
          );
        })}
        </tr>
      </thead>
    );
  }

  renderTableBody(tableData) {
    return (
      <tbody>
        {tableData.map((tableRowData, rowIndex) => {
          return (
            <tr key={'zoneRow' + rowIndex}
              className="custom-table-row table-hover-color"
              onClick={() => this.openZoneDetail(rowIndex)}>
              {Object.values(tableRowData).map((rowDataItem, cellIndex) => {
                return (
                  <td key={'zoneData' + rowIndex + cellIndex} className="custom-table-cell">
                    {rowDataItem}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    deviceShadow: state.shadow,
    connected: state.connected,
  }
}

export default connect(mapStateToProps, undefined)(ZoneList);
