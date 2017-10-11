import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Table } from 'react-bootstrap';

import LoadingIndicator from './LoadingIndicator';
import { getZonesForCurrentSystem } from '../util/deviceShadowUtil';
import ThermostatActionIcon from './ThermostatActionIcon';
import ZoneDetail from './ZoneDetail';

import './Table.css';

const ZONE_LIST_HEADERS = {
    ZONE: 'Zone',
    TEMP: 'Temp',
    CURR_ACTION: 'Action',
    OCC_HEAT_COOL_SETPOINTS: 'Occupied Heat / Cool',
    UNOCC_HEAT_COOL_SETPOINTS: 'Unoccupied Heat / Cool',
    SA_STAT: 'SA Stat',
}

class ZoneList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showZoneDetail: false,
      zoneDetailNumber: undefined,
    };
  }

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
						zonesData[zoneNumber].occupiedStatus,
						zonesData[zoneNumber].vacationEnabled,
          ),
        [ZONE_LIST_HEADERS.UNOCC_HEAT_COOL_SETPOINTS]:
          this.formatUnoccupiedSetpoints(
            zonesData[zoneNumber].unoccupiedHeat,
            zonesData[zoneNumber].unoccupiedCool,
            zonesData[zoneNumber].occupiedStatus,
						zonesData[zoneNumber].vacationEnabled,
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

  formatOccupiedSetpoints(heatPoint, coolPoint, isOccupied, onVacation) {
    return (
      <div className={(isOccupied === '1' && onVacation === '0') ? 'bold' : ''}>
        {heatPoint} / {coolPoint}
      </div>
    );
  }

  formatUnoccupiedSetpoints(heatPoint, coolPoint, isOccupied, onVacation) {
    return (
      <div className={(isOccupied === '0' || onVacation === '1') ? 'bold' : ''}>
        {heatPoint} / {coolPoint}
      </div>
    );
  }

  openZoneDetail(zoneId) {
    this.setState({
      zoneDetailNumber: zoneId,
      showZoneDetail: true,
    });
  }

  closeZoneDetail = () => {
    this.setState({
      showZoneDetail: false,
    });
  }

  render() {
    const zones = getZonesForCurrentSystem(this.props.deviceShadow);

    if (!this.props.connected || !zones) {
      return <LoadingIndicator />
    } else {
      const zonesData = this.mapZonesDataToDisplayGrid(zones);
      return (
        <div>
          <Table className="custom-table">
            {this.renderTableHeader(Object.values(ZONE_LIST_HEADERS))}
            {this.renderTableBody(zonesData)}
          </Table>
          <ZoneDetail zoneData={zones[this.state.zoneDetailNumber]}
                      zoneId={this.state.zoneDetailNumber}
                      show={this.state.showZoneDetail}
                      onHide={this.closeZoneDetail}/>
        </div>
      );
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
              onClick={() => this.openZoneDetail(rowIndex + 1)}>
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
